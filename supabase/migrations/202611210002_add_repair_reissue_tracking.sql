-- Keep the purpose of employee return requests in the permanent return record.
ALTER TABLE public.item_returns
  ADD COLUMN IF NOT EXISTS return_purpose text;

-- Link a repair return to the new receipt created when the repaired property
-- is issued again to the same accountable employee.
ALTER TABLE public.item_returns
  ADD COLUMN IF NOT EXISTS reissued_receipt_id uuid
  REFERENCES public.property_receipts(id);

CREATE INDEX IF NOT EXISTS item_returns_reissued_receipt_id_idx
  ON public.item_returns(reissued_receipt_id);
