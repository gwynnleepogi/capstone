const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireAuth, requireRole } = require('../middleware/auth')

router.get('/', requireAuth, requireRole('Administrator'), async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      office_id,
      created_at,
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

router.post('/', requireAuth, requireRole('Administrator'), async (req, res) => {
  const {
    full_name,
    email,
    password,
    role,
    office_id
  } = req.body

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({
      error: 'Full name, email, password, and role are required'
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    })
  }

  const allowedRoles = [
    'Personnel',
    'Teacher',
    'Non-Teaching Staff'
  ]

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid role'
    })
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

  if (authError || !authData.user) {
    console.log(authError)

    return res.status(400).json({
      error: authError?.message || 'Failed to create account'
    })
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        auth_user_id: authData.user.id,
        full_name: full_name,
        email: email,
        role: role,
        office_id: office_id || null
      }
    ])
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      office_id,
      created_at,
      offices (
        office_name
      )
    `)
    .single()

  if (error) {
    console.log(error)

    await supabase.auth.admin.deleteUser(
      authData.user.id
    )

    return res.status(400).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Created',
    null,
    null,
    JSON.stringify(data),
    'Created personnel: ' + data.full_name,
    req.profile.id
  )

  res.status(201).json({
    message: 'Personnel account created successfully',
    data: data
  })
})

router.put('/:id', requireAuth, requireRole('Administrator'), async (req, res) => {
  const {
    full_name,
    email,
    role,
    office_id
  } = req.body

  if (!full_name || !email || !role) {
    return res.status(400).json({
      error: 'Full name, email, and role are required'
    })
  }

  const allowedRoles = [
    'Personnel',
    'Teacher',
    'Non-Teaching Staff'
  ]

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid role'
    })
  }

  const { data: oldData, error: oldError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError || !oldData) {
    return res.status(404).json({
      error: 'Personnel not found'
    })
  }

  if (oldData.auth_user_id && oldData.email !== email) {
    const { error: authError } =
      await supabase.auth.admin.updateUserById(
        oldData.auth_user_id,
        {
          email: email
        }
      )

    if (authError) {
      console.log(authError)

      return res.status(400).json({
        error: authError.message
      })
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: full_name,
      email: email,
      role: role,
      office_id: office_id || null
    })
    .eq('id', req.params.id)
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      office_id,
      created_at,
      offices (
        office_name
      )
    `)
    .single()

  if (error) {
    console.log(error)

    return res.status(400).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Updated',
    null,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated personnel: ' + data.full_name,
    req.profile.id
  )

  res.json({
    message: 'Personnel updated successfully',
    data: data
  })
})

router.delete('/:id', requireAuth, requireRole('Administrator'), async (req, res) => {
  const { data: oldData, error: oldError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError || !oldData) {
    return res.status(404).json({
      error: 'Personnel not found'
    })
  }

  if (oldData.auth_user_id) {
    const { error: authError } =
      await supabase.auth.admin.deleteUser(
        oldData.auth_user_id
      )

    if (authError) {
      console.log(authError)

      return res.status(400).json({
        error: authError.message
      })
    }
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
    null,
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