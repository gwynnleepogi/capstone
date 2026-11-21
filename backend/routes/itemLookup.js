const express = require('express')
const router = express.Router()

const supabase = require('../supabase')

// Show only issued receipts owned by the authenticated staff member.
router.get('/mine', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('property_receipts')
      .select(`
        id,
        item_id,
        receipt_number,
        quantity,
        date_issued,
        status,
        items (
          id,
          property_number,
          article,
          description,
          serial_number,
          model_number,
          unit,
          status,
          condition,
          classification,
          cost,
          acquisition_date,
          accountable_employee,
          responsibility_center,
          fund_cluster
        )
      `)
      .eq('issued_to', req.profile.id)
      .eq('status', 'Issued')
      .order('date_issued', { ascending: false })

    if (error) {
      console.error('Failed to load issued properties:', error)
      return res.status(500).json({ error: 'Failed to load your issued properties.' })
    }

    // Accepted returns are recorded in item_returns. Exclude those receipts
    // even if an older workflow left the receipt status as "Issued".
    const { data: returnedReceipts, error: returnsError } = await supabase
      .from('item_returns')
      .select('property_receipt_id')
      .not('property_receipt_id', 'is', null)

    if (returnsError) {
      console.error('Failed to check returned properties:', returnsError)
      return res.status(500).json({ error: 'Failed to check your returned properties.' })
    }

    const returnedReceiptIds = new Set(
      (returnedReceipts || []).map(row => String(row.property_receipt_id))
    )

    const stillIssued = (data || []).filter(
      receipt => !returnedReceiptIds.has(String(receipt.id))
    )

    res.json(stillIssued)
  } catch (error) {
    console.error('Failed to load issued properties:', error)
    res.status(500).json({ error: 'Failed to load your issued properties.' })
  }
})

// Read-only item details for the QR scanner.
// Open to every logged-in role (including Teacher and Non-Teaching Staff),
// unlike /api/items which is Administrator only.
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
