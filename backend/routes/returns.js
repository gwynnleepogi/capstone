
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('item_returns')
      .select(`
        *,
        items (
          id,
          description,
          property_number
        ),
        users (
          id,
          full_name
        ),
        offices (
          id,
          office_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const {
      item_id,
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
      remarks
    } = req.body

    if (!item_id) {
      return res.status(400).json({
        error: 'Please select an item'
      })
    }

    if (!condition_after_return) {
      return res.status(400).json({
        error: 'Please select the item condition'
      })
    }

    const { data: newReturn, error } = await supabase
      .from('item_returns')
      .insert([{
        item_id,
        returned_by: returned_by || null,
        office_id: office_id || null,
        return_date: return_date || null,
        condition_after_return,
        return_reason: return_reason || null,
        remarks: remarks || null
      }])
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createAuditLog(
      'Created',
      newReturn.item_id,
      null,
      JSON.stringify(newReturn),
      `Recorded return for item ID ${item_id}`,
      req.profile?.id
    )

    res.status(201).json(newReturn)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const {
      item_id,
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
      remarks
    } = req.body

    if (!item_id) {
      return res.status(400).json({
        error: 'Please select an item'
      })
    }

    if (!condition_after_return) {
      return res.status(400).json({
        error: 'Please select the item condition'
      })
    }

    const { data: updatedReturn, error } = await supabase
      .from('item_returns')
      .update({
        item_id,
        returned_by: returned_by || null,
        office_id: office_id || null,
        return_date: return_date || null,
        condition_after_return,
        return_reason: return_reason || null,
        remarks: remarks || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createAuditLog(
      'Updated',
      updatedReturn.item_id,
      null,
      JSON.stringify(updatedReturn),
      `Updated return record ${id}`,
      req.profile?.id
    )

    res.json(updatedReturn)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: deletedReturn, error: fetchError } = await supabase
      .from('item_returns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      return res.status(404).json({ error: fetchError.message })
    }

    const { error } = await supabase
      .from('item_returns')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await createAuditLog(
      'Deleted',
      deletedReturn.item_id,
      JSON.stringify(deletedReturn),
      null,
      `Deleted return record ${id}`,
      req.profile?.id
    )

    res.json({
      message: 'Return record deleted successfully'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
