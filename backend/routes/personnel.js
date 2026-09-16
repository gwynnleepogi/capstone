const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireFields } = require('../middleware/auth')


// GET PERSONNEL

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      offices (
        office_name
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


// ADD PERSONNEL

router.post('/', async (req, res) => {

  if (!requireFields(req, res, ['full_name', 'username', 'email', 'role'])) {
    return
  }

  const {
    full_name,
    username,
    email,
    role,
    office_id
  } = req.body

  const { data, error } = await supabase
    .from('users')
    .insert([{
      full_name,
      username,
      email,
      role,
      office_id
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
    'Added personnel: ' + data.full_name,
    req.profile.id
  )

  res.status(201).json(data)
})


// UPDATE PERSONNEL

router.put('/:id', async (req, res) => {

  const {
    full_name,
    username,
    email,
    role,
    office_id
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Personnel not found'
    })
  }


  const { data, error } = await supabase
    .from('users')
    .update({
      full_name,
      username,
      email,
      role,
      office_id
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
    'Updated personnel: ' + data.full_name,
    req.profile.id
  )

  res.json(data)
})


// DELETE PERSONNEL

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Personnel not found'
    })
  }


  const { error } = await supabase
    .from('users')
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
    'Deleted personnel: ' + oldData.full_name,
    req.profile.id
  )

  res.json({
    message: 'Personnel deleted successfully'
  })
})


module.exports = router