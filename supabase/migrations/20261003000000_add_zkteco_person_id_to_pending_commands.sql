-- Migration: Add zkteco_person_id to pending_commands
ALTER TABLE public.pending_commands
ADD COLUMN IF NOT EXISTS zkteco_person_id TEXT;
