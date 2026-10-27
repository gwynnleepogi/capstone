const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

// Teacher / Non-Teaching Staff submit a return request for property issued to them.
// Administrator / Personnel then Accept (stock is restored) or Reject it (nothing changes).

const STAFF_ROLES = ['Administrator', 'Personnel']
const CONDITIONS = ['Serviceable', 'Unserviceable']

function isStaff(req) {
  return STAFF_ROLES.includes(req.role)
}

function staffOnly(req, res, next) {
  if (!isStaff(req)) {
    return res.status(403).json({ error: 'Only Administrator or Personnel can do this.' })
  }

  next()
}

async function lookup(table, ids, columns) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (unique.length === 0) return {}

  const { data, error } = await supabase.from(table).select(columns).in('id', unique)
  if (error) throw new Error(error.message)

  return Object.fromEntries((data || []).map(row => [row.id, row]))
}

async function withDetails(rows) {
  const items = await lookup(
    'items',
    rows.map(r => r.item_id),
    'id, description, property_number, serial_number, condition, status, quantity'
  )
  const receipts = await lookup(
    'property_receipts',
    rows.map(r => r.property_receipt_id),
    'id, receipt_number, quantity, date_issued, status'
  )
  const users = await lookup(
    'users',
    rows.flatMap(r => [r.requested_by, r.reviewed_by]),
    'id, full_name'
  )
  const offices = await lookup('offices', rows.map(r => r.office_id), 'id, office_name')

  return rows.map(r => ({
    ...r,
    items: items[r.item_id] || null,
    property_receipts: receipts[r.property_receipt_id] || null,
    requester: users[r.requested_by] || null,
    reviewer: users[r.reviewed_by] || null,
    offices: offices[r.office_id] || null
  }))
}

// Has this receipt already been returned (by any route)?
async function findExistingReturn(receipt) {
  const { data: existing, error } = await supabase
    .from('item_returns')
    .select('id')
    .eq('property_receipt_id', receipt.id)
    .maybeSingle()

  if (error) return { error: error.message }
  if (existing) return { message: 'This property has already been returned.' }

  const { data: legacy, error: legacyError } = await supabase
    .from('item_returns')
    .select('id')
    .eq('item_id', receipt.item_id)
    .is('property_receipt_id', null)
    .maybeSingle()

  if (legacyError) return { error: legacyError.message }
  if (legacy) {
    return {
      message:
        'This item has an older return record without a linked receipt. Review its stock before recording another return.'
    }
  }

  return {}
}

// ---------------------------------------------------------------------------
// Issued property the logged-in user can still return
// ---------------------------------------------------------------------------
router.get('/eligible', async (req, res) => {
  try {
    const { data: receipts, error } = await supabase
      .from('property_receipts')
      .select('id, item_id, receipt_number, quantity, issued_to, date_issued, status')
      .eq('status', 'Issued')
      .eq('issued_to', req.profile.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    const { data: returns, error: returnsError } = await supabase
      .from('item_returns')
      .select('property_receipt_id, item_id')

    if (returnsError) return res.status(500).json({ error: returnsError.message })

    const { data: pending, error: pendingError } = await supabase
      .from('return_requests')
      .select('property_receipt_id')
      .eq('status', 'Pending')

    if (pendingError) return res.status(500).json({ error: pendingError.message })

    const returnedReceiptIds = new Set((returns || []).map(r => r.property_receipt_id).filter(Boolean))
    const legacyItemIds = new Set(
      (returns || []).filter(r => !r.property_receipt_id).map(r => r.item_id)
    )
    const pendingReceiptIds = new Set((pending || []).map(r => r.property_receipt_id))

    const open = (receipts || []).filter(
      r =>
        !returnedReceiptIds.has(r.id) &&
        !legacyItemIds.has(r.item_id) &&
        !pendingReceiptIds.has(r.id)
    )

    const items = await lookup(
      'items',
      open.map(r => r.item_id),
      'id, description, property_number, serial_number, condition, status'
    )

    res.json(open.map(r => ({ ...r, items: items[r.item_id] || null })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// The logged-in user's own return requests
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('return_requests')
      .select('*')
      .eq('requested_by', req.profile.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    res.json(await withDetails(data || []))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Staff: number of pending requests (sidebar badge)
// ---------------------------------------------------------------------------
router.get('/pending-count', staffOnly, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('return_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending')

    if (error) return res.status(500).json({ error: error.message })

    res.json({ count: count || 0 })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Staff: all return requests
// ---------------------------------------------------------------------------
router.get('/', staffOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('return_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    res.json(await withDetails(data || []))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Submit a return request
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { property_receipt_id, return_date, condition_declared, return_reason, remarks } = req.body

    if (!property_receipt_id) {
      return res.status(400).json({ error: 'Please select the property you want to return.' })
    }

    if (!CONDITIONS.includes(condition_declared)) {
      return res.status(400).json({ error: 'Condition must be Serviceable or Unserviceable.' })
    }

    if (!String(return_reason || '').trim()) {
      return res.status(400).json({ error: 'Please give a reason for the return.' })
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('id, item_id, quantity, status, issued_to')
      .eq('id', property_receipt_id)
      .single()

    if (receiptError || !receipt) {
      return res.status(404).json({ error: 'Issued property not found.' })
    }

    if (String(receipt.issued_to) !== String(req.profile.id)) {
      return res.status(403).json({ error: 'You can only return property that was issued to you.' })
    }

    if (receipt.status !== 'Issued') {
      return res.status(400).json({ error: 'Only issued property can be returned.' })
    }

    const existing = await findExistingReturn(receipt)
    if (existing.error) return res.status(500).json({ error: existing.error })
    if (existing.message) return res.status(409).json({ error: existing.message })

    const { data: openRequest, error: openError } = await supabase
      .from('return_requests')
      .select('id')
      .eq('property_receipt_id', receipt.id)
      .eq('status', 'Pending')
      .maybeSingle()

    if (openError) return res.status(500).json({ error: openError.message })
    if (openRequest) {
      return res.status(409).json({ error: 'A return request for this property is already waiting for review.' })
    }

    const { data: created, error: insertError } = await supabase
      .from('return_requests')
      .insert([{
        property_receipt_id: receipt.id,
        item_id: receipt.item_id,
        requested_by: req.profile.id,
        office_id: req.profile.office_id || null,
        return_date: return_date || new Date().toISOString().split('T')[0],
        condition_declared,
        return_reason: String(return_reason).trim(),
        remarks: String(remarks || '').trim() || null,
        status: 'Pending'
      }])
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'A return request for this property is already waiting for review.' })
      }

      return res.status(500).json({ error: insertError.message })
    }

    await createAuditLog(
      'Created',
      receipt.item_id,
      null,
      JSON.stringify(created),
      `${req.profile.full_name || 'A user'} requested to return property (receipt ${receipt.id})`,
      req.profile.id
    )

    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Staff: ACCEPT -> record the return and put the stock back
// ---------------------------------------------------------------------------
router.patch('/:id/accept', staffOnly, async (req, res) => {
  const requestId = req.params.id

  try {
    const { condition_after_return, review_remarks } = req.body

    const { data: request, error: requestError } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) return res.status(500).json({ error: requestError.message })
    if (!request) return res.status(404).json({ error: 'Return request not found.' })

    if (request.status !== 'Pending') {
      return res.status(400).json({
        error: `Only pending requests can be accepted. Current status: ${request.status}`
      })
    }

    const finalCondition = condition_after_return || request.condition_declared

    if (!CONDITIONS.includes(finalCondition)) {
      return res.status(400).json({ error: 'Condition must be Serviceable or Unserviceable.' })
    }

    // Claim the request first so two people cannot accept it at the same time.
    const reviewFields = {
      status: 'Accepted',
      reviewed_by: req.profile.id,
      reviewed_at: new Date().toISOString(),
      review_remarks: String(review_remarks || '').trim() || null,
      condition_after_return: finalCondition
    }

    const { data: claimed, error: claimError } = await supabase
      .from('return_requests')
      .update(reviewFields)
      .eq('id', requestId)
      .eq('status', 'Pending')
      .select()
      .maybeSingle()

    if (claimError) return res.status(500).json({ error: claimError.message })
    if (!claimed) {
      return res.status(409).json({ error: 'This request was already reviewed. Refresh and try again.' })
    }

    const revert = async message => {
      await supabase
        .from('return_requests')
        .update({
          status: 'Pending',
          reviewed_by: null,
          reviewed_at: null,
          review_remarks: null,
          condition_after_return: null,
          item_return_id: null
        })
        .eq('id', requestId)

      return message
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('id, item_id, quantity, status')
      .eq('id', request.property_receipt_id)
      .single()

    if (receiptError || !receipt) {
      return res.status(404).json({ error: await revert('The issued receipt could not be found.') })
    }

    if (receipt.status !== 'Issued') {
      return res.status(400).json({ error: await revert('This property is no longer in Issued status.') })
    }

    const existing = await findExistingReturn(receipt)
    if (existing.error) return res.status(500).json({ error: await revert(existing.error) })
    if (existing.message) return res.status(409).json({ error: await revert(existing.message) })

    const receiptQuantity = Number(receipt.quantity)
    if (!Number.isInteger(receiptQuantity) || receiptQuantity < 1) {
      return res.status(400).json({ error: await revert('The issued receipt quantity is invalid.') })
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, quantity, status')
      .eq('id', receipt.item_id)
      .single()

    if (itemError || !item) {
      return res.status(404).json({ error: await revert('Inventory item not found.') })
    }

    const currentQuantity = Number(item.quantity ?? 0)
    const updatedQuantity = currentQuantity + receiptQuantity

    if (!Number.isInteger(currentQuantity) || currentQuantity < 0 || !Number.isSafeInteger(updatedQuantity)) {
      return res.status(400).json({ error: await revert('The inventory quantity is invalid.') })
    }

    const { data: newReturn, error: returnError } = await supabase
      .from('item_returns')
      .insert([{
        item_id: receipt.item_id,
        property_receipt_id: receipt.id,
        returned_by: request.requested_by || null,
        office_id: request.office_id || null,
        return_date: request.return_date || new Date().toISOString().split('T')[0],
        condition_after_return: finalCondition,
        return_reason: request.return_reason || null,
        remarks: ['Return request accepted', request.remarks, reviewFields.review_remarks]
          .filter(Boolean)
          .join(' - ')
      }])
      .select()
      .single()

    if (returnError) {
      const message = returnError.code === '23505'
        ? 'This property has already been returned.'
        : returnError.message

      return res.status(returnError.code === '23505' ? 409 : 500).json({ error: await revert(message) })
    }

    let itemUpdate = supabase
      .from('items')
      .update({
        condition: finalCondition,
        status: 'Returned',
        accountable_employee: null,
        quantity: updatedQuantity
      })
      .eq('id', receipt.item_id)

    // Only apply if the stock has not changed since we read it.
    if (item.quantity !== null && item.quantity !== undefined) {
      itemUpdate = itemUpdate.eq('quantity', item.quantity)
    }

    const { data: updatedItem, error: itemUpdateError } = await itemUpdate
      .select('id')
      .maybeSingle()

    if (itemUpdateError || !updatedItem) {
      await supabase.from('item_returns').delete().eq('id', newReturn.id)

      const message = itemUpdateError
        ? `The item could not be updated: ${itemUpdateError.message}`
        : 'The item stock changed while accepting this return. Please try again.'

      return res.status(itemUpdateError ? 500 : 409).json({ error: await revert(message) })
    }

    const { data: finalRequest, error: finalError } = await supabase
      .from('return_requests')
      .update({ item_return_id: String(newReturn.id) })
      .eq('id', requestId)
      .select()
      .single()

    if (finalError) {
      console.log('Could not link return request to return record:', finalError.message)
    }

    await createAuditLog(
      'Updated',
      receipt.item_id,
      JSON.stringify({ status: 'Pending' }),
      JSON.stringify(finalRequest || claimed),
      `Accepted return request; restored quantity ${receiptQuantity}; condition ${finalCondition}`,
      req.profile.id
    )

    const [detailed] = await withDetails([finalRequest || claimed])
    res.json(detailed)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Staff: REJECT -> nothing changes in stock, the property stays with the user
// ---------------------------------------------------------------------------
router.patch('/:id/reject', staffOnly, async (req, res) => {
  try {
    const reason = String(req.body.review_remarks || '').trim()

    if (!reason) {
      return res.status(400).json({ error: 'Please give a reason for rejecting this return.' })
    }

    const { data: request, error: requestError } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (requestError) return res.status(500).json({ error: requestError.message })
    if (!request) return res.status(404).json({ error: 'Return request not found.' })

    if (request.status !== 'Pending') {
      return res.status(400).json({
        error: `Only pending requests can be rejected. Current status: ${request.status}`
      })
    }

    const { data: updated, error } = await supabase
      .from('return_requests')
      .update({
        status: 'Rejected',
        reviewed_by: req.profile.id,
        reviewed_at: new Date().toISOString(),
        review_remarks: reason
      })
      .eq('id', req.params.id)
      .eq('status', 'Pending')
      .select()
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!updated) {
      return res.status(409).json({ error: 'This request was already reviewed. Refresh and try again.' })
    }

    await createAuditLog(
      'Updated',
      request.item_id,
      JSON.stringify(request),
      JSON.stringify(updated),
      `Rejected return request: ${reason}`,
      req.profile.id
    )

    const [detailed] = await withDetails([updated])
    res.json(detailed)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ---------------------------------------------------------------------------
// Requester: cancel their own pending request
// ---------------------------------------------------------------------------
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { data: request, error: requestError } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (requestError) return res.status(500).json({ error: requestError.message })
    if (!request) return res.status(404).json({ error: 'Return request not found.' })

    if (String(request.requested_by) !== String(req.profile.id)) {
      return res.status(403).json({ error: 'You can only cancel your own return requests.' })
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: `Only pending requests can be cancelled. Current status: ${request.status}` })
    }

    const { data: updated, error } = await supabase
      .from('return_requests')
      .update({ status: 'Cancelled' })
      .eq('id', req.params.id)
      .eq('status', 'Pending')
      .select()
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!updated) {
      return res.status(409).json({ error: 'This request was already reviewed.' })
    }

    await createAuditLog(
      'Updated',
      request.item_id,
      JSON.stringify(request),
      JSON.stringify(updated),
      'Cancelled return request',
      req.profile.id
    )

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
