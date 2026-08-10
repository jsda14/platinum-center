-- Migration to replace opening_time and closing_time with a JSONB schedule column in gym_config
ALTER TABLE public.gym_config
DROP COLUMN IF EXISTS opening_time,
DROP COLUMN IF EXISTS closing_time,
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{
  "monday": {"open": "05:00", "close": "22:00", "active": true},
  "tuesday": {"open": "05:00", "close": "22:00", "active": true},
  "wednesday": {"open": "05:00", "close": "22:00", "active": true},
  "thursday": {"open": "05:00", "close": "22:00", "active": true},
  "friday": {"open": "05:00", "close": "22:00", "active": true},
  "saturday": {"open": "07:00", "close": "20:00", "active": true},
  "sunday": {"open": "08:00", "close": "14:00", "active": true}
}';
