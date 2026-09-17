const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')


// GET ITEMS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('items')
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


// ADD ITEM

router.post('/', async (req, res) => {

  const {
    property_number,
    description,
    serial_number,
    supplier_id,
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
    serial_number,
    supplier_id,
    cost,
    acquisition_date,
    classification,
    condition,
    accountable_employee,
    responsibility_center,
    status: status || 'Available'
    }]).select().single()

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
    'Added item: ' + data.description,
    req.profile.id
  )


  res.status(201).json(data)

})


// UPDATE ITEM

router.put('/:id', async (req, res) => {

  const {
    property_number,
    description,
    serial_number,
    supplier_id,
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

    return res.status(404).json({
      error: 'Item not found'
    })

  }


  const { data, error } = await supabase
    .from('items')
    .update({
    property_number,
    description,
    serial_number,
    supplier_id,
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

    return res.status(500).json({
      error: error.message
    })

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

// DELETE ITEM
router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('items')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {
    console.log(oldError)

    return res.status(404).json({
      error: 'Item not found'
    })

  }


  const { error } = await supabase
    .from('items')
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
    'Deleted item: ' + oldData.description,
    req.profile.id
  )


  res.json({
    message: 'Item deleted successfully'
  })

})


module.exports = router