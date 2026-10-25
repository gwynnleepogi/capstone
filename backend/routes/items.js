const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

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

    res.json({
      viewUrl
    })
  } catch (error) {
    console.error('Failed to create item document link:', error)
    res.status(500).json({ error: 'Failed to create item document link' })
  }
})

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

    res.json({ personnel, offices })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load options' })
  }
})

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
      classification,
      condition,
      status,
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
      return res.status(400).json({ error: 'Fund Cluster is required.' })
    }

    const itemQuantity = Number(quantity ?? 0)

    if (!Number.isInteger(itemQuantity) || itemQuantity < 0) {
      return res.status(400).json({
        error: 'Quantity must be a non-negative whole number.'
      })
    }

    const { data, error } = await supabase
      .from('items')
      .insert([{
        property_number,
        description,
        model_number,
        serial_number,
        cost,
        quantity: itemQuantity,
        unit: String(unit || '').trim() || 'unit',
        article: String(article || '').trim() || null,
        dr_ci_si_number: String(dr_ci_si_number || '').trim() || null,
        po_number: String(po_number || '').trim() || null,
        supplier: String(supplier || '').trim() || null,
        remarks: String(remarks || '').trim() || null,
        acquisition_date,
        classification,
        condition,
        accountable_employee,
        responsibility_center,
        fund_cluster: String(fund_cluster).trim(),
        status: status || 'Available'
      }])
      .select()
      .single()

    if (error) {
      console.log(error)
      return res.status(500).json({ error: error.message })
    }

    try {
      await createAuditLog(
        'Created',
        data.id,
        null,
        JSON.stringify(data),
        'Added item: ' + data.description,
        req.profile.id
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
      status,
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
      return res.status(400).json({ error: 'Fund Cluster is required.' })
    }

    const itemQuantity = Number(quantity ?? 0)

    if (!Number.isInteger(itemQuantity) || itemQuantity < 0) {
      return res.status(400).json({
        error: 'Quantity must be a non-negative whole number.'
      })
    }

    const { data: oldData, error: oldError } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const { data, error } = await supabase
      .from('items')
      .update({
        property_number,
        description,
        model_number,
        serial_number,
        cost,
        quantity: itemQuantity,
        acquisition_date,
        classification,
        condition,
        status,
        accountable_employee,
        responsibility_center,
        fund_cluster: String(fund_cluster).trim(),
        unit: String(unit || '').trim() || 'unit',
        article: String(article || '').trim() || null,
        dr_ci_si_number: String(dr_ci_si_number || '').trim() || null,
        po_number: String(po_number || '').trim() || null,
        supplier: String(supplier || '').trim() || null,
        remarks: String(remarks || '').trim() || null
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      console.log(error)

      const referenceError = getItemReferenceError(error, 'updated')

      if (referenceError) {
        return res.status(409).json({ error: referenceError })
      }

      return res.status(500).json({ error: error.message })
    }

    try {
      await createAuditLog(
        'Updated',
        data.id,
        JSON.stringify(oldData),
        JSON.stringify(data),
        'Updated item: ' + data.description,
        req.profile.id
      )
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { data: oldData, error: oldError } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (oldError || !oldData) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const { error: requestError } = await supabase
      .from('item_requests')
      .update({ item_id: null })
      .eq('item_id', req.params.id)

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

      const referenceError = getItemReferenceError(
        deleteError,
        'deleted'
      )

      if (referenceError) {
        return res.status(409).json({ error: referenceError })
      }

      return res.status(500).json({ error: deleteError.message })
    }

    try {
      await createAuditLog(
        'Deleted',
        req.params.id,
        JSON.stringify(oldData),
        null,
        'Deleted item: ' + oldData.description,
        req.profile.id
      )
    } catch (auditError) {
      console.log('Audit log error:', auditError)
    }

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

module.exports = router