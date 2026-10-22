-- Platinum Center — Índices de rendimiento sobre consultas que ya corren en el código
--
-- Contexto: el admin se percibe lento cargando tablas/registros. Ninguna tabla tiene
-- índices más allá de las llaves primarias y los UNIQUE ya existentes (card_no en
-- members, transaction_id en payments). Cada uno de estos índices está atado a una
-- query real:
--
--   - /admin/payments ordena por payment_date, sobre la tabla completa, sin filtro.
--   - /admin/members ordena por created_at y filtra por status (without_chip=true).
--   - zkteco.py's access_event() corre el check "already_entered_today"
--     (member_id + event_type + rango de timestamp) EN CADA SWIPE de tarjeta —
--     es la ruta más caliente de toda la base de datos.
--   - El filtro de fechas de /admin/access-logs y el cron de purga diaria
--     (purge-access-logs) filtran/ordenan por timestamp.
--   - El Bridge del gym consulta pending_commands WHERE status='pending' cada
--     5 minutos vía /admin/pending-commands; la tabla ya tiene 200+ filas.
--
-- No cambia ningún resultado, solo la velocidad de estas consultas.

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
    ON public.payments (payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_members_status
    ON public.members (status);

CREATE INDEX IF NOT EXISTS idx_members_created_at
    ON public.members (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_member_event_timestamp
    ON public.access_logs (member_id, event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp
    ON public.access_logs (timestamp);

CREATE INDEX IF NOT EXISTS idx_pending_commands_status
    ON public.pending_commands (status);
