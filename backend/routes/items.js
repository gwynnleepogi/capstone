
const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

function getItemReferenceError(error, operation) {
  if (error.code !== '23503') {
    return null
  }

  if (error.message.includes('item_requests_item_id_fkey')) {
    return operation === 'deleted'
      ? 'This item cannot be deleted because it is linked to existing item requests. Keep the item to preserve request history.'
      : 'This item identifier cannot be changed while item requests refer to it. Other item details can still be edited.'
  }

  return `This item cannot be ${operation} because it is referenced by existing records.`
}

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log(error)
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

router.get('/options', async (req, res) => {
  const { data: personnel, error: personnelError } = await supabase
    .from('users')
    .select('id, full_name, role, office_id')
    .order('full_name', { ascending: true })

  if (personnelError) {
    console.log(personnelError)
    return res.status(500).json({ error: personnelError.message })
  }

  const { data: offices, error: officesError } = await supabase
    .from('offices')
    .select('id, office_name, office_code')
    .order('office_name', { ascending: true })

  if (officesError) {
    console.log(officesError)
    return res.status(500).json({ error: officesError.message })
  }

  res.json({ personnel, offices })
})

router.get('/assigned/:employeeName', async (req, res) => {
  const employeeName = decodeURIComponent(req.params.employeeName)

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .ilike('accountable_employee', employeeName)
    .order('created_at', { ascending: false })

  if (error) {
    console.log(error)
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

router.post('/', async (req, res) => {
  const {
    property_number,
    description,
    quantity,
    unit,
    serial_number,
    cost,
    acquisition_date,
    classification,
    condition,
    status,
    accountable_employee,
    responsibility_center
  } = req.body

  const { data, error } = await supabase
    .from('items')
    .insert([{
      property_number,
      description,
      quantity: Number(quantity ?? 0),
      unit: unit || 'unit',
      serial_number,
      cost,
      acquisition_date,
      classification,
      condition,
      accountable_employee,
      responsibility_center,
      status: status || 'Available'
    }])
    .select()
    .single()

  if (error) {
    console.log(error)
    return res.status(500).json({ error: error.message })
  }

  await createAuditLog(
    'Created',
    data.id,
    null,
    JSON.stringify(data),
    'Added item: ' + data.description,
    req.profile.id
  )

  res.status(201).json(data)
})

router.put('/:id', async (req, res) => {
  const {
    property_number,
    description,
    quantity,
    unit,
    serial_number,
    cost,
    acquisition_date,
    classification,
    condition,
    status,
    accountable_employee,
    responsibility_center
  } = req.body

  const { data: oldData, error: oldError } = await supabase
    .from('items')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {
    console.log(oldError)
    return res.status(404).json({ error: 'Item not found' })
  }

  const { data, error } = await supabase
    .from('items')
    .update({
      property_number,
      description,
      quantity: Number(quantity ?? 0),
      unit: unit || 'unit',
      serial_number,
      cost,
      acquisition_date,
      classification,
      condition,
      status,
      accountable_employee,
      responsibility_center
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    console.log(error)

    const referenceError = getItemReferenceError(error, 'updated')

    if (referenceError) {
      return res.status(409).json({ error: referenceError })
    }

    return res.status(500).json({ error: error.message })
  }

  await createAuditLog(
    'Updated',
    data.id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated item: ' + data.description,
    req.profile.id
  )

  res.json(data)
})

router.delete('/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase
    .from('items')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {
    console.log(oldError)
    return res.status(404).json({ error: 'Item not found' })
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.log(error)

    const referenceError = getItemReferenceError(error, 'deleted')

    if (referenceError) {
      return res.status(409).json({ error: referenceError })
    }

    return res.status(500).json({ error: error.message })
  }

  await createAuditLog(
    'Deleted',
    req.params.id,
    JSON.stringify(oldData),
    null,
    'Deleted item: ' + oldData.description,
    req.profile.id
  )

  res.json({ message: 'Item deleted successfully' })
})

module.exports = router
