-- Migration: Drop hardcoded plan CHECK constraints to allow dynamic plans
-- Date: 2026-09-10
-- Reason: Plans are now managed dynamically from the admin panel (plans table).
-- The initial schema hardcoded CHECK (plan IN ('1_day', '15_days', '1_month', '1_year')),
-- which caused payments and member updates to fail when creating custom/dynamic plans.

ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_plan_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_check;
