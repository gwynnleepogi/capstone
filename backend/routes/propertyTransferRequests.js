const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

const REASONS = ['End of Contract', 'Transfer of Agency', 'Resignation', 'Change of Designation', 'Retirement', 'Others']

async function lookup(table, ids, columns) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (!unique.length) return {}
  const { data, error } = await supabase.from(table).select(columns).in('id', unique)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data || []).map(row => [String(row.id), row]))
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
    const { data, error } = await supabase.from('property_transfer_requests').select('*')
      .eq('requested_by', req.profile.id).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(await details(data || []))
  } catch (error) { res.status(500).json({ error: error.message }) }
})

router.get('/', async (req, res) => {
  if (req.role !== 'Administrator') return res.status(403).json({ error: 'Only administrators can review transfer requests.' })
  try {
    const { data, error } = await supabase.from('property_transfer_requests').select('*').order('created_at', { ascending: false })
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

    const { data: existing, error: existingError } = await supabase.from('property_transfer_requests')
      .select('property_receipt_ids').eq('status', 'Pending')
    if (existingError) return res.status(500).json({ error: existingError.message })
    const pendingIds = new Set((existing || []).flatMap(row => row.property_receipt_ids || []).map(String))
    if (ids.some(id => pendingIds.has(id))) return res.status(409).json({ error: 'One or more selected properties already have a pending transfer request.' })

    const { data: created, error } = await supabase.from('property_transfer_requests').insert([{
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
  try {
    const reason = String(req.body.review_remarks || '').trim()
    if (!reason) return res.status(400).json({ error: 'A reason is required when disapproving a request.' })
    const { data, error } = await supabase.from('property_transfer_requests').update({
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
  try {
    const recipientId = req.body.to_user_id
    if (!recipientId) return res.status(400).json({ error: 'Select the receiving employee.' })

    const { data: request, error: requestError } = await supabase.from('property_transfer_requests')
      .select('*').eq('id', requestId).eq('status', 'Pending').maybeSingle()
    if (requestError) return res.status(500).json({ error: requestError.message })
    if (!request) return res.status(404).json({ error: 'Pending transfer request not found.' })

    const { data: claimed, error: claimError } = await supabase.from('property_transfer_requests').update({
      status: 'Processing', reviewed_by: req.profile.id, reviewed_at: new Date().toISOString(),
      to_user_id: recipientId, transfer_date: req.body.transfer_date || new Date().toISOString().slice(0, 10)
    }).eq('id', requestId).eq('status', 'Pending').select().maybeSingle()
    if (claimError) return res.status(500).json({ error: claimError.message })
    if (!claimed) return res.status(409).json({ error: 'This request has already been reviewed.' })

    const revert = async message => {
      await supabase.from('property_transfer_requests').update({
        status: 'Pending', reviewed_by: null, reviewed_at: null, to_user_id: null, transfer_date: null
      }).eq('id', requestId)
      return res.status(400).json({ error: message })
    }

    const { data: recipient, error: recipientError } = await supabase.from('users')
      .select('id, full_name, office_id').eq('id', recipientId).single()
    if (recipientError || !recipient) return revert('The receiving employee could not be found.')
    if (String(recipient.id) === String(request.requested_by)) return revert('The receiving employee must be different from the requesting employee.')

    const { data: office, error: officeError } = recipient.office_id
      ? await supabase.from('offices').select('id, office_name').eq('id', recipient.office_id).maybeSingle()
      : { data: null, error: null }
    if (officeError) return revert(officeError.message)

    const receiptIds = request.property_receipt_ids || []
    const { data: receipts, error: receiptsError } = await supabase.from('property_receipts')
      .select('id, item_id, issued_to, status, quantity').in('id', receiptIds)
    if (receiptsError || !receipts || receipts.length !== receiptIds.length) return revert('One or more requested properties could not be found.')
    const itemMap = await lookup('items', receipts.map(row => row.item_id), 'id, description, property_number, condition, status, accountable_employee, responsibility_center, cost, acquisition_date')
    for (const receipt of receipts) {
      const item = itemMap[String(receipt.item_id)]
      if (String(receipt.issued_to) !== String(request.requested_by) || receipt.status !== 'Issued') return revert('A requested property is no longer issued to the requesting employee.')
      if (!item || item.condition !== 'Serviceable') return revert('A requested property is missing or is no longer serviceable.')
    }

    const groupId = require('crypto').randomUUID()
    const transferDate = claimed.transfer_date
    const inserts = receipts.map(receipt => ({
      item_id: receipt.item_id, property_receipt_id: receipt.id, transfer_group_id: groupId,
      transfer_type: 'To Employee', from_user_id: request.requested_by, to_user_id: recipient.id,
      office_id: recipient.office_id || null, transfer_date: transferDate,
      condition_after_transfer: itemMap[String(receipt.item_id)].condition, resulting_status: 'Issued',
      reason: request.reason, remarks: request.remarks, transferred_by: req.profile.id
    }))
    const { data: transferRows, error: insertError } = await supabase.from('item_transfers').insert(inserts).select()
    if (insertError) return revert(insertError.message)

    const changedReceipts = []
    const changedItems = []
    try {
      for (const receipt of receipts) {
        const item = itemMap[String(receipt.item_id)]
        const receiptUpdate = await supabase.from('property_receipts').update({ issued_to: recipient.id }).eq('id', receipt.id).eq('issued_to', request.requested_by)
        if (receiptUpdate.error) throw new Error(receiptUpdate.error.message)
        changedReceipts.push(receipt)
        const itemUpdate = await supabase.from('items').update({
          accountable_employee: recipient.full_name, status: 'Issued',
          office_name: office?.office_name || item.office_name,
          responsibility_center: office?.office_name || item.responsibility_center
        }).eq('id', item.id)
        if (itemUpdate.error) throw new Error(itemUpdate.error.message)
        changedItems.push(item)
      }
    } catch (updateError) {
      for (const receipt of changedReceipts) await supabase.from('property_receipts').update({ issued_to: request.requested_by }).eq('id', receipt.id)
      for (const item of changedItems) await supabase.from('items').update({ accountable_employee: item.accountable_employee, status: item.status, office_name: item.office_name, responsibility_center: item.responsibility_center }).eq('id', item.id)
      await supabase.from('item_transfers').delete().eq('transfer_group_id', groupId)
      await supabase.from('property_transfer_requests').update({ status: 'Pending', reviewed_by: null, reviewed_at: null, to_user_id: null, transfer_date: null }).eq('id', requestId)
      return res.status(500).json({ error: 'Transfer failed. No transfer was completed: ' + updateError.message })
    }

    const { data: finished, error: finishError } = await supabase.from('property_transfer_requests').update({
      status: 'Approved', processed_transfer_group_id: groupId
    }).eq('id', requestId).eq('status', 'Processing').select().single()
    if (finishError) return res.status(500).json({ error: 'Properties were transferred, but the request status needs attention: ' + finishError.message })

    await createAuditLog('Transferred', null, null, JSON.stringify({
      request_id: requestId, transfer_group_id: groupId, from_user_id: request.requested_by,
      to_user_id: recipient.id, property_receipt_ids: receiptIds
    }), 'Approved and processed property transfer request to ' + recipient.full_name, req.profile.id)

    const [result] = await details([finished])
    res.json({ ...result, transfers: transferRows })
  } catch (error) {
    await supabase.from('property_transfer_requests').update({
      status: 'Pending', reviewed_by: null, reviewed_at: null, to_user_id: null, transfer_date: null
    }).eq('id', requestId).eq('status', 'Processing')
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
