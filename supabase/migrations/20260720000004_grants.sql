-- Platinum Center — Base grants for authenticated role
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.members TO authenticated;
GRANT SELECT ON public.plans TO authenticated;