const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

const {
  requireAuth,
  requireRole
} = require('../middleware/auth')

router.use(requireAuth)

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
        id,
        full_name,
        email
      ),
      offices (
        id,
        office_name
      ),
      items (
        id,
        property_number,
        description,
        serial_number,
        classification,
        condition,
        status,
        cost,
        acquisition_date,
        accountable_employee,
        responsibility_center
      )
    `)
    .order('created_at', {
      ascending: false
    })

  if (
    req.role === 'Teacher' ||
    req.role === 'Non-Teaching Staff'
  ) {
    query = query.eq(
      'requested_by',
      req.profile.id
    )
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


// GET AVAILABLE INVENTORY ITEMS

router.get(
  '/available-items',
  async (req, res) => {
    const { data, error } = await supabase
      .from('items')
      .select(`
        id,
        property_number,
        description,
        serial_number,
        classification,
        condition,
        status,
        cost,
        acquisition_date,
        accountable_employee,
        responsibility_center
      `)
      .in('status', [
        'Available',
        'Returned'
      ])
      .order('description', {
        ascending: true
      })

    if (error) {
      console.log(error)

      return res.status(500).json({
        error: error.message
      })
    }

    res.json(data)
  }
)


// GET SELECTED INVENTORY ITEM

async function getSelectedItem(itemId) {
  const { data, error } = await supabase
    .from('items')
    .select(`
      id,
      description,
      status
    `)
    .eq('id', itemId)
    .single()

  if (error || !data) {
    return {
      item: null,
      error: 'Selected inventory item was not found'
    }
  }

  if (
    data.status !== 'Available' &&
    data.status !== 'Returned'
  ) {
    return {
      item: null,
      error: 'The selected inventory item is not available'
    }
  }

  return {
    item: data,
    error: null
  }
}


// ADD ITEM REQUEST
// ALL LOGGED-IN ROLES CAN CREATE REQUESTS

router.post('/', async (req, res) => {
  const {
    request_number,
    requested_by,
    office_id,
    quantity,
    purpose,
    item_id
  } = req.body

  if (!req.profile) {
    return res.status(401).json({
      error: 'Please log in'
    })
  }

  let requestOwner = req.profile.id

  if (
    req.role === 'Administrator' ||
    req.role === 'Personnel'
  ) {
    requestOwner =
      requested_by || req.profile.id
  }

  if (!item_id) {
    return res.status(400).json({
      error: 'Please select an inventory item'
    })
  }

  if (!quantity) {
    return res.status(400).json({
      error: 'Quantity is required'
    })
  }

  if (Number(quantity) < 1) {
    return res.status(400).json({
      error: 'Quantity must be at least 1'
    })
  }

  const {
    item: selectedItem,
    error: selectedItemError
  } = await getSelectedItem(item_id)

  if (selectedItemError) {
    return res.status(400).json({
      error: selectedItemError
    })
  }

  const { data, error } = await supabase
    .from('item_requests')
    .insert([
      {
        request_number,
        requested_by: requestOwner,
        office_id: office_id || null,
        item_id,
        item_description: selectedItem.description,
        quantity: Number(quantity),
        purpose,
        status: 'Pending'
      }
    ])
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
    'Added item request: ' +
      data.request_number,
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
      quantity,
      purpose,
      status,
      item_id
    } = req.body

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid request status'
      })
    }

    if (!item_id) {
      return res.status(400).json({
        error: 'Please select an inventory item'
      })
    }

    if (!quantity) {
      return res.status(400).json({
        error: 'Quantity is required'
      })
    }

    if (Number(quantity) < 1) {
      return res.status(400).json({
        error: 'Quantity must be at least 1'
      })
    }

    const {
      data: oldData,
      error: oldError
    } = await supabase
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

    if (
      oldData.status === 'Delivered' &&
      status !== 'Delivered'
    ) {
      return res.status(400).json({
        error:
          'Delivered requests cannot be changed'
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

    const {
      item: selectedItem,
      error: selectedItemError
    } = await getSelectedItem(item_id)

    if (
      selectedItemError &&
      item_id !== oldData.item_id
    ) {
      return res.status(400).json({
        error: selectedItemError
      })
    }

    let itemDescription =
      oldData.item_description

    if (selectedItem) {
      itemDescription = selectedItem.description
    }

    const { data, error } = await supabase
      .from('item_requests')
      .update({
        request_number,
        requested_by,
        office_id: office_id || null,
        item_description: itemDescription,
        quantity: Number(quantity),
        purpose,
        item_id,
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
      'Updated item request: ' +
        data.request_number,
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
    const {
      data: oldData,
      error: oldError
    } = await supabase
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
        error:
          'Delivered requests cannot be deleted'
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
      'Deleted item request: ' +
        oldData.request_number,
      req.profile.id
    )

    res.json({
      message: 'Request deleted successfully'
    })
  }
)


module.exports = router