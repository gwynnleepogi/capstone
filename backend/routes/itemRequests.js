const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')


// GET ITEM REQUESTS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('item_requests')
    .select(`
      *,
      users (
        full_name
      ),
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


// ADD ITEM REQUEST

router.post('/', async (req, res) => {

  const {
    request_number,
    requested_by,
    office_id,
    item_description,
    quantity,
    purpose,
    status
  } = req.body

  const { data, error } = await supabase
    .from('item_requests')
    .insert([{
      request_number,
      requested_by,
      office_id,
      item_description,
      quantity,
      purpose,
      status
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
    'Added item request: ' + data.request_number
  )

  res.status(201).json(data)
})


// UPDATE ITEM REQUEST

router.put('/:id', async (req, res) => {

  const {
    request_number,
    requested_by,
    office_id,
    item_description,
    quantity,
    purpose,
    status
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('item_requests')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Item request not found'
    })
  }


  const { data, error } = await supabase
    .from('item_requests')
    .update({
      request_number,
      requested_by,
      office_id,
      item_description,
      quantity,
      purpose,
      status
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
    'Updated item request: ' + data.request_number
  )

  res.json(data)
})


// DELETE ITEM REQUEST

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('item_requests')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Item request not found'
    })
  }


  const { error } = await supabase
    .from('item_requests')
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
    'Deleted item request: ' + oldData.request_number
  )

  res.json({
    message: 'Request deleted successfully'
  })
})


module.exports = router