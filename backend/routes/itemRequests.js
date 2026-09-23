
const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')
const { requireRole } = require('../middleware/auth')

const allowedStatuses = [
  'Pending',
  'Approved',
  'Delivered',
  'Rejected'
]

const allowedStatusChanges = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Delivered', 'Rejected'],
  Delivered: [],
  Rejected: []
}


// GET ITEM REQUESTS

router.get('/', async (req, res) => {

  let query = supabase
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

  if (
    req.role === 'Teacher' ||
    req.role === 'Non-Teaching Staff'
  ) {
    query = query.eq('requested_by', req.profile.id)
  }

  const { data, error } = await query

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

  if (req.role === 'Administrator') {
    return res.status(403).json({
      error: 'Administrators can view and manage requests but cannot create them'
    })
  }

  const {
    request_number,
    requested_by,
    office_id,
    item_description,
    quantity,
    purpose
  } = req.body

  const requestOwner =
    req.role === 'Teacher' ||
    req.role === 'Non-Teaching Staff'
      ? req.profile.id
      : requested_by

  if (!item_description || !quantity) {
    return res.status(400).json({
      error: 'Item description and quantity are required'
    })
  }

  if (Number(quantity) < 1) {
    return res.status(400).json({
      error: 'Quantity must be at least 1'
    })
  }

  const { data, error } = await supabase
    .from('item_requests')
    .insert([{
      request_number,
      requested_by: requestOwner,
      office_id,
      item_description,
      quantity: Number(quantity),
      purpose,
      status: 'Pending'
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
    'Added item request: ' + data.request_number,
    req.profile.id
  )

  res.status(201).json(data)
})


// UPDATE ITEM REQUEST

router.put(
  '/:id',
  requireRole('Administrator', 'Personnel'),
  async (req, res) => {

    const {
      request_number,
      requested_by,
      office_id,
      item_description,
      quantity,
      purpose,
      status
    } = req.body

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid request status'
      })
    }

    if (!item_description || !quantity) {
      return res.status(400).json({
        error: 'Item description and quantity are required'
      })
    }

    if (Number(quantity) < 1) {
      return res.status(400).json({
        error: 'Quantity must be at least 1'
      })
    }

    const { data: oldData, error: oldError } = await supabase
      .from('item_requests')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      console.log(oldError)

      return res.status(404).json({
        error: 'Item request not found'
      })
    }

    if (oldData.status !== status) {

      const allowedNextStatuses =
        allowedStatusChanges[oldData.status] || []

      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          error:
            'Invalid status change from ' +
            oldData.status +
            ' to ' +
            status
        })
      }
    }

    const { data, error } = await supabase
      .from('item_requests')
      .update({
        request_number,
        requested_by,
        office_id,
        item_description,
        quantity: Number(quantity),
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
      'Updated item request: ' + data.request_number,
      req.profile.id
    )

    res.json(data)
  }
)


// DELETE ITEM REQUEST

router.delete(
  '/:id',
  requireRole('Administrator', 'Personnel'),
  async (req, res) => {

    const { data: oldData, error: oldError } = await supabase
      .from('item_requests')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      console.log(oldError)

      return res.status(404).json({
        error: 'Item request not found'
      })
    }

    if (oldData.status === 'Delivered') {
      return res.status(400).json({
        error: 'Delivered requests cannot be deleted'
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
      'Deleted item request: ' + oldData.request_number,
      req.profile.id
    )

    res.json({
      message: 'Request deleted successfully'
    })
  }
)


module.exports = router