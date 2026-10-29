
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

// GET ALL RECEIPTS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('property_receipts')
      .select(`
        *,
        items (
          id, property_number, description, model_number, serial_number,
          cost, acquisition_date, quantity, condition, status,
          accountable_employee, responsibility_center, fund_cluster, unit
        ),
        users (id, full_name, signature_path),
        item_requests (
          id, request_number, item_description, quantity, purpose, status,
          requested_by, office_id,
          users (id, full_name, signature_path),
          offices (id, office_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data || [])
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load receipts' })
  }
})

// GET ONE RECEIPT
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('property_receipts')
      .select(`
        *,
        items (
          id, property_number, description, model_number, serial_number,
          cost, acquisition_date, quantity, condition, status,
          accountable_employee, responsibility_center, fund_cluster, unit
        ),
        users (id, full_name, signature_path),
        item_requests (
          id, request_number, item_description, quantity, purpose, status,
          requested_by, office_id,
          users (id, full_name, signature_path),
          offices (id, office_name)
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Receipt not found' })
    }

    res.json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load receipt' })
  }
})

// CREATE RECEIPT - ONE UNIT PER REQUEST
router.post('/', async (req, res) => {
  try {
    const {
      item_request_id,
      receipt_type,
      receipt_number,
      date_issued,
      remarks
    } = req.body

    if (!item_request_id) {
      return res.status(400).json({
        error: 'Item request is required'
      })
    }

    if (!['PAR', 'ICS'].includes(receipt_type)) {
      return res.status(400).json({
        error: 'Receipt type must be PAR or ICS'
      })
    }

    if (!receipt_number || !String(receipt_number).trim()) {
      return res.status(400).json({
        error: 'Receipt number is required'
      })
    }

    // Find request
    const { data: request, error: requestError } = await supabase
      .from('item_requests')
      .select('*, users (id, full_name)')
      .eq('id', item_request_id)
      .single()

    if (requestError || !request) {
      return res.status(404).json({
        error: 'Item request not found'
      })
    }

    if (
      String(request.status || '').trim().toLowerCase() !== 'approved'
    ) {
      return res.status(400).json({
        error: 'Only approved requests can be issued'
      })
    }

    if (!request.item_id || !request.requested_by) {
      return res.status(400).json({
        error: 'The request must have an assigned item and recipient'
      })
    }

    // Every request must be for exactly one unit
    if (Number(request.quantity) !== 1) {
      return res.status(400).json({
        error: 'Each item request must have a quantity of 1. Please update the request first.'
      })
    }

    // Prevent duplicate receipts
    const {
      data: existingReceipt,
      error: existingError
    } = await supabase
      .from('property_receipts')
      .select('id')
      .eq('item_request_id', item_request_id)
      .maybeSingle()

    if (existingError) {
      return res.status(500).json({
        error: existingError.message
      })
    }

    if (existingReceipt) {
      return res.status(409).json({
        error: 'This item request already has a receipt'
      })
    }

    // Find item without tracking_type
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id, description, status, condition, accountable_employee,
        quantity
      `)
      .eq('id', request.item_id)
      .single()

    if (itemError || !item) {
      return res.status(404).json({
        error: 'Item not found'
      })
    }

    const availableQuantity = Number(item.quantity)

    if (
      !Number.isInteger(availableQuantity) ||
      availableQuantity < 0
    ) {
      return res.status(400).json({
        error: 'Item stock quantity is invalid'
      })
    }

    if (availableQuantity < 1) {
      return res.status(400).json({
        error: 'This item is out of stock'
      })
    }

    if (item.condition !== 'Serviceable') {
      return res.status(400).json({
        error: 'This item is Unserviceable and cannot be issued'
      })
    }

    if (!['Available', 'Assigned'].includes(item.status)) {
      return res.status(400).json({
        error: `This item cannot be issued. Current status: ${item.status}`
      })
    }

    // Find recipient
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', request.requested_by)
      .single()

    if (recipientError || !recipient) {
      return res.status(404).json({
        error: 'Recipient not found'
      })
    }

    // Always issue one unit
    const quantityToIssue = 1
    const remainingQuantity = availableQuantity - quantityToIssue

    const newStatus = remainingQuantity > 0
      ? 'Available'
      : 'Issued'

    // Only assign the employee when no stock remains
    const newAccountableEmployee = remainingQuantity === 0
      ? recipient.full_name
      : null

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .insert([{
        item_id: request.item_id,
        item_request_id,
        receipt_type,
        receipt_number: String(receipt_number).trim(),
        issued_to: request.requested_by,
        quantity: 1,
        date_issued: date_issued ||
          new Date().toISOString().split('T')[0],
        remarks: remarks || null,
        status: 'Issued'
      }])
      .select()
      .single()

    if (receiptError) {
      return res.status(500).json({
        error: receiptError.message
      })
    }

    // Reduce stock by one
    const { data: updatedItem, error: updateItemError } = await supabase
      .from('items')
      .update({
        quantity: remainingQuantity,
        status: newStatus,
        accountable_employee: newAccountableEmployee
      })
      .eq('id', request.item_id)
      .select()
      .single()

    if (updateItemError) {
      await supabase
        .from('property_receipts')
        .delete()
        .eq('id', receipt.id)

      return res.status(500).json({
        error: updateItemError.message
      })
    }

    // Mark request as delivered
    const { error: requestUpdateError } = await supabase
      .from('item_requests')
      .update({ status: 'Delivered' })
      .eq('id', item_request_id)

    if (requestUpdateError) {
      await supabase
        .from('items')
        .update({
          quantity: availableQuantity,
          status: item.status,
          accountable_employee: item.accountable_employee
        })
        .eq('id', request.item_id)

      await supabase
        .from('property_receipts')
        .delete()
        .eq('id', receipt.id)

      return res.status(500).json({
        error: requestUpdateError.message
      })
    }

    // Audit log
    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: request.item_id,
        action: 'CREATE',
        old_value: null,
        new_value: JSON.stringify({
          receipt_id: receipt.id,
          item_request_id,
          receipt_number: receipt.receipt_number,
          quantity: 1,
          old_quantity: availableQuantity,
          new_quantity: remainingQuantity,
          status: newStatus
        }),
        description:
          `Created receipt ${receipt.receipt_number} for ${item.description}`,
        record_id: receipt.id
      })
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.status(201).json({
      message: 'Receipt created successfully',
      receipt,
      item: updatedItem
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to create receipt'
    })
  }
})

// UPDATE RECEIPT DETAILS
router.put('/:id', async (req, res) => {
  try {
    const {
      receipt_type,
      receipt_number,
      date_issued,
      remarks,
      status
    } = req.body

    if (!['PAR', 'ICS'].includes(receipt_type)) {
      return res.status(400).json({
        error: 'Receipt type must be PAR or ICS'
      })
    }

    if (!receipt_number || !String(receipt_number).trim()) {
      return res.status(400).json({
        error: 'Receipt number is required'
      })
    }

    const {
      data: existingReceipt,
      error: findError
    } = await supabase
      .from('property_receipts')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (findError || !existingReceipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      })
    }

    const updates = {
      receipt_type,
      receipt_number: String(receipt_number).trim(),
      date_issued: date_issued || null,
      remarks: remarks || null
    }

    if (status !== undefined) {
      updates.status = status
    }

    const {
      data: updatedReceipt,
      error: updateError
    } = await supabase
      .from('property_receipts')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({
        error: updateError.message
      })
    }

    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: existingReceipt.item_id,
        action: 'UPDATE',
        old_value: JSON.stringify(existingReceipt),
        new_value: JSON.stringify(updatedReceipt),
        description:
          `Updated receipt ${updatedReceipt.receipt_number}`,
        record_id: req.params.id
      })
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json({
      message: 'Receipt updated successfully',
      receipt: updatedReceipt
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to update receipt'
    })
  }
})

// DELETE RECEIPT AND RESTORE STOCK
router.delete('/:id', async (req, res) => {
  try {
    const {
      data: receipt,
      error: receiptError
    } = await supabase
      .from('property_receipts')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (receiptError || !receipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      })
    }

    let item = null

    if (receipt.item_id) {
      const { data, error } = await supabase
        .from('items')
        .select('id, quantity, status, accountable_employee')
        .eq('id', receipt.item_id)
        .single()

      if (error || !data) {
        return res.status(409).json({
          error: 'The linked item was not found. Receipt was not deleted.'
        })
      }

      item = data

      const restoreQuantity = Number(receipt.quantity)

      if (
        !Number.isInteger(restoreQuantity) ||
        restoreQuantity < 1
      ) {
        return res.status(400).json({
          error: 'Receipt quantity is invalid. Receipt was not deleted.'
        })
      }

      const { error: restoreError } = await supabase
        .from('items')
        .update({
          quantity: Number(item.quantity || 0) + restoreQuantity,
          status: 'Available',
          accountable_employee: null
        })
        .eq('id', receipt.item_id)

      if (restoreError) {
        return res.status(500).json({
          error: 'Failed to restore item stock. Receipt was not deleted.'
        })
      }
    }

    const { error: deleteError } = await supabase
      .from('property_receipts')
      .delete()
      .eq('id', req.params.id)

    if (deleteError) {
      if (item) {
        await supabase
          .from('items')
          .update({
            quantity: Number(item.quantity || 0),
            status: item.status,
            accountable_employee: item.accountable_employee
          })
          .eq('id', item.id)
      }

      return res.status(500).json({
        error: 'The receipt could not be deleted. Inventory changes were rolled back where possible.'
      })
    }

    if (receipt.item_request_id) {
      const { error } = await supabase
        .from('item_requests')
        .update({ status: 'Approved' })
        .eq('id', receipt.item_request_id)

      if (error) {
        console.log('Request restore error:', error.message)
      }
    }

    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: receipt.item_id,
        action: 'DELETE',
        old_value: JSON.stringify(receipt),
        new_value: null,
        description:
          `Deleted receipt ${receipt.receipt_number}`,
        record_id: receipt.id
      })
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json({
      message: 'Receipt deleted and stock restored successfully'
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to delete receipt'
    })
  }
})

module.exports = router
