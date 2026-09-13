const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.post('/login', async (req, res) => {
  const { email, password } = req.body

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

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: profile,
    role: profile.role
  })
})

module.exports = router
