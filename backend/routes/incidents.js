const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')


// GET INCIDENTS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      items (
        description,
        property_number
      ),
      users (
        full_name
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


// ADD INCIDENT

router.post('/', async (req, res) => {

  const {
    item_id,
    reported_by,
    incident_type,
    incident_date,
    status,
    description,
    action_taken,
    remarks
  } = req.body

  const { data, error } = await supabase
    .from('incidents')
    .insert([{
      item_id,
      reported_by,
      incident_type,
      incident_date,
      status,
      description,
      action_taken,
      remarks
    }])
    .select()
    .single()

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  await createAuditLog(
    'Created',
    data.id,
    null,
    JSON.stringify(data),
    'Added incident: ' + data.description
  )

  res.status(201).json(data)
})


// UPDATE INCIDENT

router.put('/:id', async (req, res) => {

  const {
    item_id,
    reported_by,
    incident_type,
    incident_date,
    status,
    description,
    action_taken,
    remarks
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Incident not found'
    })
  }


  const { data, error } = await supabase
    .from('incidents')
    .update({
      item_id,
      reported_by,
      incident_type,
      incident_date,
      status,
      description,
      action_taken,
      remarks
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {

    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }


  await createAuditLog(
    'Updated',
    data.id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated incident: ' + data.description
  )

  res.json(data)
})


// DELETE INCIDENT

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Incident not found'
    })
  }


  const { error } = await supabase
    .from('incidents')
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
    req.params.id,
    JSON.stringify(oldData),
    null,
    'Deleted incident: ' + oldData.description
  )

  res.json({
    message: 'Incident deleted successfully'
  })
})


module.exports = router