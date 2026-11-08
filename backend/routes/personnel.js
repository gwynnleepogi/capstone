const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
} = require('../supabaseAdmin')
const createAuditLog = require('../middleware/auditLog')
const { requireAuth, requireRole } = require('../middleware/auth')
const { accountRoles, normalizeDepartment } = require('../accountFields')

const accountRequestsMigrationError =
  'Account registration is not configured yet. Run backend/sql/account-creation-requests.sql in the Supabase SQL Editor.'

router.get('/', requireAuth, requireRole('Administrator'), async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      employee_id,
      department,
      job_title,
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

router.get('/account-requests', requireAuth, requireRole('Administrator'), async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data, error } = await supabaseAdmin
    .from('account_requests')
    .select('id, employee_id, full_name, email, role, department, job_title, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Account request list failed:', error)
    return res.status(503).json({ error: accountRequestsMigrationError })
  }

  res.json(data)
})

router.put('/account-requests/:id', requireAuth, requireRole('Administrator'), async (req, res) => {
  const {
    employee_id,
    full_name,
    email,
    role,
    department,
    job_title
  } = req.body
  const normalizedDepartment = normalizeDepartment(department)
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedEmployeeId = String(employee_id || '').trim()
  const normalizedName = String(full_name || '').trim()
  const normalizedJobTitle = String(job_title || '').trim()

  if (
    !normalizedEmployeeId ||
    !normalizedName ||
    !normalizedEmail ||
    !normalizedDepartment ||
    !normalizedJobTitle ||
    !accountRoles.includes(role)
  ) {
    return res.status(400).json({ error: 'All account request fields are required' })
  }

  if (normalizedJobTitle.length > 120) {
    return res.status(400).json({ error: 'Job title must be 120 characters or fewer' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('account_requests')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (requestError) {
    console.error('Account request lookup failed:', requestError)
    return res.status(503).json({ error: accountRequestsMigrationError })
  }

  if (!request) {
    return res.status(404).json({ error: 'Pending account request not found' })
  }

  if (request.email !== normalizedEmail) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      request.auth_user_id,
      { email: normalizedEmail, email_confirm: true }
    )

    if (authError) {
      return res.status(isAdminAuthorizationError(authError) ? 503 : 400).json({
        error: isAdminAuthorizationError(authError)
          ? adminCredentialsError
          : authError.message
      })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('account_requests')
    .update({
      employee_id: normalizedEmployeeId,
      full_name: normalizedName,
      email: normalizedEmail,
      role,
      department: normalizedDepartment,
      job_title: normalizedJobTitle
    })
    .eq('id', request.id)
    .eq('status', 'pending')
    .select('id, employee_id, full_name, email, role, department, job_title, status, created_at')
    .maybeSingle()

  if (error) {
    console.error('Account request update failed:', error)
    if (request.email !== normalizedEmail) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(
          request.auth_user_id,
          { email: request.email, email_confirm: true }
        )

      if (rollbackError) {
        console.error('Account request email rollback failed:', rollbackError)
        return res.status(500).json({
          error: 'The request could not be updated and its email could not be restored. Contact support.'
        })
      }
    }

    return res.status(error.code === '23505' ? 409 : 400).json({
      error: error.code === '23505'
        ? 'Another pending request already uses this email or employee ID'
        : error.message
    })
  }

  if (!data) {
    if (request.email !== normalizedEmail) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(
          request.auth_user_id,
          { email: request.email, email_confirm: true }
        )

      if (rollbackError) {
        console.error('Account request email rollback failed:', rollbackError)
        return res.status(500).json({
          error: 'The request could not be updated and its email could not be restored. Contact support.'
        })
      }
    }

    return res.status(409).json({ error: 'This account request is no longer pending' })
  }

  await createAuditLog(
    'Updated',
    null,
    JSON.stringify({
      employee_id: request.employee_id,
      full_name: request.full_name,
      email: request.email,
      role: request.role,
      department: request.department,
      job_title: request.job_title,
      status: request.status
    }),
    JSON.stringify(data),
    'Updated pending account request for ' + data.full_name,
    req.profile.id
  )

  res.json({ data })
})

router.post('/account-requests/:id/approve', requireAuth, requireRole('Administrator'), async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('account_requests')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (requestError) {
    console.error('Account approval lookup failed:', requestError)
    return res.status(503).json({ error: accountRequestsMigrationError })
  }

  if (!request) {
    return res.status(404).json({ error: 'Pending account request not found' })
  }

  const { data: authAccount, error: authAccountError } =
    await supabaseAdmin.auth.admin.getUserById(request.auth_user_id)

  if (authAccountError || !authAccount.user) {
    return res.status(409).json({
      error: 'The applicant sign-in record is missing. Reject this request and have the applicant submit a new one.'
    })
  }

  const { data: offices, error: officesError } = await supabaseAdmin
    .from('offices')
    .select('id, office_name')

  if (officesError) {
    console.error('Account approval office lookup failed:', officesError)
    return res.status(500).json({ error: 'Unable to find or create the applicant department' })
  }

  let office = offices.find(
    candidate =>
      candidate.office_name?.trim().toLowerCase() ===
      request.department.trim().toLowerCase()
  )

  if (!office) {
    const { data: newOffice, error: officeCreateError } = await supabaseAdmin
      .from('offices')
      .insert({
        office_name: request.department,
        office_code: ''
      })
      .select('id, office_name')
      .single()

    if (officeCreateError) {
      console.error('Account approval office creation failed:', officeCreateError)
      return res.status(500).json({
        error: 'Unable to add the new department. The account request remains pending.'
      })
    }

    office = newOffice
  }

  const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', request.auth_user_id)
    .maybeSingle()

  if (profileLookupError) {
    console.error('Account approval profile lookup failed:', profileLookupError)
    return res.status(500).json({ error: profileLookupError.message })
  }

  let userId = existingProfile?.id

  if (!userId) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: request.auth_user_id,
        employee_id: request.employee_id,
        full_name: request.full_name,
        email: request.email,
        role: request.role,
        department: request.department,
        job_title: request.job_title,
        office_id: office.id
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('Account approval profile creation failed:', profileError)
      return res.status(profileError.code === '23505' ? 409 : 500).json({
        error: profileError.code === '23505'
          ? 'This employee ID or email is already in use'
          : profileError.message
      })
    }

    userId = profile.id
  } else {
    const { error: profileUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        employee_id: request.employee_id,
        full_name: request.full_name,
        email: request.email,
        role: request.role,
        department: request.department,
        job_title: request.job_title,
        office_id: office.id
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('Account approval profile update failed:', profileUpdateError)
      return res.status(profileUpdateError.code === '23505' ? 409 : 500).json({
        error: profileUpdateError.code === '23505'
          ? 'This employee ID or email is already in use'
          : profileUpdateError.message
      })
    }
  }

  const reviewedAt = new Date().toISOString()
  const { data: updatedRequest, error: updateError } = await supabaseAdmin
    .from('account_requests')
    .update({
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: req.profile.id
    })
    .eq('id', request.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('Account request approval status update failed:', updateError)
    return res.status(500).json({
      error: 'The account was created, but the request status could not be updated. Retry approval to finish.'
    })
  }

  if (!updatedRequest) {
    return res.status(409).json({ error: 'This account request is no longer pending' })
  }

  await createAuditLog(
    'Approved',
    null,
    null,
    JSON.stringify({ ...request, status: 'approved' }),
    'Approved account request: ' + request.full_name,
    req.profile.id
  )

  res.json({
    message: 'Account request approved',
    user_id: userId
  })
})

router.post('/account-requests/:id/reject', requireAuth, requireRole('Administrator'), async (req, res) => {
  const rejectionReason = String(req.body.rejection_reason || '').trim()

  if (!rejectionReason) {
    return res.status(400).json({ error: 'Please give a reason for rejecting this account request.' })
  }

  if (rejectionReason.length > 1000) {
    return res.status(400).json({ error: 'The rejection reason must be 1000 characters or fewer.' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('account_requests')
    .select('id, auth_user_id, employee_id, full_name, email, role, department, job_title, status')
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (requestError) {
    console.error('Account rejection lookup failed:', requestError)
    return res.status(503).json({ error: accountRequestsMigrationError })
  }

  if (!request) {
    return res.status(404).json({ error: 'Pending account request not found' })
  }

  const { data: rejectedRequest, error: updateError } = await supabaseAdmin
    .from('account_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.profile.id,
      rejection_reason: rejectionReason
    })
    .eq('id', request.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    if (/rejection_reason/i.test(updateError.message || '')) {
      return res.status(503).json({
        error: 'Rejection reasons are not configured. Run backend/sql/rejection-reasons.sql in the Supabase SQL Editor.'
      })
    }

    return res.status(500).json({ error: updateError.message })
  }

  if (!rejectedRequest) {
    return res.status(409).json({ error: 'This account request is no longer pending' })
  }

  const { error: deleteError } =
    await supabaseAdmin.auth.admin.deleteUser(request.auth_user_id)

  if (deleteError && !/user not found/i.test(deleteError.message || '')) {
    console.error('Rejected signup auth cleanup failed:', deleteError)
    return res.status(503).json({
      error: 'The request was rejected, but its inactive sign-in record could not be removed.'
    })
  }

  await createAuditLog(
    'Rejected',
    null,
    JSON.stringify({ ...request, status: 'pending' }),
    JSON.stringify({ ...request, status: 'rejected', rejection_reason: rejectionReason }),
    'Rejected account request for ' + request.full_name + ': ' + rejectionReason,
    req.profile.id
  )

  res.json({ message: 'Account request rejected' })
})

router.post('/', requireAuth, requireRole('Administrator'), async (req, res) => {
  const {
    full_name,
    email,
    password,
    role,
    office_id,
    employee_id,
    department,
    job_title
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

  if (!accountRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid role'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'User creation is unavailable. Configure SUPABASE_SERVICE_ROLE_KEY in the backend environment and restart the backend.'
    })
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { must_change_password: true }
    })

  if (authError || !authData.user) {
    console.log(authError)

    return res.status(isAdminAuthorizationError(authError) ? 503 : 400).json({
      error: isAdminAuthorizationError(authError)
        ? adminCredentialsError
        : authError?.message || 'Failed to create account'
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
        employee_id: String(employee_id || '').trim() || null,
        department: normalizeDepartment(department) || null,
        job_title: String(job_title || '').trim() || null,
        office_id: office_id || null
      }
    ])
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      employee_id,
      department,
      job_title,
      office_id,
      created_at,
      offices (
        office_name
      )
    `)
    .single()

  if (error) {
    console.log(error)

    await supabaseAdmin.auth.admin.deleteUser(
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
    employee_id,
    department,
    job_title,
    office_id
  } = req.body

  if (!full_name || !email || !role) {
    return res.status(400).json({
      error: 'Full name, email, and role are required'
    })
  }

  if (!accountRoles.includes(role)) {
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
    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Updating an account email is unavailable. Configure SUPABASE_SERVICE_ROLE_KEY in the backend environment and restart the backend.'
      })
    }

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(
        oldData.auth_user_id,
        {
          email: email
        }
      )

    if (authError) {
      console.log(authError)

      return res.status(isAdminAuthorizationError(authError) ? 503 : 400).json({
        error: isAdminAuthorizationError(authError)
          ? adminCredentialsError
          : authError.message
      })
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: full_name,
      email: email,
      role: role,
      employee_id: String(employee_id || '').trim() || null,
      department: normalizeDepartment(department) || null,
      job_title: String(job_title || '').trim() || null,
      office_id: office_id || null
    })
    .eq('id', req.params.id)
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      role,
      employee_id,
      department,
      job_title,
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
    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Deleting user accounts is unavailable. Configure SUPABASE_SERVICE_ROLE_KEY in the backend environment and restart the backend.'
      })
    }

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(
        oldData.auth_user_id
      )

    if (authError) {
      console.log(authError)

      return res.status(isAdminAuthorizationError(authError) ? 503 : 400).json({
        error: isAdminAuthorizationError(authError)
          ? adminCredentialsError
          : authError.message
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