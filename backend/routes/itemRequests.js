
const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

const {
  requireAuth,
  requireRole
} = require('../middleware/auth')

router.use(requireAuth)

async function setItemStatus(itemId, newStatus, fromStatuses) {
  if (!itemId) {
    return {
      success: false,
      error: 'The inventory item ID is missing.'
    }
  }

  const { data, error } = await supabase
    .from('items')
    .update({ status: newStatus })
    .eq('id', itemId)
    .in('status', fromStatuses)
    .select('id, status')
    .maybeSingle()

  if (error) {
    console.log(
      'Failed to update item status:',
      itemId,
      error.message
    )

    return {
      success: false,
      error: error.message
    }
  }

  if (data) {
    return {
      success: true,
      status: data.status
    }
  }

  const { data: currentItem, error: currentItemError } =
    await supabase
      .from('items')
      .select('id, status')
      .eq('id', itemId)
      .maybeSingle()

  if (currentItemError) {
    return {
      success: false,
      error: currentItemError.message
    }
  }

  if (!currentItem) {
    return {
      success: false,
      error: 'The inventory item was not found.'
    }
  }

  if (currentItem.status === newStatus) {
    return {
      success: true,
      status: currentItem.status
    }
  }

  return {
    success: false,
    error:
      'The item status was not changed. Current status: ' +
      currentItem.status
  }
}

const assignItem = (itemId) =>
  setItemStatus(
    itemId,
    'Assigned',
    ['Available', 'Returned']
  )

const releaseItem = (itemId) =>
  setItemStatus(
    itemId,
    'Available',
    ['Assigned']
  )

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
        quantity,
        unit,
        model_number,
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

async function getActiveRequestedItemIds() {
  const { data, error } = await supabase
    .from('item_requests')
    .select('item_id')
    .in('status', ['Pending', 'Approved'])
    .not('item_id', 'is', null)

  if (error) {
    console.log(error)

    return {
      ids: new Set(),
      error: error.message
    }
  }

  return {
    ids: new Set(data.map(row => row.item_id)),
    error: null
  }
}

router.get('/available-items', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select(`
      id,
      property_number,
      description,
      quantity,
      unit,
      model_number,
      serial_number,
      classification,
      condition,
      status,
      cost,
      acquisition_date,
      accountable_employee,
      responsibility_center
    `)
    .in('status', ['Available', 'Returned'])
    .eq('condition', 'Serviceable')
    .order('description', {
      ascending: true
    })

  if (error) {
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  const {
    ids: requestedItemIds,
    error: requestedError
  } = await getActiveRequestedItemIds()

  if (requestedError) {
    return res.status(500).json({
      error: requestedError
    })
  }

  const freeItems = data.filter(
    item => !requestedItemIds.has(item.id)
  )

  res.json(freeItems)
})

router.patch(
  '/:id/status',
  requireRole('Administrator', 'Personnel'),
  async (req, res) => {
    const { status } = req.body

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Request status must be Approved or Rejected'
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
      return res.status(404).json({
        error: 'Item request not found'
      })
    }

    if (oldData.status !== 'Pending') {
      return res.status(400).json({
        error:
          'Only pending requests can be accepted or rejected. Current status: ' +
          oldData.status
      })
    }

    const {
      data,
      error
    } = await supabase
      .from('item_requests')
      .update({ status })
      .eq('id', req.params.id)
      .eq('status', 'Pending')
      .select()
      .maybeSingle()

    if (error) {
      return res.status(500).json({
        error: error.message
      })
    }

    if (!data) {
      return res.status(409).json({
        error:
          'This request was already updated. Refresh and try again.'
      })
    }

    if (status === 'Approved') {
      const itemResult = await assignItem(data.item_id)

      if (!itemResult.success) {
        console.log(
          'Could not assign item:',
          data.item_id,
          itemResult.error
        )

        const { error: rollbackError } = await supabase
          .from('item_requests')
          .update({ status: 'Pending' })
          .eq('id', data.id)
          .eq('status', 'Approved')

        if (rollbackError) {
          console.log(
            'Could not reset request status:',
            rollbackError.message
          )
        }

        return res.status(500).json({
          error:
            'The request could not be approved because the property status could not be changed to Assigned.',
          details: itemResult.error
        })
      }
    }

    await createAuditLog(
      'Updated',
      data.item_id,
      JSON.stringify(oldData),
      JSON.stringify(data),
      (
        status === 'Approved'
          ? 'Accepted'
          : 'Rejected'
      ) + ' item request: ' + data.request_number,
      req.profile.id
    )

    const { data: updatedRequest, error: refreshError } =
      await supabase
        .from('item_requests')
        .select(`
          *,
          items (
            id,
            property_number,
            description,
            quantity,
            unit,
            model_number,
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
        .eq('id', data.id)
        .single()

    if (refreshError) {
      return res.json(data)
    }

    res.json(updatedRequest)
  }
)

async function getSelectedItem(itemId, excludeRequestId) {
  const { data, error } = await supabase
    .from('items')
    .select(`
      id,
      description,
      quantity,
      unit,
      status,
      condition
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

  if (data.condition !== 'Serviceable') {
    return {
      item: null,
      error:
        'This item is Unserviceable and cannot be assigned until it is marked Serviceable again'
    }
  }

  let activeQuery = supabase
    .from('item_requests')
    .select('id')
    .eq('item_id', itemId)
    .in('status', ['Pending', 'Approved'])

  if (excludeRequestId) {
    activeQuery = activeQuery.neq(
      'id',
      excludeRequestId
    )
  }

  const {
    data: activeRequests,
    error: activeError
  } = await activeQuery

  if (activeError) {
    return {
      item: null,
      error: activeError.message
    }
  }

  if (activeRequests && activeRequests.length > 0) {
    return {
      item: null,
      error:
        'This item has already been requested by someone else'
    }
  }

  return {
    item: data,
    error: null
  }
}

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
    requestOwner = requested_by || req.profile.id
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
    .insert([{
      request_number,
      requested_by: requestOwner,
      office_id: office_id || null,
      item_id,
      item_description: selectedItem.description,
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
    data.item_id,
    null,
    JSON.stringify(data),
    'Added item request: ' + data.request_number,
    req.profile.id
  )

  res.status(201).json(data)
})

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

    const requestOwner =
      requested_by || oldData.requested_by

    if (
      oldData.status === 'Delivered' &&
      status !== 'Delivered'
    ) {
      return res.status(400).json({
        error: 'Delivered requests cannot be changed'
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
    } = await getSelectedItem(
      item_id,
      req.params.id
    )

    if (
      selectedItemError &&
      item_id !== oldData.item_id
    ) {
      return res.status(400).json({
        error: selectedItemError
      })
    }

    let itemDescription = oldData.item_description

    if (selectedItem) {
      itemDescription = selectedItem.description
    }

    if (
      status === 'Delivered' &&
      oldData.status !== 'Delivered'
    ) {
      const {
        data: requester,
        error: requesterError
      } = await supabase
        .from('users')
        .select('full_name, office_id')
        .eq('id', requestOwner)
        .single()

      if (requesterError || !requester) {
        return res.status(400).json({
          error: 'The request owner could not be found'
        })
      }

      const requesterOfficeId =
        office_id ||
        oldData.office_id ||
        requester.office_id

      let responsibilityCenter = ''

      if (requesterOfficeId) {
        const {
          data: office,
          error: officeError
        } = await supabase
          .from('offices')
          .select('office_name')
          .eq('id', requesterOfficeId)
          .single()

        if (officeError || !office) {
          return res.status(400).json({
            error:
              'The request owner office could not be found'
          })
        }

        responsibilityCenter = office.office_name
      }

      const { error: itemUpdateError } = await supabase
        .from('items')
        .update({
          accountable_employee: requester.full_name,
          responsibility_center: responsibilityCenter
        })
        .eq('id', item_id)

      if (itemUpdateError) {
        console.log(itemUpdateError)

        return res.status(500).json({
          error: itemUpdateError.message
        })
      }
    }

    const { data, error } = await supabase
      .from('item_requests')
      .update({
        request_number,
        requested_by: requestOwner,
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

    if (
      oldData.item_id &&
      oldData.item_id !== data.item_id &&
      oldData.status === 'Approved'
    ) {
      const releaseResult = await releaseItem(
        oldData.item_id
      )

      if (!releaseResult.success) {
        console.log(
          'Could not release previous item:',
          releaseResult.error
        )
      }
    }

    if (status === 'Approved') {
      const itemResult = await assignItem(data.item_id)

      if (!itemResult.success) {
        console.log(
          'Could not assign item:',
          data.item_id,
          itemResult.error
        )

        return res.status(500).json({
          error:
            'The request was updated, but the property status could not be changed to Assigned.',
          details: itemResult.error
        })
      }
    } else if (
      status === 'Rejected' &&
      oldData.status === 'Approved'
    ) {
      const releaseResult = await releaseItem(
        data.item_id
      )

      if (!releaseResult.success) {
        console.log(
          'Could not release item:',
          data.item_id,
          releaseResult.error
        )
      }
    }

    await createAuditLog(
      'Updated',
      data.item_id,
      JSON.stringify(oldData),
      JSON.stringify(data),
      'Updated item request: ' + data.request_number,
      req.profile.id
    )

    res.json(data)
  }
)

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

    if (oldData.status === 'Approved') {
      const releaseResult = await releaseItem(
        oldData.item_id
      )

      if (!releaseResult.success) {
        console.log(
          'Could not release item:',
          oldData.item_id,
          releaseResult.error
        )
      }
    }

    await createAuditLog(
      'Deleted',
      oldData.item_id,
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
