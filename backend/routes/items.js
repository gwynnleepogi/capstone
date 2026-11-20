
const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getItemReferenceError(error, operation) {
  if (error.code !== '23503') {
    return null
  }

  if (error.message.includes('item_requests_item_id_fkey')) {
    return operation === 'deleted'
      ? 'This item is linked to existing requests. Update the request references before deleting it.'
      : 'This item identifier cannot be changed while requests refer to it.'
  }

  return `This item cannot be ${operation} because it is referenced by existing records.`
}

function cleanText(value) {
  return String(value || '').trim()
}

function getResponsibilityCenter(value) {
  return cleanText(value) || null
}

// ==========================================
// 1. GET ALL ITEMS
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data || [])
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load items' })
  }
})

// ==========================================
// 2. DOCUMENT LINK
// ==========================================
router.post('/:id/document-link', async (req, res) => {
  try {
    const { data: item, error } = await supabase
      .from('items')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to verify item for document link:', error)
      return res.status(500).json({ error: 'Failed to create item document link' })
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const viewUrl = `/items?item=${encodeURIComponent(item.id)}`

    res.json({ viewUrl })
  } catch (error) {
    console.error('Failed to create item document link:', error)
    res.status(500).json({ error: 'Failed to create item document link' })
  }
})

// ==========================================
// 3. GET OPTIONS
// ==========================================
router.get('/options', async (req, res) => {
  try {
    const { data: personnel, error: personnelError } = await supabase
      .from('users')
      .select('id, full_name, role, office_id')
      .order('full_name', { ascending: true })

    if (personnelError) {
      console.log(personnelError)
      return res.status(500).json({ error: personnelError.message })
    }

    const { data: offices, error: officesError } = await supabase
      .from('offices')
      .select('id, office_name, office_code')
      .order('office_name', { ascending: true })

    if (officesError) {
      console.log(officesError)
      return res.status(500).json({ error: officesError.message })
    }

    res.json({
      personnel: personnel || [],
      offices: offices || []
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load options' })
  }
})

// ==========================================
// 4. GET ASSIGNED ITEMS
// ==========================================
router.get('/assigned/:employeeName', async (req, res) => {
  try {
    const employeeName = decodeURIComponent(req.params.employeeName)

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .ilike('accountable_employee', employeeName)
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data || [])
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load assigned items' })
  }
})

// ==========================================
// 5. CREATE ITEM
// With Bulk Add Support
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      property_number,
      description,
      model_number,
      serial_number,
      cost,
      quantity,
      acquisition_date,
      condition,
      accountable_employee,
      office_name,
      responsibility_center,
      fund_cluster,
      unit,
      article,
      dr_ci_si_number,
      po_number,
      supplier,
      remarks
    } = req.body

    if (!fund_cluster || !String(fund_cluster).trim()) {
      return res.status(400).json({
        error: 'Fund Cluster is required.'
      })
    }

    const itemCost = Number(cost ?? 0)

    if (!Number.isFinite(itemCost) || itemCost < 0) {
      return res.status(400).json({
        error: 'Cost must be a non-negative number.'
      })
    }

    const itemClassification = itemCost >= 50000
      ? 'PAR'
      : itemCost >= 5000
        ? 'ICS High'
        : 'ICS Low'

    const requestedQty = Number(quantity ?? 1)

    if (!Number.isInteger(requestedQty) || requestedQty < 1) {
      return res.status(400).json({
        error: 'Quantity must be a positive whole number (at least 1).'
      })
    }

    if (requestedQty > 1 && (!property_number || !String(property_number).trim())) {
      return res.status(400).json({
        error: 'Property Number is required when adding more than 1 item.'
      })
    }

    const employeeName = cleanText(accountable_employee)
    const officeName = cleanText(office_name)
    const responsibilityCenter = getResponsibilityCenter(responsibility_center)

    if (!employeeName) {
      return res.status(400).json({
        error: 'Accountable Employee is required.'
      })
    }

    if (!officeName) return res.status(400).json({ error: 'Office is required.' })

    if (!responsibilityCenter) {
      return res.status(400).json({ error: 'Responsibility Center is required.' })
    }

    const itemsToInsert = []

    for (let i = 0; i < requestedQty; i++) {
      let currentPropNum = cleanText(property_number)

      if (requestedQty > 1) {
        const match = currentPropNum.match(/^(.*?)(\d+)$/)

        if (match) {
          const prefix = match[1]
          const num = parseInt(match[2], 10) + i

          currentPropNum = `${prefix}${num.toString().padStart(match[2].length, '0')}`
        } else {
          currentPropNum = `${currentPropNum}-${i + 1}`
        }
      }

      itemsToInsert.push({
        property_number: currentPropNum || null,
        description: description || null,
        model_number: model_number || null,
        serial_number: i === 0 ? (serial_number || null) : null,
        cost: itemCost,
        quantity: 1,
        unit: cleanText(unit) || 'PC',
        article: cleanText(article) || null,
        dr_ci_si_number: cleanText(dr_ci_si_number) || null,
        po_number: cleanText(po_number) || null,
        supplier: cleanText(supplier) || null,
        remarks: cleanText(remarks) || null,
        acquisition_date: acquisition_date || null,
        classification: itemClassification,
        condition: condition || 'Serviceable',
        accountable_employee: employeeName || null,
        office_name: officeName,
        responsibility_center: responsibilityCenter,
        fund_cluster: cleanText(fund_cluster),

        // A new property always has an accountable employee and starts as Issued.
        status: 'Issued'
      })
    }

    const { data, error } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select()

    if (error) {
      console.log(error)
      return res.status(500).json({ error: error.message })
    }

    try {
      const firstItem = data[0]
      const lastItem = data[data.length - 1]

      const logMessage = requestedQty > 1
        ? `Bulk added ${data.length} items: ${description} (${firstItem.property_number} to ${lastItem.property_number})`
        : `Added item: ${firstItem.description}`

      await createAuditLog(
        'Created',
        firstItem.id,
        null,
        JSON.stringify(data),
        logMessage,
        req.profile ? req.profile.id : null
      )
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.status(201).json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

// ==========================================
// 6. UPDATE ITEM
// Automatically updates status based on
// Accountable Employee assignment.
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const {
      property_number,
      description,
      model_number,
      serial_number,
      cost,
      quantity,
      acquisition_date,
      classification,
      condition,
      accountable_employee,
      responsibility_center,
      fund_cluster,
      unit,
      article,
      dr_ci_si_number,
      po_number,
      supplier,
      remarks
    } = req.body

    if (!fund_cluster || !String(fund_cluster).trim()) {
      return res.status(400).json({
        error: 'Fund Cluster is required.'
      })
    }

    const itemQuantity = Number(quantity ?? 1)

    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) {
      return res.status(400).json({
        error: 'Quantity must be a positive whole number.'
      })
    }

    const { data: oldData, error: oldError } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      return res.status(404).json({
        error: 'Item not found'
      })
    }

    const isReturnedProperty =
      String(oldData.status || '').trim().toLowerCase() === 'returned'

    const employeeName = cleanText(accountable_employee)
    const itemCondition = isReturnedProperty ? 'Unserviceable' : (cleanText(condition) || 'Serviceable')
    const officeName = cleanText(office_name)
    const responsibilityCenter = getResponsibilityCenter(responsibility_center)

    // A returned property stays unassigned until it goes through the
    // request and issuance workflow again.
    if (!employeeName && !isReturnedProperty) {
      return res.status(400).json({
        error: 'Accountable Employee is required.'
      })
    }

    if (!officeName) return res.status(400).json({ error: 'Office is required.' })

    if (!responsibilityCenter) {
      return res.status(400).json({ error: 'Responsibility Center is required.' })
    }

    if (isReturnedProperty && employeeName) {
      return res.status(400).json({
        error: 'Returned properties must be assigned through the request and issuance process.'
      })
    }

    if (!responsibilityCenter) {
      return res.status(400).json({
        error: 'Responsibility Center is required.'
      })
    }

    const { data, error } = await supabase
      .from('items')
      .update({
        property_number: property_number || null,
        description: description || null,
        model_number: model_number || null,
        serial_number: serial_number || null,
        cost: cost || 0,
        quantity: itemQuantity,
        acquisition_date: acquisition_date || null,
        classification: classification || 'PAR',
        condition: itemCondition,

        // Never set a property to Available. A returned property remains
        // Returned until it is issued through the request workflow.
        status: isReturnedProperty || itemCondition === 'Unserviceable'
          ? 'Returned'
          : 'Issued',

        accountable_employee: isReturnedProperty ? null : employeeName,
        office_name: officeName,
        responsibility_center: responsibilityCenter,
        fund_cluster: cleanText(fund_cluster),
        unit: cleanText(unit) || 'PC',
        article: cleanText(article) || null,
        dr_ci_si_number: cleanText(dr_ci_si_number) || null,
        po_number: cleanText(po_number) || null,
        supplier: cleanText(supplier) || null,
        remarks: cleanText(remarks) || null
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      console.log(error)

      const referenceError = getItemReferenceError(error, 'updated')

      if (referenceError) {
        return res.status(409).json({
          error: referenceError
        })
      }

      return res.status(500).json({
        error: error.message
      })
    }

    try {
      await createAuditLog(
        'Updated',
        data.id,
        JSON.stringify(oldData),
        JSON.stringify(data),
        'Updated item: ' + data.description,
        req.profile ? req.profile.id : null
      )
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to update item'
    })
  }
})

// ==========================================
// 7. DELETE ITEM
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { data: oldData, error: oldError } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      return res.status(404).json({
        error: 'Item not found'
      })
    }

    // A property with a recorded return must remain in the inventory.
    // This check protects return history even if receipt relationships change.
    const { data: linkedReturns, error: returnLookupError } = await supabase
      .from('item_returns')
      .select('id')
      .eq('item_id', req.params.id)
      .limit(1)

    if (returnLookupError) {
      console.error('Could not verify property return history:', returnLookupError)
      return res.status(500).json({
        error: 'Could not verify whether this property has a recorded return.',
        details: returnLookupError.message
      })
    }

    if (linkedReturns && linkedReturns.length > 0) {
      return res.status(409).json({
        error: 'This property cannot be deleted because it has a recorded return. Keep the property to preserve its return history.'
      })
    }

    // A property linked to an acquisition/issuance receipt must remain
    // in the property records so its receipt history stays intact.
    const { data: linkedReceipts, error: receiptLookupError } = await supabase
      .from('property_receipts')
      .select('id, receipt_number')
      .eq('item_id', req.params.id)
      .limit(1)

    if (receiptLookupError) {
      console.error('Could not verify property receipt history:', receiptLookupError)
      return res.status(500).json({
        error: 'Could not verify whether this property has an acquisition or issuance receipt.',
        details: receiptLookupError.message
      })
    }

    if (linkedReceipts && linkedReceipts.length > 0) {
      return res.status(409).json({
        error: 'This property cannot be deleted because it already has an acquisition or issuance receipt' +
          (linkedReceipts[0].receipt_number
            ? ' (' + linkedReceipts[0].receipt_number + ').'
            : '.')
      })
    }

    const {
      data: detachedRequests,
      error: requestError
    } = await supabase
      .from('item_requests')
      .update({ item_id: null })
      .eq('item_id', req.params.id)
      .select('id, request_number')

    if (requestError) {
      console.log(requestError)

      return res.status(500).json({
        error: 'Could not preserve item request history.',
        details: requestError.message
      })
    }

    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', req.params.id)

    if (deleteError) {
      console.log(deleteError)

      const referenceError = getItemReferenceError(deleteError, 'deleted')

      if (referenceError) {
        return res.status(409).json({
          error: referenceError
        })
      }

      return res.status(500).json({
        error: deleteError.message
      })
    }

    try {
      await createAuditLog(
        'Deleted',
        req.params.id,
        JSON.stringify(oldData),
        JSON.stringify({
          detached_request_count: detachedRequests?.length || 0,
          detached_requests: (detachedRequests || []).map(request => ({
            request_number: request.request_number,
            item_id: null
          }))
        }),
        'Deleted item: ' + oldData.description,
        req.profile ? req.profile.id : null
      )
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json({
      message: 'Item deleted successfully'
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to delete item'
    })
  }
})

module.exports = router
