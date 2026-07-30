-- Platinum Center — Group Pricing and Settings Migration

-- 1. gym_config: Add website and opening_days
ALTER TABLE public.gym_config 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS opening_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'];

-- 2. plan_group_pricing: Create table
CREATE TABLE IF NOT EXISTS public.plan_group_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  min_members INT NOT NULL,
  max_members INT,
  price_per_person NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants for plan_group_pricing
GRANT SELECT ON public.plan_group_pricing TO authenticated;
GRANT ALL ON public.plan_group_pricing TO service_role;

-- 3. communications: Create table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants for communications
GRANT ALL ON public.communications TO service_role;
GRANT SELECT ON public.communications TO authenticated;
GRANT INSERT ON public.communications TO authenticated;

-- RLS policies
ALTER TABLE public.plan_group_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- plan_group_pricing policies
DROP POLICY IF EXISTS "plan_group_pricing_select_policy" ON public.plan_group_pricing;
CREATE POLICY "plan_group_pricing_select_policy" ON public.plan_group_pricing
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_group_pricing_all_policy" ON public.plan_group_pricing;
CREATE POLICY "plan_group_pricing_all_policy" ON public.plan_group_pricing
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- communications policies
DROP POLICY IF EXISTS "communications_select_policy" ON public.communications;
CREATE POLICY "communications_select_policy" ON public.communications
    FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "communications_insert_policy" ON public.communications;
CREATE POLICY "communications_insert_policy" ON public.communications
    FOR INSERT WITH CHECK (public.is_super_admin());
