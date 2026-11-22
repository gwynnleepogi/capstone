const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const createAuditLog = require('../middleware/auditLog')

function getReturnedStatus() {
  return 'Returned'
}

async function syncReturnedItem(itemId, condition, quantity) {
  const updates = {
    condition,
    status: getReturnedStatus(condition, quantity),
    accountable_employee: null
  }

  if (quantity !== undefined) {
    updates.quantity = quantity
  }

  return supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select('id, quantity, condition, status, accountable_employee')
    .single()
}

router.get('/', async (req, res) => {
  try {
    // Do not embed property_receipts here. item_returns has two foreign keys
    // to property_receipts (the original receipt and the reissued receipt),
    // so PostgREST cannot safely infer which relationship to use.
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

    const receiptIds = [...new Set((data || [])
      .flatMap(row => [row.property_receipt_id, row.reissued_receipt_id])
      .filter(Boolean))]

    let receiptsById = {}
    if (receiptIds.length) {
      const { data: receiptRows, error: receiptError } = await supabase
        .from('property_receipts')
        .select('id, receipt_number, quantity, date_issued, status')
        .in('id', receiptIds)

      if (receiptError) {
        return res.status(500).json({ error: receiptError.message })
      }

      receiptsById = Object.fromEntries((receiptRows || []).map(receipt => [String(receipt.id), receipt]))
    }

    const results = (data || []).map(row => ({
      ...row,
      property_receipts: receiptsById[String(row.property_receipt_id)] || null,
      reissued_receipt: receiptsById[String(row.reissued_receipt_id)] || null
    }))

    res.json(results)
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

    // Every property recorded through Add Return is automatically Unserviceable.
    const finalCondition = 'Unserviceable'

    const { data: receipt, error: receiptError } = await supabase
      .from('property_receipts')
      .select('id, item_id, quantity, status, receipt_number')
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

    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('return_requests')
      .select('id')
      .eq('property_receipt_id', receipt.id)
      .eq('status', 'Pending')
      .maybeSingle()

    if (pendingRequestError) {
      return res.status(500).json({ error: pendingRequestError.message })
    }

    if (pendingRequest) {
      return res.status(409).json({
        error: 'This property has a pending return request. Accept or reject it in Return Requests first.'
      })
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
      .select('id, description, property_number, quantity, status, condition, accountable_employee')
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
        condition_after_return: finalCondition,
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

    const { data: updatedItem, error: syncError } = await syncReturnedItem(
      newReturn.item_id,
      finalCondition,
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

    const { data: closedReceipt, error: closeReceiptError } = await supabase
      .from('property_receipts')
      .update({ status: 'Returned' })
      .eq('id', receipt.id)
      .eq('status', 'Issued')
      .select('id')
      .maybeSingle()

    if (closeReceiptError || !closedReceipt) {
      await supabase.from('items').update({
        condition: item.condition,
        status: item.status,
        accountable_employee: item.accountable_employee,
        quantity: currentQuantity
      }).eq('id', item.id)
      await supabase.from('item_returns').delete().eq('id', newReturn.id)
      return res.status(closeReceiptError ? 500 : 409).json({
        error: closeReceiptError?.message || 'The receipt status changed before the return could be completed.'
      })
    }

    await createAuditLog(
      'Returned',
      newReturn.item_id,
      JSON.stringify({
        description: item.description,
        property_number: item.property_number,
        status: item.status,
        condition: item.condition,
        accountable_employee: item.accountable_employee,
        quantity: currentQuantity
      }),
      JSON.stringify({
        description: item.description,
        property_number: item.property_number,
        receipt_number: receipt.receipt_number,
        status: updatedItem.status,
        condition: updatedItem.condition,
        accountable_employee: updatedItem.accountable_employee,
        old_quantity: currentQuantity,
        new_quantity: updatedItem.quantity,
        condition_after_return: finalCondition,
        return_date: newReturn.return_date,
        returned_by: newReturn.returned_by,
        office_id: newReturn.office_id,
        return_reason: newReturn.return_reason,
        remarks: newReturn.remarks
      }),
      `Recorded return for ${item.description} (receipt ${receipt.receipt_number}); restored quantity ${receiptQuantity}`,
      req.profile?.id
    )

    res.status(201).json(newReturn)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


/*
 * Reissue a property after repair to the employee who returned it.
 * A fresh receipt is created so the original return and receipt history remain intact.
 */
router.patch('/:id/reissue', async (req, res) => {
  try {
    const { data: returned, error: returnError } = await supabase
      .from('item_returns')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (returnError || !returned) {
      return res.status(404).json({ error: 'Recorded return not found.' })
    }

    if (returned.return_purpose !== 'Repair') {
      return res.status(400).json({ error: 'Only properties returned for repair can be reissued through this action.' })
    }

    if (returned.reissued_receipt_id) {
      return res.status(409).json({ error: 'This repaired property has already been reissued.' })
    }

    if (!returned.returned_by) {
      return res.status(400).json({ error: 'The original accountable employee could not be identified.' })
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', returned.item_id)
      .single()

    if (itemError || !item) {
      return res.status(404).json({ error: 'The inventory property could not be found.' })
    }

    if (item.status !== 'Returned') {
      return res.status(409).json({ error: 'This property is not currently in Returned status.' })
    }

    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select('id, full_name, office_id')
      .eq('id', returned.returned_by)
      .single()

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'The employee who returned this property could not be found.' })
    }

    const { data: oldReceipt, error: oldReceiptError } = await supabase
      .from('property_receipts')
      .select('id, receipt_number, quantity')
      .eq('id', returned.property_receipt_id)
      .single()

    if (oldReceiptError || !oldReceipt) {
      return res.status(404).json({ error: 'The original issued receipt could not be found.' })
    }

    // Do not issue a second active receipt for the same inventory item.
    const { data: issuedReceipts, error: issuedReceiptsError } = await supabase
      .from('property_receipts')
      .select('id')
      .eq('item_id', item.id)
      .eq('status', 'Issued')

    if (issuedReceiptsError) {
      return res.status(500).json({ error: issuedReceiptsError.message })
    }

    const issuedReceiptIds = (issuedReceipts || []).map(row => row.id)
    if (issuedReceiptIds.length) {
      const { data: linkedReturns, error: linkedReturnsError } = await supabase
        .from('item_returns')
        .select('property_receipt_id')
        .in('property_receipt_id', issuedReceiptIds)

      if (linkedReturnsError) {
        return res.status(500).json({ error: linkedReturnsError.message })
      }

      const returnedReceiptIds = new Set((linkedReturns || []).map(row => String(row.property_receipt_id)))
      const activeReceipt = issuedReceipts.find(row => !returnedReceiptIds.has(String(row.id)))
      if (activeReceipt) {
        return res.status(409).json({ error: 'This property already has an active issued receipt.' })
      }
    }

    const { data: office, error: officeError } = employee.office_id
      ? await supabase.from('offices').select('office_name').eq('id', employee.office_id).maybeSingle()
      : { data: null, error: null }

    if (officeError) {
      return res.status(500).json({ error: officeError.message })
    }

    const { data: existingReceipts, error: numberLookupError } = await supabase
      .from('property_receipts')
      .select('receipt_number')

    if (numberLookupError) {
      return res.status(500).json({ error: 'Unable to generate a new receipt number.' })
    }

    let highestNumber = -1
    for (const existing of existingReceipts || []) {
      const match = String(existing.receipt_number || '').match(/^(\\d{5})-(\\d{4})$/)
      if (match) {
        const numericValue = Number(match[1]) * 10000 + Number(match[2])
        if (numericValue > highestNumber) highestNumber = numericValue
      }
    }

    const nextNumber = highestNumber + 1
    if (nextNumber > 999999999) {
      return res.status(409).json({ error: 'Receipt number limit has been reached.' })
    }

    const receiptNumber =
      String(Math.floor(nextNumber / 10000)).padStart(5, '0') +
      '-' +
      String(nextNumber % 10000).padStart(4, '0')
    const receiptType = Number(item.cost || 0) >= 50000 ? 'PAR' : 'ICS'
    const issueDate = new Date().toISOString().split('T')[0]

    const { data: newReceipt, error: createReceiptError } = await supabase
      .from('property_receipts')
      .insert([{
        item_id: item.id,
        receipt_type: receiptType,
        transaction_type: 'Reissuance',
        receipt_number: receiptNumber,
        issued_to: employee.id,
        quantity: Number(oldReceipt.quantity) || 1,
        date_issued: issueDate,
        remarks: 'Reissued to the same accountable employee after repair.',
        status: 'Issued'
      }])
      .select()
      .single()

    if (createReceiptError) {
      return res.status(500).json({ error: createReceiptError.message })
    }

    const updatedItemValues = {
      condition: 'Serviceable',
      status: 'Issued',
      accountable_employee: employee.full_name,
      office_name: office?.office_name || item.office_name,
      responsibility_center: office?.office_name || item.responsibility_center
    }

    const { data: updatedItem, error: updateItemError } = await supabase
      .from('items')
      .update(updatedItemValues)
      .eq('id', item.id)
      .eq('status', 'Returned')
      .select()
      .maybeSingle()

    if (updateItemError || !updatedItem) {
      await supabase.from('property_receipts').delete().eq('id', newReceipt.id)
      return res.status(updateItemError ? 500 : 409).json({
        error: updateItemError?.message || 'The property status changed before it could be reissued.'
      })
    }

    const { data: updatedReturn, error: linkError } = await supabase
      .from('item_returns')
      .update({ reissued_receipt_id: newReceipt.id })
      .eq('id', returned.id)
      .is('reissued_receipt_id', null)
      .select()
      .maybeSingle()

    if (linkError || !updatedReturn) {
      await supabase.from('items').update({
        condition: item.condition,
        status: item.status,
        accountable_employee: item.accountable_employee,
        office_name: item.office_name,
        responsibility_center: item.responsibility_center
      }).eq('id', item.id)
      await supabase.from('property_receipts').delete().eq('id', newReceipt.id)
      return res.status(linkError ? 500 : 409).json({
        error: linkError?.message || 'This return record has already been reissued.'
      })
    }

    await createAuditLog(
      'Reissued After Repair',
      item.id,
      JSON.stringify({
        status: item.status,
        condition: item.condition,
        accountable_employee: item.accountable_employee
      }),
      JSON.stringify({
        status: 'Issued',
        condition: 'Serviceable',
        accountable_employee: employee.full_name,
        receipt_number: newReceipt.receipt_number,
        receipt_type: newReceipt.receipt_type
      }),
      'Reissued repaired property to ' + employee.full_name,
      req.profile?.id
    )

    res.status(201).json({
      message: 'Property marked Serviceable and reissued to ' + employee.full_name + '.',
      receipt: newReceipt,
      item: updatedItem,
      return_record: updatedReturn
    })
  } catch (error) {
    console.error('Reissue after repair failed:', error)
    res.status(500).json({ error: error.message || 'Failed to reissue repaired property.' })
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

    // Returned property records must remain Unserviceable.
    const finalCondition = 'Unserviceable'

    const { data: oldReturn, error: oldReturnError } = await supabase
      .from('item_returns')
      .select('*, items (id, description, property_number, condition, status, quantity, accountable_employee)')
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
        condition_after_return: finalCondition,
        return_reason: return_reason || null,
        remarks: remarks || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const { data: updatedItem, error: syncError } = await syncReturnedItem(
      updatedReturn.item_id,
      finalCondition
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
      JSON.stringify({
        description: oldReturn.items?.description,
        property_number: oldReturn.items?.property_number,
        status: oldReturn.items?.status,
        condition: oldReturn.items?.condition,
        quantity: oldReturn.items?.quantity,
        accountable_employee: oldReturn.items?.accountable_employee,
        returned_by: oldReturn.returned_by,
        office_id: oldReturn.office_id,
        return_date: oldReturn.return_date,
        condition_after_return: oldReturn.condition_after_return,
        return_reason: oldReturn.return_reason,
        remarks: oldReturn.remarks
      }),
      JSON.stringify({
        description: oldReturn.items?.description,
        property_number: oldReturn.items?.property_number,
        status: updatedItem.status,
        condition: updatedItem.condition,
        quantity: updatedItem.quantity,
        accountable_employee: updatedItem.accountable_employee,
        returned_by: updatedReturn.returned_by,
        office_id: updatedReturn.office_id,
        return_date: updatedReturn.return_date,
        condition_after_return: updatedReturn.condition_after_return,
        return_reason: updatedReturn.return_reason,
        remarks: updatedReturn.remarks
      }),
      `Updated return record for ${oldReturn.items?.description || 'property'}`,
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
      .select('*, items (id, description, property_number, condition, status, quantity, accountable_employee)')
      .eq('id', id)
      .single()

    if (fetchError) {
      return res.status(404).json({ error: fetchError.message })
    }

    let itemBeforeDelete
    let itemAfterDelete
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
        .select('id, description, property_number, quantity, condition, status, accountable_employee')
        .eq('id', deletedReturn.item_id)
        .single()

      // The inventory item may have been deleted before this return record.
      // In that case, keep the return deletable without attempting to restore
      // or modify stock that no longer exists.
      if (itemError || !item) {
        console.warn(
          'Deleting orphaned return record; linked inventory item is missing:',
          deletedReturn.item_id
        )
      }

      if (item) {
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

      // Deleting the return record must not make the property Serviceable again.
      // Keep its returned condition as Unserviceable even when no other return record exists.
      const fallbackCondition = 'Unserviceable'
      const restoredInventory = {
        quantity: nextQuantity,
        status: 'Returned',
        condition: fallbackCondition,
        accountable_employee: null
      }
      itemAfterDelete = restoredInventory

      const { error: updateItemError } = await supabase
        .from('items')
        .update(restoredInventory)
        .eq('id', item.id)

      if (updateItemError) {
        return res.status(500).json({ error: updateItemError.message })
      }
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
      JSON.stringify({
        description: deletedReturn.items?.description,
        property_number: deletedReturn.items?.property_number,
        status: itemBeforeDelete?.status || deletedReturn.items?.status,
        condition: itemBeforeDelete?.condition || deletedReturn.items?.condition,
        quantity: itemBeforeDelete?.quantity ?? deletedReturn.items?.quantity,
        accountable_employee: itemBeforeDelete?.accountable_employee ??
          deletedReturn.items?.accountable_employee,
        returned_by: deletedReturn.returned_by,
        office_id: deletedReturn.office_id,
        return_date: deletedReturn.return_date,
        condition_after_return: deletedReturn.condition_after_return,
        return_reason: deletedReturn.return_reason,
        remarks: deletedReturn.remarks
      }),
      JSON.stringify(itemAfterDelete ? {
        description: itemBeforeDelete.description,
        property_number: itemBeforeDelete.property_number,
        ...itemAfterDelete
      } : {}),
      `Deleted return record for ${deletedReturn.items?.description || 'property'}`,
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