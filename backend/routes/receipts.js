
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
          id,
          property_number,
          description,
          serial_number,
          cost,
          acquisition_date,
          status,
          accountable_employee
        ),
        users (
          id,
          full_name
        ),
        item_requests (
          id,
          request_number,
          item_description,
          purpose,
          status,
          requested_by,
          office_id,
          users (
            id,
            full_name
          ),
          offices (
            id,
            office_name
          )
        )
      `)
      .order('created_at', {
        ascending: false
      })

    if (error) {
      return res.status(500).json({
        error: error.message
      })
    }

    res.json(data || [])
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load receipts'
    })
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
          id,
          property_number,
          description,
          serial_number,
          cost,
          acquisition_date,
          status,
          accountable_employee
        ),
        users (
          id,
          full_name
        ),
        item_requests (
          id,
          request_number,
          item_description,
          purpose,
          status,
          requested_by,
          office_id,
          users (
            id,
            full_name
          ),
          offices (
            id,
            office_name
          )
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) {
      return res.status(404).json({
        error: 'Receipt not found'
      })
    }

    res.json(data)
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load receipt'
    })
  }
})


// CREATE RECEIPT

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

    if (!receipt_type) {
      return res.status(400).json({
        error: 'Receipt type is required'
      })
    }

    if (
      receipt_type !== 'PAR' &&
      receipt_type !== 'ICS'
    ) {
      return res.status(400).json({
        error: 'Receipt type must be PAR or ICS'
      })
    }

    if (!receipt_number) {
      return res.status(400).json({
        error: 'Receipt number is required'
      })
    }


    // GET ITEM REQUEST

    const {
      data: request,
      error: requestError
    } = await supabase
      .from('item_requests')
      .select(`
        *,
        users (
          id,
          full_name
        )
      `)
      .eq('id', item_request_id)
      .single()

    if (requestError || !request) {
      return res.status(404).json({
        error: 'Item request not found'
      })
    }


    // CHECK REQUEST STATUS

    if (request.status !== 'Approved') {
      return res.status(400).json({
        error: 'Only approved requests can be issued'
      })
    }


    // CHECK REQUEST ITEM

    if (!request.item_id) {
      return res.status(400).json({
        error: 'This request does not have an assigned item'
      })
    }


    // CHECK REQUESTED PERSON

    if (!request.requested_by) {
      return res.status(400).json({
        error: 'This request does not have a recipient'
      })
    }


    // CHECK DUPLICATE RECEIPT

    const {
      data: existingReceipt,
      error: existingReceiptError
    } = await supabase
      .from('property_receipts')
      .select('id')
      .eq('item_request_id', item_request_id)
      .maybeSingle()

    if (existingReceiptError) {
      return res.status(500).json({
        error: existingReceiptError.message
      })
    }

    if (existingReceipt) {
      return res.status(400).json({
        error: 'This item request already has a receipt'
      })
    }


    // GET ITEM

    const {
      data: item,
      error: itemError
    } = await supabase
      .from('items')
      .select(`
        id,
        description,
        status,
        accountable_employee
      `)
      .eq('id', request.item_id)
      .single()

    if (itemError || !item) {
      return res.status(404).json({
        error: 'Item not found'
      })
    }


    // CHECK ITEM STATUS

    if (item.status !== 'Available') {
      return res.status(400).json({
        error: `This item is not available. Current status: ${item.status}`
      })
    }


    // GET RECIPIENT NAME

    const {
      data: recipient,
      error: recipientError
    } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', request.requested_by)
      .single()

    if (recipientError || !recipient) {
      return res.status(404).json({
        error: 'Recipient not found'
      })
    }


    // CREATE RECEIPT

    const {
      data: receipt,
      error: receiptError
    } = await supabase
      .from('property_receipts')
      .insert([
        {
          item_id: request.item_id,
          item_request_id: item_request_id,
          receipt_type: receipt_type,
          receipt_number: receipt_number,
          issued_to: request.requested_by,
          date_issued: date_issued || new Date()
            .toISOString()
            .split('T')[0],
          remarks: remarks || null
        }
      ])
      .select()
      .single()

    if (receiptError) {
      return res.status(500).json({
        error: receiptError.message
      })
    }


    // UPDATE ITEM

    const {
      data: updatedItem,
      error: updateItemError
    } = await supabase
      .from('items')
      .update({
        status: 'Issued',
        accountable_employee: recipient.full_name
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


    // UPDATE REQUEST

    const {
      error: updateRequestError
    } = await supabase
      .from('item_requests')
      .update({
        status: 'Delivered'
      })
      .eq('id', item_request_id)

    if (updateRequestError) {
      await supabase
        .from('items')
        .update({
          status: item.status,
          accountable_employee: item.accountable_employee
        })
        .eq('id', request.item_id)

      await supabase
        .from('property_receipts')
        .delete()
        .eq('id', receipt.id)

      return res.status(500).json({
        error: updateRequestError.message
      })
    }


    // AUDIT LOG

    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: request.item_id,
        action: 'CREATE',
        old_value: null,
        new_value: JSON.stringify({
          receipt_id: receipt.id,
          item_request_id: item_request_id,
          status: 'Issued'
        }),
        description: `Created receipt ${receipt_number} for ${item.description}`,
        record_id: receipt.id
      })
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }


    res.status(201).json({
      message: 'Receipt created successfully',
      receipt: receipt,
      item: updatedItem
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to create receipt'
    })
  }
})


// UPDATE RECEIPT

router.put('/:id', async (req, res) => {
  try {
    const {
      receipt_type,
      receipt_number,
      date_issued,
      remarks
    } = req.body

    if (!receipt_type) {
      return res.status(400).json({
        error: 'Receipt type is required'
      })
    }

    if (
      receipt_type !== 'PAR' &&
      receipt_type !== 'ICS'
    ) {
      return res.status(400).json({
        error: 'Receipt type must be PAR or ICS'
      })
    }

    if (!receipt_number) {
      return res.status(400).json({
        error: 'Receipt number is required'
      })
    }


    // GET EXISTING RECEIPT

    const {
      data: existingReceipt,
      error: existingReceiptError
    } = await supabase
      .from('property_receipts')
      .select(`
        *,
        items (
          id,
          description,
          status,
          accountable_employee
        ),
        item_requests (
          id,
          status
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (existingReceiptError || !existingReceipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      })
    }


    // UPDATE RECEIPT

    const {
      data: updatedReceipt,
      error: updateReceiptError
    } = await supabase
      .from('property_receipts')
      .update({
        receipt_type: receipt_type,
        receipt_number: receipt_number,
        date_issued: date_issued || null,
        remarks: remarks || null
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateReceiptError) {
      return res.status(500).json({
        error: updateReceiptError.message
      })
    }


    // AUDIT LOG

    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: existingReceipt.item_id,
        action: 'UPDATE',
        old_value: JSON.stringify({
          receipt_type: existingReceipt.receipt_type,
          receipt_number: existingReceipt.receipt_number,
          date_issued: existingReceipt.date_issued,
          remarks: existingReceipt.remarks
        }),
        new_value: JSON.stringify({
          receipt_type: receipt_type,
          receipt_number: receipt_number,
          date_issued: date_issued,
          remarks: remarks
        }),
        description: `Updated receipt ${receipt_number}`,
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


// DELETE RECEIPT

router.delete('/:id', async (req, res) => {
  try {
    // GET EXISTING RECEIPT

    const {
      data: existingReceipt,
      error: existingReceiptError
    } = await supabase
      .from('property_receipts')
      .select(`
        *,
        items (
          id,
          description,
          status,
          accountable_employee
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (existingReceiptError || !existingReceipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      })
    }


    // DELETE RECEIPT

    const {
      error: deleteError
    } = await supabase
      .from('property_receipts')
      .delete()
      .eq('id', req.params.id)

    if (deleteError) {
      return res.status(500).json({
        error: deleteError.message
      })
    }


    // RESTORE ITEM

    if (existingReceipt.item_id) {
      const {
        error: restoreItemError
      } = await supabase
        .from('items')
        .update({
          status: 'Available',
          accountable_employee: null
        })
        .eq('id', existingReceipt.item_id)

      if (restoreItemError) {
        console.log(
          'Item restore error:',
          restoreItemError.message
        )
      }
    }


    // RESTORE REQUEST

    if (existingReceipt.item_request_id) {
      const {
        error: restoreRequestError
      } = await supabase
        .from('item_requests')
        .update({
          status: 'Approved'
        })
        .eq('id', existingReceipt.item_request_id)

      if (restoreRequestError) {
        console.log(
          'Request restore error:',
          restoreRequestError.message
        )
      }
    }


    // AUDIT LOG

    try {
      await createAuditLog({
        user_id: req.profile?.id || null,
        item_id: existingReceipt.item_id,
        action: 'DELETE',
        old_value: JSON.stringify({
          receipt_id: existingReceipt.id,
          receipt_number: existingReceipt.receipt_number
        }),
        new_value: null,
        description: `Deleted receipt ${existingReceipt.receipt_number}`,
        record_id: existingReceipt.id
      })
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }


    res.json({
      message: 'Receipt deleted successfully'
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to delete receipt'
    })
  }
})


module.exports = router