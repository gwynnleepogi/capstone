const express = require('express')
const router = express.Router()

const supabase = require('../supabase')

// Read-only item details for the QR scanner.
// Open to every logged-in role (including Teacher and Non-Teaching Staff),
// unlike /api/items which is Administrator / Personnel only.
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        id,
        property_number,
        description,
        serial_number,
        model_number,
        quantity,
        unit,
        status,
        condition,
        classification,
        cost,
        acquisition_date,
        accountable_employee,
        responsibility_center,
        fund_cluster
      `)
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) {
      console.log(error)
      return res.status(500).json({ error: 'Failed to load item details.' })
    }

    if (!data) {
      return res.status(404).json({ error: 'Item not found.' })
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('quantity, date_issued, created_at')
      .eq('item_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (receiptError) {
      console.log(receiptError)
      return res.status(500).json({ error: 'Failed to load issued quantity.' })
    }

    res.json({
      ...data,
      issued_quantity: Number(receipt?.quantity) > 0 ? Number(receipt.quantity) : null
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to load item details.' })
  }
})

module.exports = router
