-- Delete one property and all records that belong to it in a single transaction.
-- Shared transfer requests keep the receipt IDs for every property that remains.
CREATE OR REPLACE FUNCTION public.delete_property_with_history(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_ids uuid[];
BEGIN
  -- Lock the property so another transaction cannot change its linked records
  -- while deletion is being processed.
  PERFORM 1
  FROM public.items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_receipt_ids
  FROM public.property_receipts
  WHERE item_id = p_item_id;

  -- Remove only this property's receipt IDs from shared transfer requests.
  -- Requests with other properties remain available with those properties.
  IF cardinality(v_receipt_ids) > 0 THEN
    UPDATE public.property_transfer_requests
    SET property_receipt_ids = ARRAY(
      SELECT receipt_id
      FROM unnest(property_receipt_ids) AS ids(receipt_id)
      WHERE NOT (receipt_id = ANY(v_receipt_ids))
    )
    WHERE property_receipt_ids && v_receipt_ids;

    DELETE FROM public.property_transfer_requests
    WHERE cardinality(property_receipt_ids) = 0;
  END IF;

  -- Delete child records before their linked receipts.
  DELETE FROM public.item_transfers
  WHERE item_id = p_item_id
     OR property_receipt_id = ANY(v_receipt_ids);

  DELETE FROM public.return_requests
  WHERE item_id = p_item_id
     OR property_receipt_id = ANY(v_receipt_ids);

  DELETE FROM public.item_returns
  WHERE item_id = p_item_id
     OR property_receipt_id = ANY(v_receipt_ids)
     OR reissued_receipt_id = ANY(v_receipt_ids);

  -- Keep audit logs as a system audit trail, but remove their foreign-key
  -- link to the property so they cannot block its deletion.
  UPDATE public.audit_logs
  SET item_id = NULL
  WHERE item_id = p_item_id;

  DELETE FROM public.property_receipts
  WHERE item_id = p_item_id
     OR id = ANY(v_receipt_ids);

  DELETE FROM public.items
  WHERE id = p_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_property_with_history(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_property_with_history(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_property_with_history(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_property_with_history(uuid) TO service_role;
