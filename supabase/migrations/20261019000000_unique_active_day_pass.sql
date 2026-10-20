-- Platinum Center — Garantiza un único member_day_pass activo por miembro
--
-- Contexto: un INSERT manual (fuera del flujo normal de activate_member_plan()/
-- webhooks/bold-payment) dejó a un miembro con dos filas 'active' en
-- member_day_passes al mismo tiempo, causando que el sistema contara los días
-- consumidos sobre el pase equivocado. El código de la app ya cierra el pase
-- anterior antes de crear uno nuevo, pero eso depende de que todo código (o
-- intervención manual) se acuerde de hacerlo. Este índice lo garantiza a nivel
-- de base de datos, sin importar el camino por el que se inserte o actualice.

CREATE UNIQUE INDEX IF NOT EXISTS one_active_day_pass_per_member
ON public.member_day_passes (member_id)
WHERE status = 'active';
