const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

const configs = {
  colleges: { table: 'colleges', code: 'college_code', name: 'college_name', label: 'college' },
  departments: { table: 'departments', code: 'department_code', name: 'department_name', label: 'department' },
  'responsibility-centers': { table: 'responsibility_centers', code: 'rc_code', name: 'rc_name', label: 'responsibility center' }
}

function getConfig(type) {
  return configs[type] || null
}

function selectFields(type) {
  if (type === 'departments') return '*, colleges(id, college_name, college_code)'
  if (type === 'responsibility-centers') return '*, colleges(id, college_name), departments(id, department_name), offices(id, office_name)'
  return '*'
}

router.get('/:type', async (req, res) => {
  const config = getConfig(req.params.type)
  if (!config) return res.status(404).json({ error: 'Unknown organizational record type' })

  const { data, error } = await supabase
    .from(config.table)
    .select(selectFields(req.params.type))
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/:type', async (req, res) => {
  const config = getConfig(req.params.type)
  if (!config) return res.status(404).json({ error: 'Unknown organizational record type' })

  const payload = {
    [config.code]: String(req.body[config.code] || '').trim(),
    [config.name]: String(req.body[config.name] || '').trim(),
    is_active: true
  }

  if (!payload[config.code] || !payload[config.name]) {
    return res.status(400).json({ error: 'Code and name are required' })
  }

  if (req.params.type === 'departments') {
    payload.college_id = req.body.college_id || null
    if (!payload.college_id) return res.status(400).json({ error: 'Please select a college' })
  }

  if (req.params.type === 'responsibility-centers') {
    payload.college_id = req.body.college_id || null
    payload.department_id = req.body.department_id || null
    payload.office_id = req.body.office_id || null
    const assigned = [payload.college_id, payload.department_id, payload.office_id].filter(Boolean)
    if (assigned.length > 1) return res.status(400).json({ error: 'A responsibility center can be associated with only one unit' })
  }

  const { data, error } = await supabase
    .from(config.table)
    .insert([payload])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await createAuditLog('Created', data.id, null, JSON.stringify(data), 'Added ' + config.label + ': ' + data[config.name], req.profile?.id)
  res.status(201).json(data)
})

router.put('/:type/:id', async (req, res) => {
  const config = getConfig(req.params.type)
  if (!config) return res.status(404).json({ error: 'Unknown organizational record type' })

  const { data: oldData, error: oldError } = await supabase
    .from(config.table)
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) return res.status(404).json({ error: config.label + ' not found' })

  const payload = {
    [config.code]: String(req.body[config.code] || '').trim(),
    [config.name]: String(req.body[config.name] || '').trim(),
    is_active: req.body.is_active === undefined ? oldData.is_active : Boolean(req.body.is_active)
  }

  if (!payload[config.code] || !payload[config.name]) {
    return res.status(400).json({ error: 'Code and name are required' })
  }

  if (req.params.type === 'departments') {
    payload.college_id = req.body.college_id || null
    if (!payload.college_id) return res.status(400).json({ error: 'Please select a college' })
  }

  if (req.params.type === 'responsibility-centers') {
    payload.college_id = req.body.college_id || null
    payload.department_id = req.body.department_id || null
    payload.office_id = req.body.office_id || null
    const assigned = [payload.college_id, payload.department_id, payload.office_id].filter(Boolean)
    if (assigned.length > 1) return res.status(400).json({ error: 'A responsibility center can be associated with only one unit' })
  }

  const { data, error } = await supabase
    .from(config.table)
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await createAuditLog('Updated', data.id, JSON.stringify(oldData), JSON.stringify(data), 'Updated ' + config.label + ': ' + data[config.name], req.profile?.id)
  res.json(data)
})

module.exports = router