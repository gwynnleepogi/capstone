const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireFields } = require('../middleware/auth')


// GET SUPPLIERS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  res.json(data)
})


// ADD SUPPLIER

router.post('/', async (req, res) => {

  if (!requireFields(req, res, ['supplier_name'])) {
    return
  }

  const {
    supplier_name,
    contact_person,
    contact_number,
    email,
    address
  } = req.body

  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      supplier_name,
      contact_person,
      contact_number,
      email,
      address
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
    'Added supplier: ' + data.supplier_name,
    req.profile.id
  )

  res.status(201).json(data)
})


// UPDATE SUPPLIER

router.put('/:id', async (req, res) => {

  const {
    supplier_name,
    contact_person,
    contact_number,
    email,
    address
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Supplier not found'
    })
  }


  const { data, error } = await supabase
    .from('suppliers')
    .update({
      supplier_name,
      contact_person,
      contact_number,
      email,
      address
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
    'Updated supplier: ' + data.supplier_name,
    req.profile.id
  )

  res.json(data)
})


// DELETE SUPPLIER

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Supplier not found'
    })
  }


  const { error } = await supabase
    .from('suppliers')
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
    'Deleted supplier: ' + oldData.supplier_name,
    req.profile.id
  )

  res.json({
    message: 'Supplier deleted successfully'
  })
})


module.exports = router