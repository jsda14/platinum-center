-- Platinum Center — Complete Database Schema
-- Supabase Project TEST: https://kgxtipwpzdljdoluclrs.supabase.co
-- Tables in order of foreign key dependencies:
-- 1. profiles
-- 2. members
-- 3. plans
-- 4. payments
-- 5. member_day_passes
-- 6. access_logs
-- 7. suggestions
-- 8. gym_config

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'receptionist', 'member')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    zkteco_user_id TEXT UNIQUE,
    card_no TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'suspended')),
    plan TEXT CHECK (plan IN ('1_day', '15_days', '1_month', '1_year')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. plans
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    duration_days INT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    amount NUMERIC(10,2) NOT NULL,
    method TEXT CHECK (method IN ('cash', 'nequi', 'daviplata', 'bold', 'other')),
    plan TEXT CHECK (plan IN ('1_day', '15_days', '1_month', '1_year')),
    transaction_id TEXT UNIQUE,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')),
    registered_by UUID REFERENCES public.profiles(id),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    plan_start_date DATE,
    plan_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. member_day_passes
CREATE TABLE IF NOT EXISTS public.member_day_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    payment_id UUID REFERENCES public.payments(id),
    days_total INT DEFAULT 15,
    days_used INT DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    status TEXT CHECK (status IN ('active', 'expired', 'exhausted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    card_no TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('granted', 'denied', 'unknown')),
    door INT,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. suggestions
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    message TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'read', 'answered')) DEFAULT 'pending',
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. gym_config
CREATE TABLE IF NOT EXISTS public.gym_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Gimnasio Platinum Center',
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    opening_time TIME,
    closing_time TIME,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_day_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_config ENABLE ROW LEVEL SECURITY;
