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
      'id, description, property_number, condition, status, accountable_employee'
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
    const { data, error } = await supabase
      .from('item_transfers')
      .select('*')
      .order('created_at', { ascending: false })
 
    if (error) return res.status(500).json({ error: error.message })
 
    const rows = data || []
    const items = await lookup('items', rows.map(r => r.item_id), 'id, description, property_number, condition, status')
    const receipts = await lookup('property_receipts', rows.map(r => r.property_receipt_id), 'id, receipt_number, quantity')
    const users = await lookup(
      'users',
      rows.flatMap(r => [r.from_user_id, r.to_user_id, r.transferred_by]),
      'id, full_name'
    )
    const offices = await lookup('offices', rows.map(r => r.office_id), 'id, office_name')
 
    res.json(rows.map(r => ({
      ...r,
      items: items[r.item_id] || null,
      property_receipts: receipts[r.property_receipt_id] || null,
      from_user: users[r.from_user_id] || null,
      to_user: users[r.to_user_id] || null,
      transferred_by_user: users[r.transferred_by] || null,
      offices: offices[r.office_id] || null
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
 
router.post('/', async (req, res) => {
  try {
    const {
      property_receipt_id,
      transfer_type,
      to_user_id,
      office_id,
      transfer_date,
      condition_after_transfer,
      reason,
      remarks
    } = req.body
 
    if (!property_receipt_id) {
      return res.status(400).json({ error: 'Please select an issued receipt' })
    }
 
    if (!['To Employee', 'To Property Office'].includes(transfer_type)) {
      return res.status(400).json({ error: 'Transfer type must be To Employee or To Property Office' })
    }
 
    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('id, item_id, quantity, status, issued_to')
      .eq('id', property_receipt_id)
      .single()
 
    if (receiptError || !receipt) {
      return res.status(404).json({ error: 'Issued receipt not found' })
    }
 
    if (receipt.status !== 'Issued') {
      return res.status(400).json({ error: 'Only issued receipts can be transferred' })
    }
 
    const { data: existingReturn, error: existingReturnError } = await supabase
      .from('item_returns')
      .select('id')
      .eq('property_receipt_id', receipt.id)
      .maybeSingle()
 
    if (existingReturnError) return res.status(500).json({ error: existingReturnError.message })
    if (existingReturn) {
      return res.status(409).json({ error: 'This receipt has already been returned' })
    }

    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('return_requests')
      .select('id')
      .eq('property_receipt_id', receipt.id)
      .eq('status', 'Pending')
      .maybeSingle()

    if (pendingRequestError) return res.status(500).json({ error: pendingRequestError.message })
    if (pendingRequest) {
      return res.status(409).json({
        error: 'This property has a pending return request. Accept or reject it in Return Requests first.'
      })
    }
 
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, description, quantity, status, condition, accountable_employee')
      .eq('id', receipt.item_id)
      .single()
 
    if (itemError || !item) {
      return res.status(404).json({ error: 'Inventory item not found' })
    }
 
    const transferDate = transfer_date || new Date().toISOString().split('T')[0]
 
    // ---------------------------------------------------------------
    // Transfer to another employee: property stays Issued, new holder
    // ---------------------------------------------------------------
    if (transfer_type === 'To Employee') {
      if (!to_user_id) {
        return res.status(400).json({ error: 'Please select the employee receiving the property' })
      }
 
      if (String(to_user_id) === String(receipt.issued_to)) {
        return res.status(400).json({ error: 'The property is already issued to this employee' })
      }
 
      if (item.condition !== 'Serviceable') {
        return res.status(400).json({
          error: 'Unserviceable property cannot be transferred to an employee. Transfer it to the Property Office instead.'
        })
      }
 
      const { data: recipient, error: recipientError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', to_user_id)
        .single()
 
      if (recipientError || !recipient) {
        return res.status(404).json({ error: 'Receiving employee not found' })
      }
 
      const { data: transfer, error: insertError } = await supabase
        .from('item_transfers')
        .insert([{
          item_id: item.id,
          property_receipt_id: receipt.id,
          transfer_type,
          from_user_id: receipt.issued_to || null,
          to_user_id: recipient.id,
          office_id: office_id || null,
          transfer_date: transferDate,
          condition_after_transfer: item.condition,
          resulting_status: 'Issued',
          reason: reason || null,
          remarks: remarks || null,
          transferred_by: req.profile?.id || null
        }])
        .select()
        .single()
 
      if (insertError) return res.status(500).json({ error: insertError.message })
 
      const { error: receiptUpdateError } = await supabase
        .from('property_receipts')
        .update({ issued_to: recipient.id })
        .eq('id', receipt.id)
 
      if (receiptUpdateError) {
        await supabase.from('item_transfers').delete().eq('id', transfer.id)
        return res.status(500).json({ error: `Transfer failed: ${receiptUpdateError.message}` })
      }
 
      const { error: itemUpdateError } = await supabase
        .from('items')
        .update({ accountable_employee: recipient.full_name, status: 'Issued' })
        .eq('id', item.id)
 
      if (itemUpdateError) {
        await supabase.from('property_receipts').update({ issued_to: receipt.issued_to }).eq('id', receipt.id)
        await supabase.from('item_transfers').delete().eq('id', transfer.id)
        return res.status(500).json({ error: `Transfer failed: ${itemUpdateError.message}` })
      }
 
      await createAuditLog(
        'Created',
        item.id,
        JSON.stringify({ accountable_employee: item.accountable_employee }),
        JSON.stringify(transfer),
        `Transferred ${item.description} from ${item.accountable_employee || 'previous holder'} to ${recipient.full_name}`,
        req.profile?.id
      )
 
      return res.status(201).json(transfer)
    }
 
    // ---------------------------------------------------------------
    // Transfer to Property Office: goes back into stock
    //   Serviceable   -> Available
    //   Unserviceable -> Returned (displayed as Returned and Unserviceable)
    // ---------------------------------------------------------------
    if (!CONDITIONS.includes(condition_after_transfer)) {
      return res.status(400).json({ error: 'Condition must be Serviceable or Unserviceable' })
    }
 
    const { data: legacyReturn, error: legacyReturnError } = await supabase
      .from('item_returns')
      .select('id')
      .eq('item_id', receipt.item_id)
      .is('property_receipt_id', null)
      .maybeSingle()
 
    if (legacyReturnError) return res.status(500).json({ error: legacyReturnError.message })
    if (legacyReturn) {
      return res.status(409).json({
        error: 'This item has an older return record without a linked receipt. Review its stock before transferring it.'
      })
    }
 
    const receiptQuantity = Number(receipt.quantity)
    const currentQuantity = Number(item.quantity ?? 0)
    const updatedQuantity = currentQuantity + receiptQuantity
 
    if (!Number.isInteger(receiptQuantity) || receiptQuantity < 1) {
      return res.status(400).json({ error: 'The issued receipt quantity is invalid' })
    }
    if (!Number.isInteger(currentQuantity) || currentQuantity < 0 || !Number.isSafeInteger(updatedQuantity)) {
      return res.status(400).json({ error: 'The inventory quantity is invalid' })
    }
 
    const resultingStatus = getStatusForCondition(condition_after_transfer)
 
    const { data: transfer, error: insertError } = await supabase
      .from('item_transfers')
      .insert([{
        item_id: item.id,
        property_receipt_id: receipt.id,
        transfer_type,
        from_user_id: receipt.issued_to || null,
        to_user_id: null,
        office_id: office_id || null,
        transfer_date: transferDate,
        condition_after_transfer,
        resulting_status: resultingStatus,
        reason: reason || null,
        remarks: remarks || null,
        transferred_by: req.profile?.id || null
      }])
      .select()
      .single()
 
    if (insertError) return res.status(500).json({ error: insertError.message })
 
    // Also log it as a return so the Returns tab and its safeguards stay in sync
    const { data: newReturn, error: returnError } = await supabase
      .from('item_returns')
      .insert([{
        item_id: item.id,
        property_receipt_id: receipt.id,
        returned_by: receipt.issued_to || null,
        office_id: office_id || null,
        return_date: transferDate,
        condition_after_return: condition_after_transfer,
        return_reason: reason || 'Transferred to Property Office',
        remarks: ['Recorded via Transfers', remarks].filter(Boolean).join(' - ')
      }])
      .select()
      .single()
 
    if (returnError) {
      await supabase.from('item_transfers').delete().eq('id', transfer.id)
      return res.status(returnError.code === '23505' ? 409 : 500).json({
        error: returnError.code === '23505' ? 'This receipt has already been returned' : returnError.message
      })
    }
 
    const { error: itemUpdateError } = await supabase
      .from('items')
      .update({
        quantity: updatedQuantity,
        condition: condition_after_transfer,
        status: resultingStatus,
        accountable_employee: null
      })
      .eq('id', item.id)
 
    if (itemUpdateError) {
      await supabase.from('item_returns').delete().eq('id', newReturn.id)
      await supabase.from('item_transfers').delete().eq('id', transfer.id)
      return res.status(500).json({
        error: `Transfer was not completed because the item could not be updated: ${itemUpdateError.message}`
      })
    }
 
    await createAuditLog(
      'Created',
      item.id,
      JSON.stringify({ status: item.status, condition: item.condition, quantity: item.quantity }),
      JSON.stringify(transfer),
      `Transferred ${item.description} to Property Office (${condition_after_transfer}); status ${resultingStatus}; restored quantity ${receiptQuantity}`,
      req.profile?.id
    )
 
    res.status(201).json(transfer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
 
module.exports = router
 
