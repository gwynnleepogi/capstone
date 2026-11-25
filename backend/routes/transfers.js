const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
 
const CONDITIONS = ['Serviceable', 'Unserviceable']
 
// Serviceable property goes back to Available; unserviceable stays Returned
// (shown as "Returned and Unserviceable" in the Properties tab).
function getStatusForCondition(condition) {
  return condition === 'Serviceable' ? 'Available' : 'Returned'
}
 
async function lookup(table, ids, columns) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
 
  const { data, error } = await supabase.from(table).select(columns).in('id', unique)
  if (error) throw new Error(error.message)
 
  return Object.fromEntries((data || []).map(row => [row.id, row]))
}
 
// Issued receipts that can still be transferred (not already returned to stock)
router.get('/eligible-receipts', async (req, res) => {
  try {
    const { data: receipts, error } = await supabase
      .from('property_receipts')
      .select('id, item_id, receipt_number, quantity, issued_to, date_issued, status')
      .eq('status', 'Issued')
      .order('created_at', { ascending: false })
 
    if (error) return res.status(500).json({ error: error.message })
 
    const { data: returns, error: returnsError } = await supabase
      .from('item_returns')
      .select('property_receipt_id, item_id')
 
    if (returnsError) return res.status(500).json({ error: returnsError.message })
 
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('return_requests')
      .select('property_receipt_id')
      .eq('status', 'Pending')

    if (pendingError) return res.status(500).json({ error: pendingError.message })

    const pendingReceiptIds = new Set((pendingRequests || []).map(r => r.property_receipt_id))
    const returnedReceiptIds = new Set((returns || []).map(r => r.property_receipt_id).filter(Boolean))
    const itemsWithLegacyReturns = new Set(
      (returns || []).filter(r => !r.property_receipt_id).map(r => r.item_id)
    )
 
    const open = (receipts || []).filter(r =>
      !returnedReceiptIds.has(r.id) &&
      !pendingReceiptIds.has(r.id) &&
      !itemsWithLegacyReturns.has(r.item_id)
    )
 
    const items = await lookup(
      'items',
      open.map(r => r.item_id),
      'id, description, property_number, cost, condition, status, accountable_employee, responsibility_center'
    )
    const users = await lookup('users', open.map(r => r.issued_to), 'id, full_name')
 
    res.json(open.map(r => ({
      ...r,
      items: items[r.item_id] || null,
      users: users[r.issued_to] || null
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
 
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('item_transfers').select('*').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    const rows = data || []
    const items = await lookup('items', rows.map(r => r.item_id), 'id, description, property_number, cost, acquisition_date, condition, status, accountable_employee, responsibility_center')
    const receipts = await lookup('property_receipts', rows.map(r => r.property_receipt_id), 'id, receipt_number, quantity, date_issued')
    const users = await lookup('users', rows.flatMap(r => [r.from_user_id, r.to_user_id, r.transferred_by]), 'id, full_name, job_title')
    const offices = await lookup('offices', rows.map(r => r.office_id), 'id, office_name')
    const enriched = rows.map(r => ({
      ...r,
      items: items[r.item_id] || null,
      property_receipts: receipts[r.property_receipt_id] || null,
      from_user: users[r.from_user_id] || null,
      to_user: users[r.to_user_id] || null,
      transferred_by_user: users[r.transferred_by] || null,
      offices: offices[r.office_id] || null
    }))
    const groups = new Map()
    enriched.forEach(row => {
      const key = row.transfer_group_id || row.id
      if (!groups.has(key)) groups.set(key, { ...row, properties: [], receipts: [], transfer_ids: [] })
      const group = groups.get(key)
      group.properties.push({ transfer_id: row.id, items: row.items, property_receipts: row.property_receipts, condition_after_transfer: row.condition_after_transfer })
      group.receipts.push({ ...(row.property_receipts || {}), items: row.items, quantity: row.property_receipts?.quantity || 1, date_issued: row.property_receipts?.date_issued || row.transfer_date })
      group.transfer_ids.push(row.id)
    })
    res.json([...groups.values()].map(group => ({ ...group, items: group.properties[0]?.items || group.items, property_receipts: group.properties[0]?.property_receipts || group.property_receipts })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const {
      property_receipt_ids, property_receipt_id, transfer_type, to_user_id,
      office_id, transfer_date, reason, remarks
    } = req.body
    const receiptIds = [...new Set((Array.isArray(property_receipt_ids) ? property_receipt_ids : [property_receipt_id]).filter(Boolean))]
    if (!receiptIds.length) return res.status(400).json({ error: 'Please select at least one issued receipt' })
    if (transfer_type !== 'To Employee') return res.status(400).json({ error: 'Transfer type must be To Employee' })
    if (!to_user_id) return res.status(400).json({ error: 'Please select the employee receiving the property' })

    const { data: recipient, error: recipientError } = await supabase
      .from('users').select('id, full_name, office_id').eq('id', to_user_id).single()
    if (recipientError || !recipient) return res.status(404).json({ error: 'Receiving employee not found' })
    if (String(recipient.id) === String(req.profile?.id)) {
      return res.status(400).json({ error: 'The receiving employee must be different from the current accountable employee.' })
    }

    const { data: office, error: officeError } = recipient.office_id
      ? await supabase.from('offices').select('id, office_name').eq('id', recipient.office_id).maybeSingle()
      : { data: null, error: null }
    if (officeError) return res.status(500).json({ error: officeError.message })
    if (!office) return res.status(400).json({ error: 'The receiving employee must have an assigned office.' })

    const { data: receipts, error: receiptsError } = await supabase.from('property_receipts')
      .select('id, item_id, quantity, status, issued_to, receipt_type, receipt_number, remarks')
      .in('id', receiptIds)
    if (receiptsError) return res.status(500).json({ error: receiptsError.message })
    if (!receipts || receipts.length !== receiptIds.length) return res.status(404).json({ error: 'One or more issued receipts were not found' })

    const itemsById = await lookup('items', receipts.map(r => r.item_id),
      'id, description, property_number, quantity, cost, status, condition, accountable_employee, office_name, responsibility_center')
    const returnRows = await supabase.from('item_returns').select('property_receipt_id').in('property_receipt_id', receiptIds)
    if (returnRows.error) return res.status(500).json({ error: returnRows.error.message })
    const pendingRows = await supabase.from('return_requests').select('property_receipt_id')
      .in('property_receipt_id', receiptIds).eq('status', 'Pending')
    if (pendingRows.error) return res.status(500).json({ error: pendingRows.error.message })
    const returnedIds = new Set((returnRows.data || []).map(r => r.property_receipt_id))
    const pendingIds = new Set((pendingRows.data || []).map(r => r.property_receipt_id))

    const previousUserIds = receipts.map(r => r.issued_to)
    const previousUsers = await lookup('users', previousUserIds, 'id, full_name')
    for (const receipt of receipts) {
      const item = itemsById[receipt.item_id]
      if (receipt.status !== 'Issued') return res.status(409).json({ error: 'Only currently issued receipts can be transferred' })
      if (String(receipt.issued_to) === String(to_user_id)) return res.status(400).json({ error: 'A selected property is already issued to this employee' })
      if (!item) return res.status(404).json({ error: 'A linked inventory item was not found' })
      if (item.condition !== 'Serviceable') return res.status(400).json({ error: 'Unserviceable property cannot be transferred to another employee.' })
      if (returnedIds.has(receipt.id)) return res.status(409).json({ error: 'A selected property has already been returned' })
      if (pendingIds.has(receipt.id)) return res.status(409).json({ error: 'A selected property has a pending return request. Accept or reject it first.' })
      if (!receipt.issued_to || !previousUsers[receipt.issued_to]) return res.status(409).json({ error: 'The previous accountable employee could not be identified.' })
    }

    const { data: allReceipts, error: allReceiptsError } = await supabase
      .from('property_receipts').select('receipt_number')
    if (allReceiptsError) return res.status(500).json({ error: allReceiptsError.message })
    let highestNumber = -1
    for (const row of allReceipts || []) {
      const match = String(row.receipt_number || '').match(/^(\d{5})-(\d{4})$/)
      if (match) {
        const number = Number(match[1]) * 10000 + Number(match[2])
        if (number > highestNumber) highestNumber = number
      }
    }
    const receiptNumbers = receipts.map((row, index) => {
      const next = highestNumber + index + 1
      return String(Math.floor(next / 10000)).padStart(5, '0') + '-' + String(next % 10000).padStart(4, '0')
    })

    const transferGroupId = require('crypto').randomUUID()
    const transferDate = transfer_date || new Date().toISOString().split('T')[0]
    const newReceiptInserts = receipts.map((receipt, index) => {
      const item = itemsById[receipt.item_id]
      return {
        item_id: receipt.item_id,
        transaction_type: 'Transfer',
        receipt_type: receipt.receipt_type || (Number(item.cost || 0) >= 50000 ? 'PAR' : 'ICS'),
        receipt_number: receiptNumbers[index],
        issued_to: recipient.id,
        quantity: Number(receipt.quantity || 1),
        date_issued: transferDate,
        remarks: 'New assignment after transfer from ' + previousUsers[receipt.issued_to].full_name +
          '. Reason: ' + (reason || 'Not specified') + (remarks ? '. ' + remarks : ''),
        status: 'Issued'
      }
    })

    const { data: newReceipts, error: newReceiptError } = await supabase
      .from('property_receipts').insert(newReceiptInserts).select()
    if (newReceiptError || !newReceipts || newReceipts.length !== receipts.length) {
      return res.status(500).json({ error: newReceiptError?.message || 'Could not create the new receipts for the receiving employee.' })
    }

    const closed = await supabase.from('property_receipts').update({ status: 'Transferred' })
      .in('id', receiptIds).eq('status', 'Issued').select('id')
    if (closed.error || !closed.data || closed.data.length !== receipts.length) {
      await supabase.from('property_receipts').delete().in('id', newReceipts.map(row => row.id))
      return res.status(409).json({ error: closed.error?.message || 'The previous receipts could not be closed. No transfer was completed.' })
    }

    const inserts = receipts.map((receipt, index) => ({
      item_id: receipt.item_id,
      property_receipt_id: newReceipts[index].id,
      transfer_group_id: transferGroupId,
      transfer_type,
      from_user_id: receipt.issued_to,
      to_user_id: recipient.id,
      office_id: office.id,
      transfer_date: transferDate,
      condition_after_transfer: itemsById[receipt.item_id].condition,
      resulting_status: 'Issued',
      reason: reason || null,
      remarks: remarks || null,
      transferred_by: req.profile?.id || null
    }))
    const { data: transfers, error: insertError } = await supabase.from('item_transfers').insert(inserts).select()
    if (insertError) {
      await supabase.from('property_receipts').update({ status: 'Issued' }).in('id', receiptIds)
      await supabase.from('property_receipts').delete().in('id', newReceipts.map(row => row.id))
      return res.status(500).json({ error: insertError.message })
    }

    const updatedItems = []
    try {
      for (const receipt of receipts) {
        const item = itemsById[receipt.item_id]
        const itemUpdate = await supabase.from('items').update({
          accountable_employee: recipient.full_name,
          office_name: office.office_name,
          responsibility_center: office.office_name,
          status: 'Issued'
        }).eq('id', item.id)
        if (itemUpdate.error) throw new Error(itemUpdate.error.message)
        updatedItems.push(item)
      }
    } catch (updateError) {
      await supabase.from('item_transfers').delete().eq('transfer_group_id', transferGroupId)
      await supabase.from('property_receipts').update({ status: 'Issued' }).in('id', receiptIds)
      await supabase.from('property_receipts').delete().in('id', newReceipts.map(row => row.id))
      for (const item of updatedItems) {
        await supabase.from('items').update({
          accountable_employee: item.accountable_employee,
          office_name: item.office_name,
          responsibility_center: item.responsibility_center,
          status: item.status
        }).eq('id', item.id)
      }
      return res.status(500).json({ error: 'Transfer failed and the previous property details were restored: ' + updateError.message })
    }

    for (const receipt of receipts) {
      const item = itemsById[receipt.item_id]
      const previousHolder = previousUsers[receipt.issued_to].full_name
      try {
        await createAuditLog('Transferred', item.id,
          JSON.stringify({ accountable_employee: previousHolder, status: item.status, receipt_number: receipt.receipt_number }),
          JSON.stringify({
            description: item.description,
            property_number: item.property_number,
            transfer_type,
            from_employee: previousHolder,
            to_employee: recipient.full_name,
            previous_receipt_number: receipt.receipt_number,
            new_receipt_number: newReceipts[receipts.indexOf(receipt)].receipt_number,
            transfer_date: transferDate,
            transfer_group_id: transferGroupId
          }),
          'Transferred ' + item.description + ' from ' + previousHolder + ' to ' + recipient.full_name,
          req.profile?.id)
      } catch (auditError) { console.log('Transfer audit log error:', auditError) }
    }

    return res.status(201).json({
      transfer_group_id: transferGroupId,
      transfers,
      new_receipts: newReceipts,
      message: receipts.length + ' properties transferred successfully. Previous receipts were preserved as history.'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { data: selected, error } = await supabase
      .from('item_transfers').select('*').eq('id', req.params.id).single()
    if (error || !selected) return res.status(404).json({ error: 'Transfer record not found.' })

    let groupQuery = supabase.from('item_transfers').select('*')
    groupQuery = selected.transfer_group_id
      ? groupQuery.eq('transfer_group_id', selected.transfer_group_id)
      : groupQuery.eq('id', selected.id)
    const { data: selectedGroup, error: groupError } = await groupQuery
    if (groupError) return res.status(500).json({ error: groupError.message })
    if (!selectedGroup?.length) return res.status(404).json({ error: 'Transfer records not found.' })

    const itemIds = [...new Set(selectedGroup.map(row => row.item_id).filter(Boolean))]
    if (itemIds.length !== selectedGroup.length) {
      return res.status(409).json({ error: 'A transfer is missing its property link. Nothing was changed.' })
    }

    const { data: allTransfers, error: historyError } = await supabase
      .from('item_transfers').select('*').in('item_id', itemIds).order('created_at', { ascending: true })
    if (historyError) return res.status(500).json({ error: historyError.message })

    const { data: allReceipts, error: receiptsError } = await supabase
      .from('property_receipts').select('*').in('item_id', itemIds).order('created_at', { ascending: true })
    if (receiptsError) return res.status(500).json({ error: receiptsError.message })

    const transferRowsToDelete = []
    const receiptIdsToDelete = new Set()
    const restoreByItem = {}

    for (const selectedTransfer of selectedGroup) {
      if (!selectedTransfer.from_user_id || !selectedTransfer.property_receipt_id) {
        return res.status(409).json({ error: 'The previous employee or transfer receipt is missing. Nothing was changed.' })
      }

      const history = (allTransfers || []).filter(row => String(row.item_id) === String(selectedTransfer.item_id))
      const selectedIndex = history.findIndex(row => String(row.id) === String(selectedTransfer.id))
      if (selectedIndex < 0) return res.status(409).json({ error: 'The transfer history is incomplete. Nothing was changed.' })

      const laterRows = history.slice(selectedIndex)
      for (const row of laterRows) {
        if (!row.property_receipt_id) return res.status(409).json({ error: 'A later transfer is missing its receipt link. Nothing was changed.' })
        transferRowsToDelete.push(row)
        receiptIdsToDelete.add(row.property_receipt_id)
      }

      const selectedReceipt = (allReceipts || []).find(row => String(row.id) === String(selectedTransfer.property_receipt_id))
      if (!selectedReceipt) return res.status(409).json({ error: 'The receipt created by this transfer could not be found. Nothing was changed.' })

      // Prefer the receipt created by the immediately preceding transfer to this employee.
      // This is more reliable than matching receipt status/timestamps alone.
      const previousTransfer = history
        .filter(row =>
          String(row.id) !== String(selectedTransfer.id) &&
          String(row.to_user_id) === String(selectedTransfer.from_user_id) &&
          row.property_receipt_id &&
          new Date(row.created_at || row.transfer_date || 0) < new Date(selectedTransfer.created_at || selectedTransfer.transfer_date || 0)
        )
        .sort((a, b) =>
          new Date(b.created_at || b.transfer_date || 0) - new Date(a.created_at || a.transfer_date || 0)
        )[0]

      let previousReceipt = previousTransfer
        ? (allReceipts || []).find(row => String(row.id) === String(previousTransfer.property_receipt_id))
        : null

      // Older transfers may not have a usable preceding-transfer link.
      // Fall back to the latest transferred receipt for the previous employee,
      // without relying on timestamps that may be equal or out of order.
      if (!previousReceipt) {
        previousReceipt = (allReceipts || [])
          .filter(row =>
            String(row.issued_to) === String(selectedTransfer.from_user_id) &&
            String(row.id) !== String(selectedReceipt.id) &&
            row.status === 'Transferred'
          )
          .sort((a, b) =>
            new Date(b.created_at || b.date_issued || 0) - new Date(a.created_at || a.date_issued || 0)
          )[0]
      }

      if (!previousReceipt) {
        return res.status(409).json({
          error: 'The previous employee receipt could not be identified for ' + selectedTransfer.item_id + '. Nothing was changed.'
        })
      }

      restoreByItem[selectedTransfer.item_id] = {
        previous_receipt: previousReceipt,
        previous_user_id: selectedTransfer.from_user_id
      }
    }

    const deleteReceiptIds = [...receiptIdsToDelete]
    if (deleteReceiptIds.length) {
      const [returnResult, requestResult] = await Promise.all([
        supabase.from('item_returns').select('id').in('property_receipt_id', deleteReceiptIds).limit(1),
        supabase.from('return_requests').select('id').in('property_receipt_id', deleteReceiptIds).limit(1)
      ])
      if (returnResult.error) return res.status(500).json({ error: returnResult.error.message })
      if (requestResult.error) return res.status(500).json({ error: requestResult.error.message })
      if (returnResult.data?.length || requestResult.data?.length) {
        return res.status(409).json({ error: 'These transfers cannot be deleted because a later transfer has return records or a return request. Keep the records to preserve the return history.' })
      }
    }

    const userIds = Object.values(restoreByItem).map(row => row.previous_user_id)
    const users = await lookup('users', userIds, 'id, full_name, office_id')
    const officeIds = Object.values(users).map(row => row.office_id).filter(Boolean)
    const offices = await lookup('offices', officeIds, 'id, office_name')
    const items = await lookup('items', itemIds, 'id, accountable_employee, status, office_name, responsibility_center')

    const changes = []
    for (const itemId of Object.keys(restoreByItem)) {
      const restore = restoreByItem[itemId]
      const previousUser = users[String(restore.previous_user_id)]
      const item = items[String(itemId)]
      if (!previousUser || !item) return res.status(409).json({ error: 'A previous employee or property record could not be found. Nothing was changed.' })
      const previousOffice = offices[String(previousUser.office_id)] || null
      changes.push({
        item_id: itemId,
        item,
        previous_receipt: restore.previous_receipt,
        previous_employee: previousUser.full_name,
        previous_office: previousOffice?.office_name || item.office_name,
        previous_user_id: restore.previous_user_id
      })
    }

    const changed = []
    try {
      for (const change of changes) {
        const receiptUpdate = await supabase.from('property_receipts')
          .update({ status: 'Issued' }).eq('id', change.previous_receipt.id)
        if (receiptUpdate.error) throw new Error(receiptUpdate.error.message)
        changed.push(change)

        const itemUpdate = await supabase.from('items').update({
          accountable_employee: change.previous_employee,
          office_name: change.previous_office,
          responsibility_center: change.previous_office,
          status: 'Issued'
        }).eq('id', change.item_id)
        if (itemUpdate.error) throw new Error(itemUpdate.error.message)
      }
    } catch (restoreError) {
      for (const change of changed) {
        await supabase.from('property_receipts').update({ status: 'Transferred' }).eq('id', change.previous_receipt.id)
        await supabase.from('items').update({
          accountable_employee: change.item.accountable_employee,
          office_name: change.item.office_name,
          responsibility_center: change.item.responsibility_center,
          status: change.item.status
        }).eq('id', change.item_id)
      }
      return res.status(500).json({ error: 'Could not restore every property. No transfer history was deleted: ' + restoreError.message })
    }

    const transferIds = [...new Set(transferRowsToDelete.map(row => row.id))]
    const deletedTransfers = await supabase.from('item_transfers').delete().in('id', transferIds)
    if (deletedTransfers.error) {
      for (const change of changed) {
        await supabase.from('property_receipts').update({ status: 'Transferred' }).eq('id', change.previous_receipt.id)
        await supabase.from('items').update({
          accountable_employee: change.item.accountable_employee,
          office_name: change.item.office_name,
          responsibility_center: change.item.responsibility_center,
          status: change.item.status
        }).eq('id', change.item_id)
      }
      return res.status(500).json({ error: 'Transfer history could not be removed. Property details were restored where possible.', details: deletedTransfers.error.message })
    }

    if (deleteReceiptIds.length) {
      const deletedReceipts = await supabase.from('property_receipts').delete().in('id', deleteReceiptIds)
      if (deletedReceipts.error) {
        return res.status(500).json({
          error: 'Transfer rows were removed, but some generated receipts could not be deleted. Contact the administrator before making another transfer.',
          details: deletedReceipts.error.message
        })
      }
    }

    return res.json({
      message: 'The selected transfer and its later transfers were removed for the affected properties. Their previous receipts were restored. Other properties in shared transfer groups were preserved.',
      deleted_transfer_count: transferIds.length,
      deleted_receipt_count: deleteReceiptIds.length,
      affected_properties: changes.length
    })
  } catch (error) {
    console.error('Transfer deletion failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to delete transfer.' })
  }
})

module.exports = router
 
