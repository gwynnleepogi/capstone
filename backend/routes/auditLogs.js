const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const { requireRole } = require('../middleware/auth')

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

  const { data: existing, error: findError } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('id', req.params.id)
    .single()

  if (findError || !existing) {
    return res.status(404).json({
      error: 'Audit log not found'
    })
  }

  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.log('DELETE AUDIT LOG ERROR:')
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  res.json({
    message: 'Audit log deleted successfully'
  })
})

module.exports = router