-- Add the ARRP purpose selected by the employee.
ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS return_purpose text;

ALTER TABLE public.return_requests
DROP CONSTRAINT IF EXISTS return_requests_return_purpose_check;

ALTER TABLE public.return_requests
ADD CONSTRAINT return_requests_return_purpose_check
CHECK (
  return_purpose IS NULL OR
  return_purpose IN (
    'Property Utilization/Re-issuance',
    'Repair',
    'Disposal'
  )
);
