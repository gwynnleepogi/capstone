const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireFields } = require('../middleware/auth')


// GET OFFICES

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('offices')
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


// ADD OFFICE

router.post('/', async (req, res) => {

  if (!requireFields(req, res, ['office_name', 'office_code'])) {
    return
  }

  const {
    office_name,
    office_code
  } = req.body

  const { data, error } = await supabase
    .from('offices')
    .insert([{
      office_name,
      office_code
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
    'Added office: ' + data.office_name
  )

  res.status(201).json(data)
})


// UPDATE OFFICE

router.put('/:id', async (req, res) => {

  const {
    office_name,
    office_code
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('offices')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Office not found'
    })
  }


  const { data, error } = await supabase
    .from('offices')
    .update({
      office_name,
      office_code
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
    'Updated office: ' + data.office_name
  )

  res.json(data)
})


// DELETE OFFICE

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('offices')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Office not found'
    })
  }


  const { error } = await supabase
    .from('offices')
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
    'Deleted office: ' + oldData.office_name
  )

  res.json({
    message: 'Office deleted successfully'
  })
})


module.exports = router