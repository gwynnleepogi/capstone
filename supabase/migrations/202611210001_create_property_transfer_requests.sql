-- Property transfer requests submitted by employees and processed by the Property Office.
CREATE TABLE IF NOT EXISTS public.property_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES public.users(id),
  from_responsibility_center text,
  property_receipt_ids uuid[] NOT NULL,
  reason text NOT NULL,
  remarks text,
  status text NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Processing', 'Approved', 'Disapproved')),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_remarks text,
  to_user_id uuid REFERENCES public.users(id),
  transfer_date date,
  processed_transfer_group_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_transfer_requests_requested_by_idx
  ON public.property_transfer_requests(requested_by);
CREATE INDEX IF NOT EXISTS property_transfer_requests_status_idx
  ON public.property_transfer_requests(status);

ALTER TABLE public.property_transfer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read property transfer requests" ON public.property_transfer_requests;
CREATE POLICY "Users can read own transfer requests and admins can read all"
  ON public.property_transfer_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = property_transfer_requests.requested_by
        AND u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.role = 'Administrator'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert property transfer requests" ON public.property_transfer_requests;
CREATE POLICY "Employees can submit their own transfer requests"
  ON public.property_transfer_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = property_transfer_requests.requested_by
        AND u.auth_user_id = auth.uid()
        AND u.role IN ('Teacher', 'Non-Teaching Staff')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update property transfer requests" ON public.property_transfer_requests;
CREATE POLICY "Administrators can update transfer requests"
  ON public.property_transfer_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Administrator'
    )
  );
