const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

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

router.post('/signup', async (req, res) => {
  const { full_name, username, email, password, role } = req.body
  const allowedRoles = ['Personnel', 'Teacher', 'Non-Teaching Staff']

  if (!full_name || !username || !email || !password || !role) {
    return res.status(400).json({
      error: 'Full name, username, email, password, and role are required'
    })
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: 'Administrator accounts must be created by an administrator'
    })
  }

  const { data: authData, error: authError } =
    await supabase.auth.signUp({ email, password })

  if (authError || !authData.user) {
    return res.status(400).json({
      error: authError?.message || 'Failed to create account'
    })
  }

  const { error: profileError } = await supabase
    .from('users')
    .insert([{
      full_name,
      username,
      email,
      role,
      auth_user_id: authData.user.id
    }])

  if (profileError) {
    return res.status(400).json({ error: profileError.message })
  }

  res.status(201).json({
    message: authData.session
      ? 'Account created. You can sign in now.'
      : 'Account created. Check your email to confirm it before signing in.'
  })
})

module.exports = router
