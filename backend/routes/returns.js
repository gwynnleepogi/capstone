const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')


// GET RETURNS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('item_returns')
    .select(`
      *,
      items (
        description
      ),
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


// ADD RETURN

router.post('/', async (req, res) => {

  const {
    item_id,
    returned_by,
    office_id,
    return_date,
    condition_after_return,
    return_reason,
    remarks
  } = req.body

  const { data, error } = await supabase
    .from('item_returns')
    .insert([{
      item_id,
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
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
    'Added item return',
    req.profile.id
  )

  res.status(201).json(data)
})


// UPDATE RETURN

router.put('/:id', async (req, res) => {

  const {
    item_id,
    returned_by,
    office_id,
    return_date,
    condition_after_return,
    return_reason,
    remarks
  } = req.body


  const { data: oldData, error: oldError } = await supabase
    .from('item_returns')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Return not found'
    })
  }


  const { data, error } = await supabase
    .from('item_returns')
    .update({
      item_id,
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
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
    'Updated item return',
    req.profile.id
  )

  res.json(data)
})


// DELETE RETURN

router.delete('/:id', async (req, res) => {

  const { data: oldData, error: oldError } = await supabase
    .from('item_returns')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Return not found'
    })
  }


  const { error } = await supabase
    .from('item_returns')
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
    'Deleted item return',
    req.profile.id
  )

  res.json({
    message: 'Return deleted successfully'
  })
})


module.exports = router