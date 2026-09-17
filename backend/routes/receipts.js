const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

// GET RECEIPTS
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('property_receipts')
    .select(`
      *,
      items (
        description,
        property_number,
        serial_number,
        acquisition_date,
        cost
      ),
      users (
        full_name
      ),
      item_requests (
        request_number,
        item_description,
        status
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  res.json(data)
})

// ADD RECEIPT
router.post('/', async (req, res) => {
  const {
    item_id,
    item_request_id,
    receipt_type,
    receipt_number,
    issued_to,
    date_issued,
    remarks
  } = req.body

  if (!item_request_id) {
    return res.status(400).json({
      error: 'An approved or delivered item request is required'
    })
  }

  const { data: request, error: requestError } = await supabase
    .from('item_requests')
    .select('*')
    .eq('id', item_request_id)
    .single()

  if (requestError || !request) {
    return res.status(404).json({
      error: 'Item request not found'
    })
  }

  if (
    request.status !== 'Approved' &&
    request.status !== 'Delivered'
  ) {
    return res.status(400).json({
      error: 'Only approved or delivered item requests can have a receipt'
    })
  }

  const { data: existingReceipt } = await supabase
    .from('property_receipts')
    .select('id')
    .eq('item_request_id', item_request_id)
    .maybeSingle()

  if (existingReceipt) {
    return res.status(400).json({
      error: 'This item request already has a receipt'
    })
  }

  const { data, error } = await supabase
    .from('property_receipts')
    .insert([{
      item_id,
      item_request_id,
      receipt_type,
      receipt_number,
      issued_to,
      date_issued,
      remarks
    }])
    .select()
    .single()

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Created',
    data.id,
    null,
    JSON.stringify(data),
    'Added receipt: ' + data.receipt_number
  )

  res.status(201).json(data)
})

// UPDATE RECEIPT
router.put('/:id', async (req, res) => {
  const {
    item_id,
    item_request_id,
    receipt_type,
    receipt_number,
    issued_to,
    date_issued,
    remarks
  } = req.body

  const { data: oldData, error: oldError } = await supabase
    .from('property_receipts')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {
    console.log(oldError)

    return res.status(404).json({
      error: 'Receipt not found'
    })
  }

  if (item_request_id) {
    const { data: request, error: requestError } = await supabase
      .from('item_requests')
      .select('*')
      .eq('id', item_request_id)
      .single()

    if (requestError || !request) {
      return res.status(404).json({
        error: 'Item request not found'
      })
    }

    if (
      request.status !== 'Approved' &&
      request.status !== 'Delivered'
    ) {
      return res.status(400).json({
        error: 'Only approved or delivered item requests can have a receipt'
      })
    }

    const { data: existingReceipt } = await supabase
      .from('property_receipts')
      .select('id')
      .eq('item_request_id', item_request_id)
      .neq('id', req.params.id)
      .maybeSingle()

    if (existingReceipt) {
      return res.status(400).json({
        error: 'This item request already has a receipt'
      })
    }
  }

  const { data, error } = await supabase
    .from('property_receipts')
    .update({
      item_id,
      item_request_id: item_request_id || null,
      receipt_type,
      receipt_number,
      issued_to,
      date_issued,
      remarks
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Updated',
    data.id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated receipt: ' + data.receipt_number
  )

  res.json(data)
})

// DELETE RECEIPT
router.delete('/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase
    .from('property_receipts')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {
    console.log(oldError)

    return res.status(404).json({
      error: 'Receipt not found'
    })
  }

  const { error } = await supabase
    .from('property_receipts')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Deleted',
    req.params.id,
    JSON.stringify(oldData),
    null,
    'Deleted receipt: ' + oldData.receipt_number
  )

  res.json({
    message: 'Receipt deleted successfully'
  })
})

module.exports = router