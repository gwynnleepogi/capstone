const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const { requireRole } = require('../middleware/auth')
const {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
} = require('../supabaseAdmin')

// GET AUDIT LOGS
router.get('/', async (req, res) => {

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (req.role === 'Teacher' || req.role === 'Non-Teaching Staff') {
    query = query.eq('user_id', req.profile.id)
  }

  const { data, error } = await query

  if (error) {
    console.log('AUDIT LOG ERROR:')
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  res.json(data)
})

// DELETE AUDIT LOG (Administrator only)
router.delete('/:id', requireRole('Administrator'), async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Audit log deletion is unavailable. Configure Supabase admin credentials and restart the backend.'
    })
  }

  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('audit_logs')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (findError) {
      if (isAdminAuthorizationError(findError)) {
        return res.status(503).json({ error: adminCredentialsError })
      }

      console.error('FIND AUDIT LOG ERROR:', findError)
      return res.status(500).json({ error: findError.message })
    }

    if (!existing) {
      return res.status(404).json({
        error: 'Audit log not found'
      })
    }

    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle()

    if (deleteError) {
      if (isAdminAuthorizationError(deleteError)) {
        return res.status(503).json({ error: adminCredentialsError })
      }

      console.error('DELETE AUDIT LOG ERROR:', deleteError)
      return res.status(500).json({ error: deleteError.message })
    }

    if (!deleted) {
      return res.status(403).json({
        error: 'Supabase did not delete the audit log. Check the backend Supabase key and database permissions.'
      })
    }

    return res.json({
      message: 'Audit log deleted successfully'
    })
  } catch (error) {
    console.error('DELETE AUDIT LOG ERROR:', error)
    return res.status(500).json({
      error: 'An unexpected error occurred while deleting the audit log.'
    })
  }
})

module.exports = router