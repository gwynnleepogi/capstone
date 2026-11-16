
const express = require('express')
const crypto = require('crypto')
const router = express.Router()

const {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
} = require('../supabaseAdmin')

const createAuditLog = require('../middleware/auditLog')
const { requireAuth, requireRole } = require('../middleware/auth')

const migrationError =
  'Password reset requests are not configured yet. Run backend/sql/password-reset-requests.sql in the Supabase SQL Editor.'

// Submit a password reset request
router.post('/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const employeeId = String(req.body?.employee_id || '').trim()

  if (
    !email ||
    !employeeId ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      error: 'Enter a valid email address and Employee ID.'
    })
  }

  const admin = getSupabaseAdmin()

  if (!admin) {
    return res.status(503).json({ error: adminCredentialsError })
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, auth_user_id, email, employee_id, full_name')
    .ilike('email', email)
    .ilike('employee_id', employeeId)
    .maybeSingle()

  if (profileError) {
    if (
      profileError.code === '42P01' ||
      profileError.code === 'PGRST205'
    ) {
      return res.status(503).json({ error: migrationError })
    }

    console.error('Password reset identity lookup failed:', profileError)

    return res.status(500).json({
      error: 'Unable to submit the request right now.'
    })
  }

  if (profile?.auth_user_id) {
    const { data: pending, error: pendingError } = await admin
      .from('password_reset_requests')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingError) {
      if (
        pendingError.code === '42P01' ||
        pendingError.code === 'PGRST205'
      ) {
        return res.status(503).json({ error: migrationError })
      }

      console.error('Pending password reset lookup failed:', pendingError)

      return res.status(500).json({
        error: 'Unable to submit the request right now.'
      })
    }

    if (!pending) {
      const { error: insertError } = await admin
        .from('password_reset_requests')
        .insert({
          user_id: profile.id,
          auth_user_id: profile.auth_user_id,
          email,
          employee_id: employeeId,
          full_name: profile.full_name || null,
          status: 'pending'
        })

      if (insertError) {
        console.error('Password reset request insert failed:', insertError)

        return res.status(500).json({
          error: 'Unable to submit the request right now.'
        })
      }
    }
  }

  return res.status(202).json({
    message:
      'If the email and Employee ID match an account, a password reset request has been sent to the administrator for review.'
  })
})


// Get all password reset requests
router.get(
  '/',
  requireAuth,
  requireRole('Administrator'),
  async (req, res) => {
    const admin = getSupabaseAdmin()

    if (!admin) {
      return res.status(503).json({ error: adminCredentialsError })
    }

    const { data, error } = await admin
      .from('password_reset_requests')
      .select(
        'id, user_id, auth_user_id, email, employee_id, full_name, status, reason, created_at, reviewed_at, reviewer_name'
      )
      .order('created_at', { ascending: false })

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205'
      ) {
        return res.status(503).json({ error: migrationError })
      }

      console.error('Password reset requests load failed:', error)

      return res.status(500).json({
        error: 'Unable to load password reset requests.'
      })
    }

    res.json(data || [])
  }
)


// Approve or disapprove a password reset request
router.post(
  '/:id/review',
  requireAuth,
  requireRole('Administrator'),
  async (req, res) => {
    const requestId = req.params.id
    const decision = String(req.body?.decision || '').toLowerCase()
    const reason = String(req.body?.reason || '').trim()

    // Validate the decision
    if (!['approved', 'disapproved'].includes(decision)) {
      return res.status(400).json({
        error: 'Choose approve or disapprove.'
      })
    }

    // A reason is required ONLY when disapproving
    if (decision === 'disapproved' && reason.length < 5) {
      return res.status(400).json({
        error: 'A reason of at least 5 characters is required when disapproving.'
      })
    }

    const admin = getSupabaseAdmin()

    if (!admin) {
      return res.status(503).json({ error: adminCredentialsError })
    }

    const { data: request, error: requestError } = await admin
      .from('password_reset_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (requestError || !request) {
      return res.status(404).json({
        error: 'This pending password reset request was not found.'
      })
    }

    let temporaryPassword = null

    // Generate a temporary password only when approved
    if (decision === 'approved') {
      temporaryPassword =
        crypto.randomBytes(18).toString('base64url') + 'A7!'

      const { error: updateAuthError } =
        await admin.auth.admin.updateUserById(
          request.auth_user_id,
          {
            password: temporaryPassword,
            user_metadata: {
              password_reset_required: true,
              must_change_password: true
            }
          }
        )

      if (updateAuthError) {
        console.error(
          'Temporary password generation failed:',
          updateAuthError
        )

        return res.status(
          isAdminAuthorizationError(updateAuthError) ? 503 : 400
        ).json({
          error: isAdminAuthorizationError(updateAuthError)
            ? adminCredentialsError
            : updateAuthError.message
        })
      }
    }

    // Save the admin's decision
    const { data: reviewed, error: reviewError } = await admin
      .from('password_reset_requests')
      .update({
        status: decision,

        // Approved requests do not need a reason
        reason: decision === 'disapproved' ? reason : null,

        reviewed_at: new Date().toISOString(),

        reviewer_name:
          req.profile?.full_name ||
          req.profile?.email ||
          'Administrator'
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id, status, reason, reviewed_at, reviewer_name')
      .single()

    if (reviewError || !reviewed) {
      console.error(
        'Password reset review save failed:',
        reviewError
      )

      return res.status(500).json({
        error: 'The decision could not be saved. Contact support before retrying.'
      })
    }

    // Save the action to the audit log
    await createAuditLog(
      decision === 'approved'
        ? 'Password Reset Approved'
        : 'Password Reset Disapproved',
      null,
      JSON.stringify({ status: 'pending' }),
      JSON.stringify({
        status: decision,
        reason: decision === 'disapproved' ? reason : null
      }),
      `${
        decision === 'approved' ? 'Approved' : 'Disapproved'
      } password reset request for ${request.email}`,
      request.user_id
    )

    // Return the temporary password only when approved
    res.json({
      ...reviewed,
      ...(temporaryPassword
        ? { temporary_password: temporaryPassword }
        : {})
    })
  }
)

module.exports = router
