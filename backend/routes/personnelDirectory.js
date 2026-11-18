const express = require('express')
const router = express.Router()

const { getSupabaseAdmin, adminCredentialsError } = require('../supabaseAdmin')
const createAuditLog = require('../middleware/auditLog')

function getDatabase(res) {
  const database = getSupabaseAdmin()
  if (!database) {
    res.status(503).json({ error: adminCredentialsError })
    return null
  }
  return database
}

function clean(value) {
  return String(value || '').trim()
}

router.get('/', async (req, res) => {
  const database = getDatabase(res)
  if (!database) return

  const { data, error } = await database
    .from('personnel_directory')
    .select('id, employee_id, full_name, job_title, office_id, created_at, offices ( office_name )')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Personnel directory list failed:', error)
    return res.status(500).json({ error: error.message })
  }

  res.json(data || [])
})

router.post('/', async (req, res) => {
  const database = getDatabase(res)
  if (!database) return

  const employee_id = clean(req.body.employee_id) || null
  const full_name = clean(req.body.full_name)
  const job_title = clean(req.body.job_title) || null
  const office_id = clean(req.body.office_id) || null

  if (!full_name) {
    return res.status(400).json({ error: 'Full name is required.' })
  }

  const { data, error } = await database
    .from('personnel_directory')
    .insert({ employee_id, full_name, job_title, office_id })
    .select('id, employee_id, full_name, job_title, office_id, created_at, offices ( office_name )')
    .single()

  if (error) {
    console.error('Personnel directory create failed:', error)
    return res.status(error.code === '23505' ? 409 : 400).json({
      error: error.code === '23505'
        ? 'This Employee ID is already in the personnel directory.'
        : error.message
    })
  }

  await createAuditLog('Created', data.id, null, JSON.stringify(data),
    'Added personnel directory record: ' + data.full_name, req.profile?.id)

  res.status(201).json(data)
})

router.put('/:id', async (req, res) => {
  const database = getDatabase(res)
  if (!database) return

  const employee_id = clean(req.body.employee_id) || null
  const full_name = clean(req.body.full_name)
  const job_title = clean(req.body.job_title) || null
  const office_id = clean(req.body.office_id) || null

  if (!full_name) {
    return res.status(400).json({ error: 'Full name is required.' })
  }

  const { data: oldData, error: oldError } = await database
    .from('personnel_directory')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (oldError || !oldData) {
    return res.status(404).json({ error: 'Personnel record not found.' })
  }

  const { data, error } = await database
    .from('personnel_directory')
    .update({ employee_id, full_name, job_title, office_id, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id, employee_id, full_name, job_title, office_id, created_at, offices ( office_name )')
    .single()

  if (error) {
    console.error('Personnel directory update failed:', error)
    return res.status(error.code === '23505' ? 409 : 400).json({
      error: error.code === '23505'
        ? 'This Employee ID is already in the personnel directory.'
        : error.message
    })
  }

  await createAuditLog('Updated', data.id, JSON.stringify(oldData), JSON.stringify(data),
    'Updated personnel directory record: ' + data.full_name, req.profile?.id)

  res.json(data)
})

router.delete('/:id', async (req, res) => {
  const database = getDatabase(res)
  if (!database) return

  const { data: oldData, error: oldError } = await database
    .from('personnel_directory')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (oldError || !oldData) {
    return res.status(404).json({ error: 'Personnel record not found.' })
  }

  const { error } = await database
    .from('personnel_directory')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.error('Personnel directory delete failed:', error)
    return res.status(500).json({ error: error.message })
  }

  await createAuditLog('Deleted', oldData.id, JSON.stringify(oldData), null,
    'Deleted personnel directory record: ' + oldData.full_name, req.profile?.id)

  res.json({ message: 'Personnel record deleted.' })
})

module.exports = router
