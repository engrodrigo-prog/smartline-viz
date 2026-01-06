-- Public signup requests (for access provisioning workflow)
-- This table is written by the public "Solicitar acesso" page and reviewed by admins in /admin/requests.

CREATE TABLE IF NOT EXISTS public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'new' CHECK (type IN ('new', 'extend')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS signup_requests_status_created_at_idx
  ON public.signup_requests (status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS signup_requests_unique_pending_email_idx
  ON public.signup_requests (lower(email))
  WHERE status = 'pending';

-- Public can submit requests (no read access)
DROP POLICY IF EXISTS "Anyone can create signup requests" ON public.signup_requests;
CREATE POLICY "Anyone can create signup requests"
ON public.signup_requests
FOR INSERT
WITH CHECK (true);

-- Admins can review and manage requests
DROP POLICY IF EXISTS "Admins can read signup requests" ON public.signup_requests;
CREATE POLICY "Admins can read signup requests"
ON public.signup_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update signup requests" ON public.signup_requests;
CREATE POLICY "Admins can update signup requests"
ON public.signup_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete signup requests" ON public.signup_requests;
CREATE POLICY "Admins can delete signup requests"
ON public.signup_requests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

