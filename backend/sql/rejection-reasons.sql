ALTER TABLE public.item_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;
