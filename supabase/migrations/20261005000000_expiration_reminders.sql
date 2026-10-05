ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiration_day_notified BOOLEAN DEFAULT false;

ALTER TABLE public.member_day_passes
  ADD COLUMN IF NOT EXISTS low_days_warning_sent BOOLEAN DEFAULT false;
