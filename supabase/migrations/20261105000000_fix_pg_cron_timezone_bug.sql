-- Platinum Center — Fix pg_cron timezone bug
--
-- Los jobs 'check-expired-members' y 'check-expired-day-passes'
-- (migración 20260720000002_pg_cron_jobs.sql) comparaban una columna
-- `date` (end_date / valid_until) directamente contra NOW() (timestamptz).
-- Postgres convierte esa fecha a medianoche UTC para poder comparar, así
-- que como Bogotá es UTC-5, desde las 7:00pm hora Bogotá el día anterior
-- al vencimiento ya aparece "vencido" en UTC -- casi 5 horas antes de
-- tiempo, sin relación alguna con el consumo real de días (days_used)
-- ni con la fecha real en que el miembro debía vencer.
--
-- Caso real que delató el bug: member_id=8e227930-3113-4bfb-98a4-128984efb1c6
-- (card_no=1026044), plan 15_days, days_used=8/15, valid_until='2026-11-06'.
-- El job lo marcó 'expired' la noche del 5 de noviembre (hora Bogotá) en
-- cuanto el reloj UTC cruzó a la medianoche del 6, bloqueando el chip vía
-- /access-event de zkteco.py pese a que al miembro le quedaban 7 días
-- consumibles y su verdadero end_date (07/11) todavía no había llegado.
--
-- Fix: comparar la fecha de la columna contra la fecha calendario en hora
-- Bogotá (NOW() AT TIME ZONE 'America/Bogota'), no contra NOW() en UTC.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-members') THEN
        PERFORM cron.unschedule('check-expired-members');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-day-passes') THEN
        PERFORM cron.unschedule('check-expired-day-passes');
    END IF;
END $$;

-- 1. Job: check-expired-members (corregido)
SELECT cron.schedule(
  'check-expired-members',
  '0 * * * *',
  $$
    UPDATE public.members
    SET status = 'expired', updated_at = NOW()
    WHERE end_date < (NOW() AT TIME ZONE 'America/Bogota')::date
    AND status = 'active';
  $$
);

-- 2. Job: check-expired-day-passes (corregido)
SELECT cron.schedule(
  'check-expired-day-passes',
  '0 * * * *',
  $$
    UPDATE public.member_day_passes
    SET status = 'expired', updated_at = NOW()
    WHERE valid_until < (NOW() AT TIME ZONE 'America/Bogota')::date
    AND status = 'active';
  $$
);

-- 3. Corregir el registro ya afectado: al miembro
-- card_no=1026044 / member_id=8e227930-3113-4bfb-98a4-128984efb1c6 se le
-- marcó el pase y la membresía como 'expired' por el bug de huso horario,
-- no porque realmente se le hayan acabado los días (8/15 usados) ni
-- porque su end_date (07/11) ya hubiera pasado. Se revierte a 'active'.
UPDATE public.member_day_passes
SET status = 'active', updated_at = NOW()
WHERE member_id = '8e227930-3113-4bfb-98a4-128984efb1c6'
AND status = 'expired'
AND valid_until = '2026-11-06';

UPDATE public.members
SET status = 'active', updated_at = NOW()
WHERE id = '8e227930-3113-4bfb-98a4-128984efb1c6'
AND status = 'expired';
