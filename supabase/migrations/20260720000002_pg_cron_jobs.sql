-- Platinum Center — pg_cron Scheduled Jobs Migration

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule existing jobs if they exist to ensure idempotency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-members') THEN
        PERFORM cron.unschedule('check-expired-members');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-day-passes') THEN
        PERFORM cron.unschedule('check-expired-day-passes');
    END IF;
END $$;

-- 1. Job: check-expired-members
-- Runs every hour: marks expired members whose end_date is in the past
SELECT cron.schedule(
  'check-expired-members',
  '0 * * * *',
  $$
    UPDATE public.members
    SET status = 'expired', updated_at = NOW()
    WHERE end_date < NOW()
    AND status = 'active';
  $$
);

-- 2. Job: check-expired-day-passes
-- Runs every hour: marks expired day passes whose valid_until is in the past
SELECT cron.schedule(
  'check-expired-day-passes',
  '0 * * * *',
  $$
    UPDATE public.member_day_passes
    SET status = 'expired', updated_at = NOW()
    WHERE valid_until < NOW()
    AND status = 'active';
  $$
);
