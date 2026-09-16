const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireFields } = require('../middleware/auth')


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
        accountable_employee,
        responsibility_center,
        cost,
        price,
        acquisition_date,
        date_of_purchase,
        suppliers (
          supplier_name
        )
      ),
      users (
        full_name
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

  if (!requireFields(req, res, ['item_id', 'receipt_type', 'receipt_number'])) {
    return
  }

  const {
    item_id,
    receipt_type,
    receipt_number,
    issued_to,
    date_issued,
    remarks
  } = req.body

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id')
    .eq('id', item_id)
    .single()

  if (itemError || !item) {
    return res.status(400).json({
      error: 'Please select an item that exists in the Items list'
    })
  }

  const { data, error } = await supabase
    .from('property_receipts')
    .insert([{
      item_id,
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

  createAuditLog(
    'Created',
    data.item_id,
    null,
    JSON.stringify(data),
    'Added receipt: ' + data.receipt_number
  ).catch(error => {
    console.log('Audit log error:', error)
  })

  res.status(201).json(data)
})


// UPDATE RECEIPT

router.put('/:id', async (req, res) => {

  const {
    item_id,
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

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id')
    .eq('id', item_id)
    .single()

  if (itemError || !item) {
    return res.status(400).json({
      error: 'Please select an item that exists in the Items list'
    })
  }

  const { data, error } = await supabase
    .from('property_receipts')
    .update({
      item_id,
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

  res.json(data)

  createAuditLog(
    'Updated',
    data.item_id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated receipt: ' + data.receipt_number
  ).catch(error => {
    console.log('Audit log error:', error)
  })
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

  createAuditLog(
    'Deleted',
    oldData.item_id,
    JSON.stringify(oldData),
    null,
    'Deleted receipt: ' + oldData.receipt_number
  ).catch(error => {
    console.log('Audit log error:', error)
  })

  res.json({
    message: 'Receipt deleted successfully'
  })
})


module.exports = router

