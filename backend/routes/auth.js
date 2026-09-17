const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.post('/signup', async (req, res) => {
  const { full_name, email, password, role } = req.body

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'All signup fields are required' })
  }

  const allowedRoles = ['Personnel', 'Teacher', 'Non-Teaching Staff']

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error || !data.user) {
    return res.status(400).json({
      error: error?.message || 'Unable to create account'
    })
  }

  const { error: profileError } = await supabase
    .from('users')
    .insert([{
      auth_user_id: data.user.id,
      full_name,
      email,
      role
    }])

  if (profileError) {
    return res.status(400).json({ error: profileError.message })
  }

  res.status(201).json({
    message: 'Account created successfully. You can now sign in.'
  })
})

router.post('/login', async (req, res) => {
  const { email, password, preferred_role } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    return res.status(403).json({ error: 'This account is not linked to a user profile' })
  }

  if (preferred_role && preferred_role !== profile.role) {
    return res.status(403).json({
      error: `This account is registered as ${profile.role}`
    })
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: profile,
    role: profile.role
  })
})

module.exports = router
