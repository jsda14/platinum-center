-- Platinum Center — Base grants for authenticated role
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.members TO authenticated;
GRANT SELECT ON public.plans TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.member_day_passes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.access_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gym_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.plans TO authenticated;

GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.members TO service_role;


GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.members TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.member_day_passes TO service_role;
GRANT SELECT ON public.plans TO service_role;