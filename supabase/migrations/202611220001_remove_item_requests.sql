-- Remove the unused employee item-request workflow.
-- Receipts are issued directly by administrators from assigned properties.
ALTER TABLE public.property_receipts
  DROP COLUMN IF EXISTS item_request_id;

DROP TABLE IF EXISTS public.item_requests;
