
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

// ==========================================
// PENDING ISSUANCE COUNT
// Counts approved requests that do not yet have
// a linked property receipt.
// ==========================================
router.get('/pending-issuance-count', async (req, res) => {
  try {
    const { data: items, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('status', 'Issued')
      .not('accountable_employee', 'is', null)
      .neq('accountable_employee', '')

    if (itemError) {
      console.error('Pending acquisition property lookup failed:', itemError)
      return res.status(500).json({ error: itemError.message })
    }

    const { data: receipts, error: receiptError } = await supabase
      .from('property_receipts')
      .select('item_id')

    if (receiptError) {
      console.error('Pending acquisition receipt lookup failed:', receiptError)
      return res.status(500).json({ error: receiptError.message })
    }

    const receiptedItemIds = new Set(
      (receipts || [])
        .filter(receipt => receipt.item_id)
        .map(receipt => String(receipt.item_id))
    )

    const pendingCount = (items || []).filter(item =>
      !receiptedItemIds.has(String(item.id))
    ).length

    res.json({ count: pendingCount })
  } catch (error) {
    console.error('Pending acquisition count failed:', error)
    res.status(500).json({ error: 'Failed to load pending acquisition count' })
  }
})

// ==========================================
// GET ALL RECEIPTS
// ==========================================
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
        users (id, full_name),
        item_requests (
          id, request_number, item_description, quantity, purpose, status,
          requested_by, office_id,
          users (id, full_name, office_id),
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

// ==========================================
// GET ONE RECEIPT
// ==========================================
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
        users (id, full_name, office_id),
        item_requests (
          id, request_number, item_description, quantity, purpose, status,
          requested_by, office_id,
          users (id, full_name),
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

// ==========================================
// CREATE RECEIPT - ONE UNIT PER APPROVED REQUEST OR ASSIGNED PROPERTY
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      item_request_id,
      item_id,
      transaction_type = 'Acquisition',
      return_id,
      issued_to,
      condition_after_reissue,
      receipt_type,
      receipt_number,
      date_issued,
      remarks
    } = req.body

    if (item_request_id || !item_id) {
      return res.status(400).json({
        error: 'Select an assigned property. Item requests are not a receipt source.'
      })
    }

    if (!['Acquisition', 'Reissuance'].includes(transaction_type)) {
      return res.status(400).json({ error: 'Transaction type must be Acquisition or Reissuance. Transfers are created from approved transfer requests.' })
    }

    if (!['PAR', 'ICS'].includes(receipt_type)) {
      return res.status(400).json({
        error: 'Receipt type must be PAR or ICS'
      })
    }

    let finalReceiptNumber = receipt_number

    if (!receipt_number || !String(finalReceiptNumber).trim()) {
      const { data: existingReceipts, error: numberLookupError } = await supabase
        .from('property_receipts')
        .select('receipt_number')

      if (numberLookupError) {
        return res.status(500).json({
          error: 'Unable to generate receipt number'
        })
      }

      let highestNumber = -1
      for (const existing of existingReceipts || []) {
        const match = String(existing.receipt_number || '').match(/^(\d{5})-(\d{4})$/)
        if (match) {
          const numericValue = Number(match[1]) * 10000 + Number(match[2])
          if (numericValue > highestNumber) highestNumber = numericValue
        }
      }

      const nextNumber = highestNumber + 1
      if (nextNumber > 999999999) {
        return res.status(409).json({
          error: 'Receipt number limit has been reached'
        })
      }

      finalReceiptNumber =
        String(Math.floor(nextNumber / 10000)).padStart(5, '0') +
        '-' +
        String(nextNumber % 10000).padStart(4, '0')
    }

    // ==========================================
    // REISSUANCE AFTER A PROPERTY RETURN
    // ==========================================
    if (transaction_type === 'Reissuance') {
      if (!return_id || !issued_to) return res.status(400).json({ error: 'Select the returned property and its new accountable employee.' })
      if (condition_after_reissue !== 'Serviceable') return res.status(400).json({ error: 'Only inspected Serviceable properties can be reissued.' })

      const { data: returnRecord, error: returnError } = await supabase
        .from('item_returns')
        .select('id, item_id, property_receipt_id, reissued_receipt_id, return_purpose')
        .eq('id', return_id)
        .maybeSingle()

      if (returnError) return res.status(500).json({ error: returnError.message })
      if (!returnRecord) return res.status(404).json({ error: 'Return record not found.' })
      if (returnRecord.reissued_receipt_id) return res.status(409).json({ error: 'This returned property has already been reissued.' })
      if (returnRecord.return_purpose === 'Disposal') return res.status(400).json({ error: 'A property marked for disposal cannot be reissued.' })

      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, description, property_number, cost, condition, status, accountable_employee, office_name, responsibility_center')
        .eq('id', returnRecord.item_id)
        .single()

      if (itemError || !item) return res.status(404).json({ error: 'Returned property not found.' })
      if (item.status !== 'Returned') return res.status(409).json({ error: 'This property is no longer available for reissuance.' })

      const { data: oldReceipt, error: oldReceiptError } = await supabase
        .from('property_receipts')
        .select('id, quantity')
        .eq('id', returnRecord.property_receipt_id)
        .single()

      if (oldReceiptError || !oldReceipt) return res.status(404).json({ error: 'The previous PAR/ICS receipt could not be found.' })

      const { data: employee, error: employeeError } = await supabase
        .from('users')
        .select('id, full_name, office_id')
        .eq('id', issued_to)
        .single()

      if (employeeError || !employee) return res.status(404).json({ error: 'The selected employee could not be found.' })

      const { data: office, error: officeError } = employee.office_id
        ? await supabase.from('offices').select('office_name').eq('id', employee.office_id).maybeSingle()
        : { data: null, error: null }
      if (officeError) return res.status(500).json({ error: officeError.message })

      const reissueReceiptType = Number(item.cost || 0) >= 50000 ? 'PAR' : 'ICS'
      const { data: newReceipt, error: createError } = await supabase
        .from('property_receipts')
        .insert([{
          item_id: item.id,
          receipt_type: reissueReceiptType,
          transaction_type: 'Reissuance',
          receipt_number: String(finalReceiptNumber).trim(),
          issued_to: employee.id,
          quantity: Number(oldReceipt.quantity) || 1,
          date_issued: date_issued || new Date().toISOString().split('T')[0],
          remarks: remarks || 'Reissued after return to GSU.',
          status: 'Issued'
        }])
        .select()
        .single()

      if (createError) return res.status(500).json({ error: createError.message })

      const { data: updatedItem, error: updateItemError } = await supabase
        .from('items')
        .update({
          condition: 'Serviceable',
          status: 'Issued',
          accountable_employee: employee.full_name,
          office_name: office?.office_name || item.office_name,
          responsibility_center: office?.office_name || item.responsibility_center
        })
        .eq('id', item.id)
        .eq('status', 'Returned')
        .select()
        .maybeSingle()

      if (updateItemError || !updatedItem) {
        await supabase.from('property_receipts').delete().eq('id', newReceipt.id)
        return res.status(updateItemError ? 500 : 409).json({
          error: updateItemError?.message || 'The property status changed before reissuance could be completed.'
        })
      }

      const { data: linkedReturn, error: linkError } = await supabase
        .from('item_returns')
        .update({ reissued_receipt_id: newReceipt.id })
        .eq('id', returnRecord.id)
        .is('reissued_receipt_id', null)
        .select()
        .maybeSingle()

      if (linkError || !linkedReturn) {
        await supabase.from('items').update({
          condition: item.condition,
          status: item.status,
          accountable_employee: item.accountable_employee,
          office_name: item.office_name,
          responsibility_center: item.responsibility_center
        }).eq('id', item.id)
        await supabase.from('property_receipts').delete().eq('id', newReceipt.id)
        return res.status(linkError ? 500 : 409).json({
          error: linkError?.message || 'This return record was already reissued.'
        })
      }

      await createAuditLog(
        'Reissued',
        item.id,
        JSON.stringify({ status: item.status, condition: item.condition, accountable_employee: item.accountable_employee }),
        JSON.stringify({ status: 'Issued', condition: 'Serviceable', accountable_employee: employee.full_name, receipt_number: newReceipt.receipt_number, transaction_type: 'Reissuance' }),
        'Reissued returned property to ' + employee.full_name,
        req.profile?.id
      )

      return res.status(201).json({
        message: 'Returned property reissued successfully.',
        receipt: newReceipt,
        item: updatedItem,
        return_record: linkedReturn
      })
    }

    // ==========================================
    // RECEIPT FOR ASSIGNED PROPERTY
    // ==========================================
    if (item_id) {
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, description, property_number, quantity, status, accountable_employee')
        .eq('id', item_id)
        .single()

      if (itemError || !item) {
        return res.status(404).json({
          error: 'Property not found'
        })
      }

      if (
        String(item.status || '').trim().toLowerCase() !== 'issued' ||
        !String(item.accountable_employee || '').trim()
      ) {
        return res.status(400).json({
          error: 'Only issued properties with an accountable employee can receive an acquisition receipt'
        })
      }

      const { data: existingReceipt, error: existingError } = await supabase
        .from('property_receipts')
        .select('id')
        .eq('item_id', item_id)
        .limit(1)
        .maybeSingle()

      if (existingError) {
        return res.status(500).json({
          error: existingError.message
        })
      }

      if (existingReceipt) {
        return res.status(409).json({
          error: 'This property already has a receipt'
        })
      }

      const { data: recipients, error: recipientError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('full_name', item.accountable_employee)
        .limit(2)

      if (recipientError) {
        return res.status(500).json({
          error: recipientError.message
        })
      }

      if (!recipients?.length) {
        return res.status(400).json({
          error: 'The accountable employee is not a system user. Select a registered user when adding the property.'
        })
      }

      if (recipients.length > 1) {
        return res.status(409).json({
          error: 'More than one user matches the accountable employee. Resolve the duplicate user names before creating a receipt.'
        })
      }

      const recipient = recipients[0]

      const { data: receipt, error: receiptError } = await supabase
        .from('property_receipts')
        .insert([{
          item_id,
          transaction_type: 'Acquisition',
          receipt_type,
          receipt_number: String(finalReceiptNumber).trim(),
          issued_to: recipient.id,
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

      try {
        await createAuditLog(
          'Issued',
          item_id,
          JSON.stringify({
            description: item.description,
            property_number: item.property_number,
            status: item.status,
            accountable_employee: item.accountable_employee
          }),
          JSON.stringify({
            description: item.description,
            property_number: item.property_number,
            receipt_number: receipt.receipt_number,
            receipt_type,
            accountable_employee: recipient.full_name,
            from_employee: 'Property Office',
            to_employee: recipient.full_name,
            quantity: 1,
            old_quantity: item.quantity,
            new_quantity: item.quantity,
            status: item.status
          }),
          `Created ${receipt_type} receipt ${receipt.receipt_number} for ${item.description}`,
          req.profile?.id
        )
      } catch (auditError) {
        console.log('Audit log error:', auditError)
      }

      return res.status(201).json({
        message: 'Receipt created successfully',
        receipt,
        item
      })
    }

    // ==========================================
    // RECEIPT FOR APPROVED ITEM REQUEST
    // ==========================================
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

    if (Number(request.quantity) !== 1) {
      return res.status(400).json({
        error: 'Each item request must have a quantity of 1. Please update the request first.'
      })
    }

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

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id, description, property_number, status, condition,
        accountable_employee, quantity
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

    if (item.status !== 'Assigned') {
      return res.status(400).json({
        error: `This item cannot be issued. Current status: ${item.status}`
      })
    }

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

    const quantityToIssue = 1
    const remainingQuantity = availableQuantity - quantityToIssue

    const newStatus = remainingQuantity > 0
      ? 'Assigned'
      : 'Issued'

    const newAccountableEmployee = remainingQuantity === 0
      ? recipient.full_name
      : null

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .insert([{
        item_id: request.item_id,
        item_request_id,
        receipt_type,
        receipt_number: String(finalReceiptNumber).trim(),
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

    try {
      await createAuditLog(
        'Issued',
        request.item_id,
        JSON.stringify({
          description: item.description,
          property_number: item.property_number,
          status: item.status,
          quantity: availableQuantity,
          accountable_employee: item.accountable_employee,
          request_status: request.status
        }),
        JSON.stringify({
          description: item.description,
          property_number: item.property_number,
          receipt_number: receipt.receipt_number,
          receipt_type,
          accountable_employee: recipient.full_name,
          from_employee: 'Property Office',
          to_employee: recipient.full_name,
          quantity: 1,
          old_quantity: availableQuantity,
          new_quantity: remainingQuantity,
          status: newStatus,
          request_status: 'Delivered'
        }),
        `Created ${receipt_type} receipt ${receipt.receipt_number} for ${item.description}`,
        req.profile?.id
      )
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

// ==========================================
// UPDATE RECEIPT DETAILS
// ==========================================
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
      await createAuditLog(
        'Updated',
        existingReceipt.item_id,
        JSON.stringify({
          receipt_number: existingReceipt.receipt_number,
          receipt_type: existingReceipt.receipt_type,
          date_issued: existingReceipt.date_issued,
          remarks: existingReceipt.remarks,
          status: existingReceipt.status
        }),
        JSON.stringify({
          receipt_number: updatedReceipt.receipt_number,
          receipt_type: updatedReceipt.receipt_type,
          date_issued: updatedReceipt.date_issued,
          remarks: updatedReceipt.remarks,
          status: updatedReceipt.status
        }),
        `Updated receipt ${updatedReceipt.receipt_number}`,
        req.profile?.id
      )
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

// ==========================================
// DELETE RECEIPT AND RESTORE STOCK
// ==========================================
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

    // Keep receipt history intact. A receipt linked to a return,
    // a return request, or a transfer must not be deleted.
    const linkedChecks = [
      { table: 'item_returns', label: 'a recorded property return' },
      { table: 'return_requests', label: 'a property return request' },
      { table: 'item_transfers', label: 'a property transfer' }
    ]

    const blockingRecords = []

    for (const check of linkedChecks) {
      const { data: linkedRows, error: linkedError } = await supabase
        .from(check.table)
        .select('id')
        .eq('property_receipt_id', receipt.id)
        .limit(1)

      if (linkedError) {
        console.error(`Receipt deletion reference check failed for ${check.table}:`, linkedError)
        return res.status(500).json({
          error: `Unable to verify whether this receipt has ${check.label}. Receipt was not deleted.`,
          details: linkedError.message
        })
      }

      if (linkedRows && linkedRows.length > 0) {
        blockingRecords.push(check.label)
      }
    }

    if (blockingRecords.length > 0) {
      return res.status(409).json({
        error: `This receipt cannot be deleted because it has ${blockingRecords.join(', ')}. Keep the receipt to preserve its history.`,
        blocked_by: blockingRecords
      })
    }

    let item = null

    if (receipt.item_id && receipt.item_request_id) {
      const { data, error } = await supabase
        .from('items')
        .select('id, description, property_number, quantity, status, accountable_employee')
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
          status: 'Returned',
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

      console.error('Receipt deletion failed:', deleteError)
      return res.status(500).json({
        error: 'The receipt could not be deleted. Inventory changes were rolled back where possible.',
        details: deleteError.message,
        code: deleteError.code
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
      await createAuditLog(
        'Deleted',
        receipt.item_id,
        JSON.stringify({
          description: receipt.item_id ? item?.description : null,
          property_number: item?.property_number,
          receipt_number: receipt.receipt_number,
          receipt_type: receipt.receipt_type,
          quantity: receipt.quantity,
          date_issued: receipt.date_issued,
          status: receipt.status,
          inventory_quantity: item?.quantity,
          inventory_status: item?.status,
          accountable_employee: item?.accountable_employee,
          request_status: receipt.item_request_id ? 'Delivered' : null
        }),
        JSON.stringify({
          description: item?.description,
          property_number: item?.property_number,
          inventory_quantity: item
            ? Number(item.quantity || 0) + Number(receipt.quantity)
            : null,
          inventory_status: item ? 'Returned' : null,
          accountable_employee: item ? null : undefined,
          request_status: receipt.item_request_id ? 'Approved' : null
        }),
        `Deleted receipt ${receipt.receipt_number}`,
        req.profile?.id
      )
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
