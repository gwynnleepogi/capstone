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
        description
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

  const {
    item_id,
    receipt_type,
    receipt_number,
    issued_to,
    date_issued,
    remarks
  } = req.body

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

  await createAuditLog(
    'Created',
    data.id,
    null,
    JSON.stringify(data),
    'Added receipt: ' + data.receipt_number,
    req.profile.id
  )

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


  await createAuditLog(
    'Updated',
    data.id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated receipt: ' + data.receipt_number,
    req.profile.id
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
    'Deleted receipt: ' + oldData.receipt_number,
    req.profile.id
  )

  res.json({
    message: 'Receipt deleted successfully'
  })
})


module.exports = router