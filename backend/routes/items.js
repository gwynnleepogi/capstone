const express = require('express')
const router = express.Router()

const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')


// GET ITEMS

router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {

    console.log(error)

    return res.status(500).json({
      error: error.message
    })

  }

  res.json(data)

})


// ADD ITEM

router.post('/', async (req, res) => {

  const {
    property_number,
    product_number,
    description,
    brand,
    model,
    date_of_purchase,
    purchase_order_number,
    price,
    condition,
    status
  } = req.body


  const { data, error } = await supabase
    .from('items')
    .insert([{

      property_number,
      product_number,
      description,
      brand,
      model,
      date_of_purchase,
      purchase_order_number,
      price,
      condition,
      status: status || 'Available'

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
    'Added item: ' + data.description
  )


  res.status(201).json(data)

})


// UPDATE ITEM

router.put('/:id', async (req, res) => {

  const {
    property_number,
    product_number,
    description,
    brand,
    model,
    date_of_purchase,
    purchase_order_number,
    price,
    condition,
    status
  } = req.body


  // GET OLD ITEM FIRST

  const { data: oldData, error: oldError } = await supabase
    .from('items')
    .select('*')
    .eq('id', req.params.id)
    .single()


  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Item not found'
    })

  }


  // UPDATE ITEM

  const { data, error } = await supabase
    .from('items')
    .update({

      property_number,
      product_number,
      description,
      brand,
      model,
      date_of_purchase,
      purchase_order_number,
      price,
      condition,
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


  // CREATE AUDIT LOG

  await createAuditLog(
    'Updated',
    data.id,
    JSON.stringify(oldData),
    JSON.stringify(data),
    'Updated item: ' + data.description
  )


  res.json(data)

})


// DELETE ITEM

router.delete('/:id', async (req, res) => {


  // GET OLD ITEM BEFORE DELETE

  const { data: oldData, error: oldError } = await supabase
    .from('items')
    .select('*')
    .eq('id', req.params.id)
    .single()


  if (oldError) {

    console.log(oldError)

    return res.status(404).json({
      error: 'Item not found'
    })

  }


  // DELETE ITEM

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', req.params.id)


  if (error) {

    console.log(error)

    return res.status(500).json({
      error: error.message
    })

  }


  // CREATE AUDIT LOG

  await createAuditLog(
    'Deleted',
    req.params.id,
    JSON.stringify(oldData),
    null,
    'Deleted item: ' + oldData.description
  )


  res.json({
    message: 'Item deleted successfully'
  })

})


module.exports = router