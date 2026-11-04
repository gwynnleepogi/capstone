const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const supabase = require('../supabase')
const {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
} = require('../supabaseAdmin')
const { accountRoles, normalizeDepartment } = require('../accountFields')

const accountRequestsMigrationError =
  'Account registration is not configured yet. Run backend/sql/account-creation-requests.sql in the Supabase SQL Editor.'

router.get('/signup-offices', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('id, office_name')
    .order('office_name', { ascending: true })

  if (error) {
    console.error('Signup office lookup failed:', error)
    return res.status(500).json({ error: 'Unable to load offices' })
  }

  res.json(data)
})

router.get('/signup-job-titles', async (req, res) => {
  const { role } = req.query

  if (!accountRoles.includes(role)) {
    return res.status(400).json({ error: 'Select a valid personnel type' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('job_title')
    .eq('role', role)
    .not('job_title', 'is', null)

  if (error) {
    console.error('Approved signup title lookup failed:', error)
    return res.status(500).json({ error: 'Unable to load approved job titles' })
  }

  const titles = [...new Set(
    data.map(user => String(user.job_title || '').trim()).filter(Boolean)
  )].sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: 'base' })
  )

  res.json(titles)
})

router.post('/signup', async (req, res) => {
  const { employee_id, full_name, email, role, department, job_title } = req.body
  const selectedDepartment = normalizeDepartment(department)
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedEmployeeId = String(employee_id || '').trim()
  const normalizedName = String(full_name || '').trim()
  const normalizedJobTitle = String(job_title || '').trim()

  if (
    !normalizedEmployeeId ||
    !normalizedName ||
    !normalizedEmail ||
    !selectedDepartment ||
    !normalizedJobTitle ||
    !role
  ) {
    return res.status(400).json({ error: 'All signup fields are required' })
  }

  if (normalizedJobTitle.length > 120) {
    return res.status(400).json({ error: 'Job title must be 120 characters or fewer' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address' })
  }

  if (!accountRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('employee_id', normalizedEmployeeId)
    .maybeSingle()

  if (existingUserError) {
    console.error('Account signup user lookup failed:', existingUserError)
    return res.status(503).json({ error: accountRequestsMigrationError })
  }

  if (existingUser) {
    return res.status(409).json({ error: 'This employee ID already has an account' })
  }

  const password = crypto.randomBytes(24).toString('base64url') + 'A1!'
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { must_change_password: true }
    })

  if (authError || !authData.user) {
    return res.status(isAdminAuthorizationError(authError) ? 503 : 400).json({
      error: isAdminAuthorizationError(authError)
        ? adminCredentialsError
        : authError?.message || 'Unable to submit account request'
    })
  }

  const { error: requestError } = await supabaseAdmin
    .from('account_requests')
    .insert({
      auth_user_id: authData.user.id,
      employee_id: normalizedEmployeeId,
      full_name: normalizedName,
      email: normalizedEmail,
      role,
      department: selectedDepartment,
      job_title: normalizedJobTitle,
      status: 'pending'
  })

  if (requestError) {
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

    if (deleteError) {
      console.error('Could not remove auth user after failed signup request:', deleteError)
      return res.status(503).json({
        error: 'Your request could not be saved and the temporary sign-in record could not be removed. Contact an administrator before trying again.'
      })
    }

    if (requestError.code === '23505') {
      return res.status(409).json({
        error: 'An account request with this email or employee ID is already pending'
      })
    }

    if (requestError.code === '42P01' || requestError.code === 'PGRST205') {
      return res.status(503).json({ error: accountRequestsMigrationError })
    }

    console.error('Account signup request failed:', requestError)
    return res.status(500).json({ error: requestError.message })
  }

  res.status(201).json({
    message: 'Your account request was submitted. You can sign in after an administrator approves it.',
    temporary_password: password
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
    const supabaseAdmin = getSupabaseAdmin()

    if (supabaseAdmin) {
      const { data: pendingRequest, error: requestError } = await supabaseAdmin
        .from('account_requests')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (requestError) {
        console.error('Pending account request lookup failed:', requestError)
        return res.status(503).json({ error: accountRequestsMigrationError })
      }

      if (pendingRequest) {
        return res.status(403).json({
          error: 'Your account request is awaiting administrator approval.'
        })
      }
    }

    return res.status(403).json({ error: 'This account is not linked to a user profile' })
  }

  if (!['Administrator', 'Teacher', 'Non-Teaching Staff'].includes(profile.role)) {
    return res.status(403).json({
      error: 'This account type is no longer supported. Contact an administrator.'
    })
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
    role: profile.role,
    must_change_password: data.user.user_metadata?.must_change_password === true
  })
})

router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const password = req.body?.password

  if (!token) {
    return res.status(401).json({ error: 'Please log in' })
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid login' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user.id,
    {
      password,
      user_metadata: {
        ...data.user.user_metadata,
        must_change_password: false
      }
    }
  )

  if (updateError) {
    return res.status(isAdminAuthorizationError(updateError) ? 503 : 400).json({
      error: isAdminAuthorizationError(updateError)
        ? adminCredentialsError
        : updateError.message
    })
  }

  res.json({ message: 'Password updated successfully' })
})

module.exports = router