const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

function sendError(res, error, fallback) {
  console.error(error)
  return res.status(500).json({ error: error.message || fallback })
}

function clean(value) {
  return String(value || '').trim()
}

function audit(action, id, oldData, newData, description, userId) {
  return createAuditLog(
    action,
    id,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null,
    description,
    userId
  )
}

// Colleges
router.get('/colleges', async (req, res) => {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .order('college_name', { ascending: true })
  if (error) return sendError(res, error, 'Failed to load colleges')
  res.json(data || [])
})

router.post('/colleges', async (req, res) => {
  const college_name = clean(req.body.college_name)
  const college_code = clean(req.body.college_code) || null
  if (!college_name) return res.status(400).json({ error: 'College name is required.' })
  const { data, error } = await supabase
    .from('colleges')
    .insert([{ college_name, college_code }])
    .select()
    .single()
  if (error) return sendError(res, error, 'Failed to add college')
  await audit('Created', data.id, null, data, 'Added college: ' + data.college_name, req.profile?.id)
  res.status(201).json(data)
})

router.put('/colleges/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('colleges').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'College not found.' })
  const college_name = clean(req.body.college_name)
  const college_code = clean(req.body.college_code) || null
  if (!college_name) return res.status(400).json({ error: 'College name is required.' })
  const { data, error } = await supabase.from('colleges').update({ college_name, college_code }).eq('id', req.params.id).select().single()
  if (error) return sendError(res, error, 'Failed to update college')
  await audit('Updated', data.id, oldData, data, 'Updated college: ' + data.college_name, req.profile?.id)
  res.json(data)
})

router.delete('/colleges/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('colleges').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'College not found.' })
  const { error } = await supabase.from('colleges').delete().eq('id', req.params.id)
  if (error) return res.status(409).json({ error: 'This college cannot be deleted while it has departments. Move or delete its departments first.' })
  await audit('Deleted', req.params.id, oldData, null, 'Deleted college: ' + oldData.college_name, req.profile?.id)
  res.json({ message: 'College deleted successfully.' })
})

// Departments
router.get('/departments', async (req, res) => {
  const { data, error } = await supabase.from('departments').select('*').order('department_name', { ascending: true })
  if (error) return sendError(res, error, 'Failed to load departments')
  res.json(data || [])
})

router.post('/departments', async (req, res) => {
  const department_name = clean(req.body.department_name)
  const department_code = clean(req.body.department_code) || null
  const college_id = clean(req.body.college_id)
  if (!department_name || !college_id) return res.status(400).json({ error: 'Department name and college are required.' })
  const { data, error } = await supabase.from('departments').insert([{ department_name, department_code, college_id }]).select().single()
  if (error) return sendError(res, error, 'Failed to add department')
  await audit('Created', data.id, null, data, 'Added department: ' + data.department_name, req.profile?.id)
  res.status(201).json(data)
})

router.put('/departments/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('departments').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'Department not found.' })
  const department_name = clean(req.body.department_name)
  const department_code = clean(req.body.department_code) || null
  const college_id = clean(req.body.college_id)
  if (!department_name || !college_id) return res.status(400).json({ error: 'Department name and college are required.' })
  const { data, error } = await supabase.from('departments').update({ department_name, department_code, college_id }).eq('id', req.params.id).select().single()
  if (error) return sendError(res, error, 'Failed to update department')
  await audit('Updated', data.id, oldData, data, 'Updated department: ' + data.department_name, req.profile?.id)
  res.json(data)
})

router.delete('/departments/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('departments').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'Department not found.' })
  const { error } = await supabase.from('departments').delete().eq('id', req.params.id)
  if (error) return res.status(409).json({ error: 'This department cannot be deleted while it has responsibility centers.' })
  await audit('Deleted', req.params.id, oldData, null, 'Deleted department: ' + oldData.department_name, req.profile?.id)
  res.json({ message: 'Department deleted successfully.' })
})

// Responsibility centers. A unit may have more than one center code.
router.get('/responsibility-centers', async (req, res) => {
  const { data, error } = await supabase.from('responsibility_centers').select('*').order('center_code', { ascending: true })
  if (error) return sendError(res, error, 'Failed to load responsibility centers')
  res.json(data || [])
})

router.post('/responsibility-centers', async (req, res) => {
  const center_code = clean(req.body.center_code).toUpperCase()
  const center_name = clean(req.body.center_name)
  const unit_type = clean(req.body.unit_type)
  const department_id = unit_type === 'department' ? clean(req.body.department_id) : null
  const office_id = unit_type === 'office' ? clean(req.body.office_id) : null
  if (!center_code || !center_name || !['department', 'office'].includes(unit_type)) {
    return res.status(400).json({ error: 'Responsibility center code, name, and organizational unit are required.' })
  }
  if ((unit_type === 'department' && !department_id) || (unit_type === 'office' && !office_id)) {
    return res.status(400).json({ error: 'Select the department or office for this responsibility center.' })
  }
  const { data, error } = await supabase.from('responsibility_centers').insert([{ center_code, center_name, unit_type, department_id, office_id }]).select().single()
  if (error) return sendError(res, error, 'Failed to add responsibility center')
  await audit('Created', data.id, null, data, 'Added responsibility center: ' + data.center_code, req.profile?.id)
  res.status(201).json(data)
})

router.put('/responsibility-centers/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('responsibility_centers').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'Responsibility center not found.' })
  const center_code = clean(req.body.center_code).toUpperCase()
  const center_name = clean(req.body.center_name)
  const unit_type = clean(req.body.unit_type)
  const department_id = unit_type === 'department' ? clean(req.body.department_id) : null
  const office_id = unit_type === 'office' ? clean(req.body.office_id) : null
  if (!center_code || !center_name || !['department', 'office'].includes(unit_type)) {
    return res.status(400).json({ error: 'Responsibility center code, name, and organizational unit are required.' })
  }
  if ((unit_type === 'department' && !department_id) || (unit_type === 'office' && !office_id)) {
    return res.status(400).json({ error: 'Select the department or office for this responsibility center.' })
  }
  const { data, error } = await supabase.from('responsibility_centers').update({ center_code, center_name, unit_type, department_id, office_id }).eq('id', req.params.id).select().single()
  if (error) return sendError(res, error, 'Failed to update responsibility center')
  await audit('Updated', data.id, oldData, data, 'Updated responsibility center: ' + data.center_code, req.profile?.id)
  res.json(data)
})

router.delete('/responsibility-centers/:id', async (req, res) => {
  const { data: oldData, error: oldError } = await supabase.from('responsibility_centers').select('*').eq('id', req.params.id).single()
  if (oldError) return res.status(404).json({ error: 'Responsibility center not found.' })
  const { error } = await supabase.from('responsibility_centers').delete().eq('id', req.params.id)
  if (error) return res.status(409).json({ error: 'Failed to delete responsibility center.' })
  await audit('Deleted', req.params.id, oldData, null, 'Deleted responsibility center: ' + oldData.center_code, req.profile?.id)
  res.json({ message: 'Responsibility center deleted successfully.' })
})

module.exports = router
