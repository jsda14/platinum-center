-- Grant SELECT on gym_config to service_role and anon for status queries
GRANT SELECT ON public.gym_config TO service_role;
GRANT SELECT ON public.gym_config TO anon;
