const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

async function syncReturnedItem(itemId, condition, quantity) {
  const updates = {
    condition,
    status: 'Returned',
    accountable_employee: null
  }

  if (quantity !== undefined) {
    updates.quantity = quantity
  }

  return supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select('id, quantity')
    .single()
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('item_returns')
      .select(`
        *,
        items (
          id,
          description,
          property_number,
          model_number,
          serial_number,
          cost,
          quantity,
          condition,
          status,
          accountable_employee,
          responsibility_center,
          fund_cluster
        ),
        property_receipts (
          id,
          receipt_number,
          quantity,
          date_issued,
          status
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
      property_receipt_id,
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
      remarks
    } = req.body

    if (!property_receipt_id) {
      return res.status(400).json({
        error: 'Please select an issued receipt'
      })
    }

    if (!['Serviceable', 'Unserviceable'].includes(condition_after_return)) {
      return res.status(400).json({
        error: 'Condition must be Serviceable or Unserviceable'
      })
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('id, item_id, quantity, status')
      .eq('id', property_receipt_id)
      .single()

    if (receiptError || !receipt) {
      return res.status(404).json({ error: 'Issued receipt not found' })
    }

    if (receipt.status !== 'Issued') {
      return res.status(400).json({ error: 'Only issued receipts can be returned' })
    }

    const { data: existingReturn, error: existingReturnError } = await supabase
      .from('item_returns')
      .select('id')
      .eq('property_receipt_id', receipt.id)
      .maybeSingle()

    if (existingReturnError) {
      return res.status(500).json({ error: existingReturnError.message })
    }

    if (existingReturn) {
      return res.status(409).json({ error: 'This receipt has already been returned' })
    }

    const { data: legacyReturn, error: legacyReturnError } = await supabase
      .from('item_returns')
      .select('id')
      .eq('item_id', receipt.item_id)
      .is('property_receipt_id', null)
      .maybeSingle()

    if (legacyReturnError) {
      return res.status(500).json({ error: legacyReturnError.message })
    }

    if (legacyReturn) {
      return res.status(409).json({
        error: 'This item has an older return record without a linked receipt. Review its stock before recording another return.'
      })
    }

    const receiptQuantity = Number(receipt.quantity)
    if (!Number.isInteger(receiptQuantity) || receiptQuantity < 1) {
      return res.status(400).json({ error: 'The issued receipt quantity is invalid' })
    }

    const { data: item, error: inventoryError } = await supabase
      .from('items')
      .select('id, quantity, status')
      .eq('id', receipt.item_id)
      .single()

    if (inventoryError || !item) {
      return res.status(404).json({ error: 'Inventory item not found' })
    }

    const currentQuantity = Number(item.quantity ?? 0)
    const updatedQuantity = currentQuantity + receiptQuantity
    if (!Number.isInteger(currentQuantity) || currentQuantity < 0 || !Number.isSafeInteger(updatedQuantity)) {
      return res.status(400).json({ error: 'The inventory quantity is invalid' })
    }

    const { data: newReturn, error } = await supabase
      .from('item_returns')
      .insert([{
        item_id: receipt.item_id,
        property_receipt_id: receipt.id,
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
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This receipt has already been returned' })
      }

      return res.status(500).json({ error: error.message })
    }

    const { error: syncError } = await syncReturnedItem(
      newReturn.item_id,
      newReturn.condition_after_return,
      updatedQuantity
    )

    if (syncError) {
      const { error: rollbackError } = await supabase
        .from('item_returns')
        .delete()
        .eq('id', newReturn.id)

      return res.status(500).json({
        error: `Return was not completed because the item could not be updated: ${syncError.message}`,
        ...(rollbackError && {
          details: `The return record also could not be rolled back: ${rollbackError.message}`
        })
      })
    }

    await createAuditLog(
      'Created',
      newReturn.item_id,
      null,
      JSON.stringify(newReturn),
      `Recorded return for item ID ${receipt.item_id}; restored quantity ${receiptQuantity}`,
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
      returned_by,
      office_id,
      return_date,
      condition_after_return,
      return_reason,
      remarks
    } = req.body

    if (!['Serviceable', 'Unserviceable'].includes(condition_after_return)) {
      return res.status(400).json({
        error: 'Condition must be Serviceable or Unserviceable'
      })
    }

    const { data: oldReturn, error: oldReturnError } = await supabase
      .from('item_returns')
      .select('*')
      .eq('id', id)
      .single()

    if (oldReturnError || !oldReturn) {
      return res.status(404).json({ error: 'Return record not found' })
    }

    const { data: updatedReturn, error } = await supabase
      .from('item_returns')
      .update({
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

    const { error: syncError } = await syncReturnedItem(
      updatedReturn.item_id,
      updatedReturn.condition_after_return
    )

    if (syncError) {
      const { error: rollbackError } = await supabase
        .from('item_returns')
        .update({
          item_id: oldReturn.item_id,
          returned_by: oldReturn.returned_by,
          office_id: oldReturn.office_id,
          return_date: oldReturn.return_date,
          condition_after_return: oldReturn.condition_after_return,
          return_reason: oldReturn.return_reason,
          remarks: oldReturn.remarks
        })
        .eq('id', id)

      return res.status(500).json({
        error: `Return was not completed because the item could not be updated: ${syncError.message}`,
        ...(rollbackError && {
          details: `The return record also could not be rolled back: ${rollbackError.message}`
        })
      })
    }

    await createAuditLog(
      'Updated',
      updatedReturn.item_id,
      JSON.stringify(oldReturn),
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

    let itemBeforeDelete
    if (deletedReturn.property_receipt_id) {
      const { data: receipt, error: receiptError } = await supabase
        .from('property_receipts')
        .select('quantity')
        .eq('id', deletedReturn.property_receipt_id)
        .single()

      if (receiptError || !receipt) {
        return res.status(409).json({ error: 'The linked issued receipt could not be found' })
      }

      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, quantity, condition, status, accountable_employee')
        .eq('id', deletedReturn.item_id)
        .single()

      if (itemError || !item) {
        return res.status(404).json({ error: 'Inventory item not found' })
      }

      const returnedQuantity = Number(receipt.quantity)
      const currentQuantity = Number(item.quantity || 0)
      const nextQuantity = currentQuantity - returnedQuantity
      if (!Number.isInteger(returnedQuantity) || returnedQuantity < 1 || nextQuantity < 0) {
        return res.status(409).json({ error: 'The returned quantity cannot be safely removed from stock' })
      }

      itemBeforeDelete = item
      const { data: otherReturn, error: otherReturnError } = await supabase
        .from('item_returns')
        .select('condition_after_return')
        .eq('item_id', deletedReturn.item_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otherReturnError) {
        return res.status(500).json({ error: otherReturnError.message })
      }

      const restoredInventory = {
        quantity: nextQuantity,
        status: otherReturn ? 'Returned' : nextQuantity > 0 ? 'Available' : 'Issued',
        condition: otherReturn?.condition_after_return || 'Serviceable',
        accountable_employee: null
      }

      const { error: updateItemError } = await supabase
        .from('items')
        .update(restoredInventory)
        .eq('id', item.id)

      if (updateItemError) {
        return res.status(500).json({ error: updateItemError.message })
      }
    }

    const { data: deletedRecord, error: deleteError } = await supabase
      .from('item_returns')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (deleteError || !deletedRecord) {
      const errorMessage = deleteError?.message || 'Return record was not deleted'
      if (itemBeforeDelete) {
        const { error: rollbackError } = await supabase
          .from('items')
          .update({
            quantity: itemBeforeDelete.quantity,
            condition: itemBeforeDelete.condition,
            status: itemBeforeDelete.status,
            accountable_employee: itemBeforeDelete.accountable_employee
          })
          .eq('id', itemBeforeDelete.id)

        if (rollbackError) {
          return res.status(500).json({
            error: `Return could not be deleted: ${errorMessage}`,
            details: `Inventory rollback failed: ${rollbackError.message}`
          })
        }
      }

      return res.status(deleteError ? 500 : 404).json({ error: errorMessage })
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