-- Tighten the public insert policy so anonymous access requests can still be
-- submitted, but only with the limited shape expected by the public form.

DO $$
BEGIN
  IF to_regclass('public.signup_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create signup requests" ON public.signup_requests;
    DROP POLICY IF EXISTS "signup_requests_public_insert" ON public.signup_requests;

    CREATE POLICY "Anyone can create signup requests"
    ON public.signup_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      type IN ('new', 'extend')
      AND status = 'pending'
      AND handled_by IS NULL
      AND handled_at IS NULL
      AND NULLIF(BTRIM(full_name), '') IS NOT NULL
      AND NULLIF(BTRIM(email), '') IS NOT NULL
      AND NULLIF(BTRIM(phone), '') IS NOT NULL
      AND (
        notes IS NULL
        OR NULLIF(BTRIM(notes), '') IS NOT NULL
      )
    );
  END IF;
END
$$;
