ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash', 'nequi', 'daviplata', 'bold', 'other', 'mixed'));

CREATE TABLE IF NOT EXISTS public.payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'nequi', 'daviplata', 'bold', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.payment_splits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_splits TO authenticated;

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que la tabla payments: staff ve todo, un member solo
-- ve los splits de sus propios pagos; solo staff/super_admin escriben.
CREATE POLICY "payment_splits_select_policy" ON public.payment_splits
  FOR SELECT
  USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_splits.payment_id
        AND p.member_id = get_current_member_id()
    )
  );

CREATE POLICY "payment_splits_insert_policy" ON public.payment_splits
  FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "payment_splits_update_policy" ON public.payment_splits
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "payment_splits_delete_policy" ON public.payment_splits
  FOR DELETE
  USING (is_super_admin());
