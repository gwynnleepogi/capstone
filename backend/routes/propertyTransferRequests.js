const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { createClient } = require('@supabase/supabase-js')
const createAuditLog = require('../middleware/auditLog')

const REASONS = ['End of Contract', 'Transfer of Agency', 'Resignation', 'Change of Designation', 'Retirement', 'Others']

async function lookup(table, ids, columns) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (!unique.length) return {}
  const { data, error } = await supabase.from(table).select(columns).in('id', unique)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data || []).map(row => [String(row.id), row]))
}

async function generateReceiptNumbers(count) {
  const { data: existingReceipts, error } = await supabase
    .from('property_receipts')
    .select('receipt_number')

  if (error) throw new Error('Unable to generate new receipt numbers: ' + error.message)

  let highestNumber = -1
  for (const receipt of existingReceipts || []) {
    const match = String(receipt.receipt_number || '').match(/^(\d{5})-(\d{4})$/)
    if (match) {
      const numericValue = Number(match[1]) * 10000 + Number(match[2])
      if (numericValue > highestNumber) highestNumber = numericValue
    }
  }

  return Array.from({ length: count }, (_, index) => {
    const nextNumber = highestNumber + index + 1
    if (nextNumber > 999999999) throw new Error('Receipt number limit has been reached')
    return String(Math.floor(nextNumber / 10000)).padStart(5, '0') + '-' +
      String(nextNumber % 10000).padStart(4, '0')
  })
}

async function details(rows) {
  const requests = rows || []
  const receiptIds = requests.flatMap(row => row.property_receipt_ids || [])
  const receipts = await lookup('property_receipts', receiptIds, 'id, item_id, receipt_number, quantity, issued_to, date_issued, status')
  const items = await lookup('items', Object.values(receipts).map(row => row.item_id), 'id, description, property_number, cost, condition, status, responsibility_center, accountable_employee, acquisition_date')
  const users = await lookup('users', requests.flatMap(row => [row.requested_by, row.reviewed_by, row.to_user_id]), 'id, full_name, job_title, role, office_id')
  const offices = await lookup('offices', Object.values(users).map(row => row.office_id), 'id, office_name')
  return requests.map(row => ({
    ...row,
    requester: users[String(row.requested_by)] || null,
    reviewer: users[String(row.reviewed_by)] || null,
    recipient: users[String(row.to_user_id)] || null,
    recipient_office: offices[String(users[String(row.to_user_id)]?.office_id)] || null,
    properties: (row.property_receipt_ids || []).map(id => {
      const receipt = receipts[String(id)]
      return receipt ? { ...receipt, items: items[String(receipt.item_id)] || null } : { id, missing: true }
    })
  }))
}

router.get('/mine', async (req, res) => {
  try {
    // Forward the signed-in employee's token so Supabase RLS can identify auth.uid().
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      global: { headers: { Authorization: req.headers.authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data, error } = await userSupabase.from('property_transfer_requests').select('*')
      .eq('requested_by', req.profile.id).order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(await details(data || []))
  } catch (error) { res.status(500).json({ error: error.message }) }
})

router.get('/', async (req, res) => {
  if (req.role !== 'Administrator') return res.status(403).json({ error: 'Only administrators can review transfer requests.' })
  try {
    // Forward the administrator's token so the RLS policy can identify the admin
    // and allow access to all employee-submitted transfer requests.
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      global: { headers: { Authorization: req.headers.authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data, error } = await userSupabase.from('property_transfer_requests').select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(await details(data || []))
  } catch (error) { res.status(500).json({ error: error.message }) }
})

router.post('/', async (req, res) => {
  if (!['Teacher', 'Non-Teaching Staff'].includes(req.role)) return res.status(403).json({ error: 'Only employees can submit transfer requests.' })
  try {
    const ids = [...new Set((Array.isArray(req.body.property_receipt_ids) ? req.body.property_receipt_ids : []).map(String).filter(Boolean))]
    const reason = String(req.body.reason || '').trim()
    const finalReason = reason === 'Others' ? String(req.body.other_reason || '').trim() : reason
    if (!ids.length) return res.status(400).json({ error: 'Select at least one property.' })
    if (!REASONS.includes(reason) || (reason === 'Others' && !finalReason)) return res.status(400).json({ error: 'Select or enter a valid transfer reason.' })

    const { data: receipts, error: receiptError } = await supabase.from('property_receipts')
      .select('id, item_id, issued_to, status').in('id', ids)
    if (receiptError) return res.status(500).json({ error: receiptError.message })
    if (!receipts || receipts.length !== ids.length) return res.status(404).json({ error: 'One or more selected properties could not be found.' })

    const itemMap = await lookup('items', receipts.map(row => row.item_id), 'id, description, property_number, condition, status')
    for (const receipt of receipts) {
      if (String(receipt.issued_to) !== String(req.profile.id) || receipt.status !== 'Issued') {
        return res.status(409).json({ error: 'A selected property is no longer issued to your account.' })
      }
      const item = itemMap[String(receipt.item_id)]
      if (!item) return res.status(404).json({ error: 'A selected inventory item could not be found.' })
      if (item.condition !== 'Serviceable') return res.status(400).json({ error: 'Only serviceable properties can be requested for transfer.' })
    }

    // Block duplicate requests while another transfer is pending or being processed.
    // Approved historical transfers are intentionally not checked: the new holder may transfer again.
    const { data: existing, error: existingError } = await supabase.from('property_transfer_requests')
      .select('property_receipt_ids').in('status', ['Pending', 'Processing'])
    if (existingError) return res.status(500).json({ error: existingError.message })
    const pendingIds = new Set((existing || []).flatMap(row => row.property_receipt_ids || []).map(String))
    if (ids.some(id => pendingIds.has(id))) return res.status(409).json({ error: 'One or more selected properties already have a pending transfer request.' })

    // Use the logged-in employee's access token so Supabase RLS can resolve auth.uid().
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      global: { headers: { Authorization: req.headers.authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: created, error } = await userSupabase.from('property_transfer_requests').insert([{
      requested_by: req.profile.id,
      from_responsibility_center: String(req.body.from_responsibility_center || '').trim() || null,
      property_receipt_ids: ids,
      reason: finalReason,
      remarks: String(req.body.remarks || '').trim() || null,
      status: 'Pending'
    }]).select().single()
    if (error) return res.status(500).json({ error: error.message })

    await createAuditLog('Requested', null, null, JSON.stringify({
      request_id: created.id, property_receipt_ids: ids, reason: finalReason, status: 'Pending'
    }), 'Submitted property transfer request', req.profile.id)

    const [result] = await details([created])
    res.status(201).json(result)
  } catch (error) { res.status(500).json({ error: error.message }) }
})

router.patch('/:id/reject', async (req, res) => {
  if (req.role !== 'Administrator') return res.status(403).json({ error: 'Only administrators can review transfer requests.' })
  const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  try {
    const reason = String(req.body.review_remarks || '').trim()
    if (!reason) return res.status(400).json({ error: 'A reason is required when disapproving a request.' })
    const { data, error } = await userSupabase.from('property_transfer_requests').update({
      status: 'Disapproved', reviewed_by: req.profile.id, reviewed_at: new Date().toISOString(), review_remarks: reason
    }).eq('id', req.params.id).eq('status', 'Pending').select().maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(409).json({ error: 'This request is no longer pending.' })
    await createAuditLog('Disapproved', null, null, JSON.stringify({ request_id: data.id, review_remarks: reason }), 'Disapproved property transfer request', req.profile.id)
    const [result] = await details([data])
    res.json(result)
  } catch (error) { res.status(500).json({ error: error.message }) }
})

router.patch('/:id/approve', async (req, res) => {
  if (req.role !== 'Administrator') return res.status(403).json({ error: 'Only administrators can approve transfer requests.' })

  const requestId = req.params.id
  const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  let groupId = null
  let newReceipts = []
  let oldReceiptIds = []
  let changedItems = []

  const resetRequest = async () => {
    await userSupabase.from('property_transfer_requests').update({
      status: 'Pending',
      reviewed_by: null,
      reviewed_at: null,
      to_user_id: null,
      transfer_date: null
    }).eq('id', requestId).eq('status', 'Processing')
  }

  const rollbackTransfer = async () => {
    if (groupId) {
      await supabase.from('item_transfers').delete().eq('transfer_group_id', groupId)
    }
    if (oldReceiptIds.length) {
      await supabase.from('property_receipts').update({ status: 'Issued' }).in('id', oldReceiptIds)
    }
    if (newReceipts.length) {
      await supabase.from('property_receipts').delete().in('id', newReceipts.map(row => row.id))
    }
    for (const item of changedItems) {
      await supabase.from('items').update({
        accountable_employee: item.accountable_employee,
        status: item.status,
        office_name: item.office_name,
        responsibility_center: item.responsibility_center
      }).eq('id', item.id)
    }
    await resetRequest()
  }

  try {
    const recipientId = req.body.to_user_id
    if (!recipientId) return res.status(400).json({ error: 'Select the receiving employee.' })

    const { data: request, error: requestError } = await userSupabase.from('property_transfer_requests')
      .select('*').eq('id', requestId).eq('status', 'Pending').maybeSingle()
    if (requestError) return res.status(500).json({ error: requestError.message })
    if (!request) return res.status(404).json({ error: 'Pending transfer request not found.' })

    const { data: claimed, error: claimError } = await userSupabase.from('property_transfer_requests').update({
      status: 'Processing',
      reviewed_by: req.profile.id,
      reviewed_at: new Date().toISOString(),
      to_user_id: recipientId,
      transfer_date: req.body.transfer_date || new Date().toISOString().slice(0, 10)
    }).eq('id', requestId).eq('status', 'Pending').select().maybeSingle()
    if (claimError) return res.status(500).json({ error: claimError.message })
    if (!claimed) return res.status(409).json({ error: 'This request has already been reviewed.' })

    const { data: recipient, error: recipientError } = await supabase.from('users')
      .select('id, full_name, office_id').eq('id', recipientId).single()
    if (recipientError || !recipient) {
      await resetRequest()
      return res.status(400).json({ error: 'The receiving employee could not be found.' })
    }
    if (String(recipient.id) === String(request.requested_by)) {
      await resetRequest()
      return res.status(400).json({ error: 'The receiving employee must be different from the requesting employee.' })
    }

    const { data: office, error: officeError } = recipient.office_id
      ? await supabase.from('offices').select('id, office_name').eq('id', recipient.office_id).maybeSingle()
      : { data: null, error: null }
    if (officeError || !office) {
      await resetRequest()
      return res.status(400).json({ error: officeError?.message || 'The selected receiving employee does not have an assigned office. Update the employee profile before approving this transfer.' })
    }

    const receiptIds = request.property_receipt_ids || []
    const { data: receipts, error: receiptsError } = await supabase.from('property_receipts')
      .select('id, item_id, receipt_type, receipt_number, issued_to, status, quantity, remarks')
      .in('id', receiptIds)
    if (receiptsError || !receipts || receipts.length !== receiptIds.length) {
      await resetRequest()
      return res.status(400).json({ error: receiptsError?.message || 'One or more requested properties could not be found.' })
    }

    const itemMap = await lookup(
      'items',
      receipts.map(row => row.item_id),
      'id, description, property_number, condition, status, accountable_employee, responsibility_center, office_name, cost, acquisition_date'
    )
    const requesterMap = await lookup('users', [request.requested_by], 'id, full_name')
    const previousEmployee = requesterMap[String(request.requested_by)]?.full_name || 'Previous employee'

    for (const receipt of receipts) {
      const item = itemMap[String(receipt.item_id)]
      if (String(receipt.issued_to) !== String(request.requested_by) || receipt.status !== 'Issued') {
        await resetRequest()
        return res.status(400).json({ error: 'A requested property is no longer issued to the requesting employee.' })
      }
      if (!item || item.condition !== 'Serviceable') {
        await resetRequest()
        return res.status(400).json({ error: 'A requested property is missing or is no longer serviceable.' })
      }
    }

    const transferDate = claimed.transfer_date
    const receiptNumbers = await generateReceiptNumbers(receipts.length)
    const newReceiptInserts = receipts.map((receipt, index) => {
      const item = itemMap[String(receipt.item_id)]
      const receiptType = receipt.receipt_type || (Number(item.cost || 0) >= 50000 ? 'PAR' : 'ICS')
      return {
        item_id: receipt.item_id,
        transaction_type: 'Transfer',
        receipt_type: receiptType,
        receipt_number: receiptNumbers[index],
        issued_to: recipient.id,
        quantity: Number(receipt.quantity || 1),
        date_issued: transferDate,
        remarks: 'Reissued after property transfer from ' + previousEmployee +
          '. Reason: ' + request.reason + (request.remarks ? '. ' + request.remarks : ''),
        status: 'Issued'
      }
    })

    const { data: createdReceipts, error: createReceiptError } = await supabase
      .from('property_receipts').insert(newReceiptInserts).select()
    if (createReceiptError || !createdReceipts || createdReceipts.length !== receipts.length) {
      await resetRequest()
      return res.status(500).json({ error: createReceiptError?.message || 'Could not create the new receipts for the receiving employee.' })
    }
    newReceipts = createdReceipts

    const { data: closedReceipts, error: closeReceiptError } = await supabase
      .from('property_receipts').update({ status: 'Transferred' })
      .in('id', receiptIds).eq('status', 'Issued').select('id')
    oldReceiptIds = (closedReceipts || []).map(row => row.id)
    if (closeReceiptError || !closedReceipts || closedReceipts.length !== receipts.length) {
      await rollbackTransfer()
      return res.status(500).json({ error: closeReceiptError?.message || 'Could not close the previous employee receipts. No transfer was completed.' })
    }

    groupId = require('crypto').randomUUID()
    const inserts = receipts.map((receipt, index) => ({
      item_id: receipt.item_id,
      property_receipt_id: newReceipts[index].id,
      transfer_group_id: groupId,
      transfer_type: 'To Employee',
      from_user_id: request.requested_by,
      to_user_id: recipient.id,
      office_id: recipient.office_id,
      transfer_date: transferDate,
      condition_after_transfer: itemMap[String(receipt.item_id)].condition,
      resulting_status: 'Issued',
      reason: request.reason,
      remarks: request.remarks,
      transferred_by: req.profile.id
    }))

    const { data: transferRows, error: insertError } = await supabase.from('item_transfers').insert(inserts).select()
    if (insertError) {
      await rollbackTransfer()
      return res.status(500).json({ error: insertError.message })
    }

    try {
      for (const receipt of receipts) {
        const item = itemMap[String(receipt.item_id)]
        const itemUpdate = await supabase.from('items').update({
          accountable_employee: recipient.full_name,
          status: 'Issued',
          office_name: office.office_name,
          responsibility_center: office.office_name
        }).eq('id', item.id)
        if (itemUpdate.error) throw new Error(itemUpdate.error.message)
        changedItems.push(item)
      }
    } catch (updateError) {
      await rollbackTransfer()
      return res.status(500).json({ error: 'Transfer failed. No transfer was completed: ' + updateError.message })
    }

    const { data: finished, error: finishError } = await userSupabase.from('property_transfer_requests').update({
      status: 'Approved',
      processed_transfer_group_id: groupId
    }).eq('id', requestId).eq('status', 'Processing').select().single()

    if (finishError || !finished) {
      await rollbackTransfer()
      return res.status(500).json({ error: 'The transfer could not be finalized: ' + (finishError?.message || 'Request status was not updated.') })
    }

    try {
      await createAuditLog('Transferred', null, null, JSON.stringify({
        request_id: requestId,
        transfer_group_id: groupId,
        from_user_id: request.requested_by,
        to_user_id: recipient.id,
        previous_receipt_ids: receiptIds,
        new_receipt_ids: newReceipts.map(row => row.id),
        new_receipt_numbers: newReceipts.map(row => row.receipt_number)
      }), 'Approved property transfer and created new receipts for ' + recipient.full_name, req.profile.id)
    } catch (auditError) {
      console.log('Property transfer audit log error:', auditError)
    }

    const [result] = await details([finished])
    res.json({ ...result, transfers: transferRows, new_receipts: newReceipts })
  } catch (error) {
    await rollbackTransfer()
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
