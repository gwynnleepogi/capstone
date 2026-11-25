-- Allow employees to cancel only their own pending property transfer requests.
-- Keep administrator review permissions unchanged.
ALTER TABLE public.property_transfer_requests
  DROP CONSTRAINT IF EXISTS property_transfer_requests_status_check;

ALTER TABLE public.property_transfer_requests
  ADD CONSTRAINT property_transfer_requests_status_check
  CHECK (status IN ('Pending', 'Processing', 'Approved', 'Disapproved', 'Cancelled'));

DROP POLICY IF EXISTS "Employees can cancel their own pending transfer requests"
  ON public.property_transfer_requests;

CREATE POLICY "Employees can cancel their own pending transfer requests"
  ON public.property_transfer_requests
  FOR UPDATE
  TO authenticated
  USING (
    status = 'Pending'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = property_transfer_requests.requested_by
        AND u.auth_user_id = auth.uid()
        AND u.role IN ('Teacher', 'Non-Teaching Staff')
    )
  )
  WITH CHECK (
    status = 'Cancelled'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = property_transfer_requests.requested_by
        AND u.auth_user_id = auth.uid()
        AND u.role IN ('Teacher', 'Non-Teaching Staff')
    )
  );
