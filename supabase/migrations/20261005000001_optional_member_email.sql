ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_real_email BOOLEAN DEFAULT true;
