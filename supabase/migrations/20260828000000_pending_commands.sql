-- Migration: pending_commands
CREATE TABLE IF NOT EXISTS public.pending_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id),
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate')),
  card_no TEXT,
  zkteco_user_id TEXT,
  full_name TEXT,
  sn TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

ALTER TABLE public.pending_commands ENABLE ROW LEVEL SECURITY;
