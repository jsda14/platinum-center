import { z } from 'zod';

export const userRoleSchema = z.enum(['super_admin', 'receptionist', 'member']);

export const memberStatusSchema = z.enum(['active', 'expired', 'suspended']);

export const planTypeSchema = z.enum(['1_day', '15_days', '1_month', '1_year']);

export const paymentMethodSchema = z.enum(['cash', 'nequi', 'daviplata', 'bold', 'other']);

export const paymentStatusSchema = z.enum(['pending', 'confirmed', 'failed']);

export const dayPassStatusSchema = z.enum(['active', 'expired', 'exhausted']);

export const accessEventTypeSchema = z.enum(['granted', 'denied', 'unknown']);

export const suggestionStatusSchema = z.enum(['pending', 'read', 'answered']);

export const profileSchema = z.object({
  id: z.uuid(),
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().nullable().optional(),
  role: userRoleSchema,
  avatar_url: z.string().nullable().optional(),
  created_at: z.string().optional()
});

export const memberSchema = z.object({
  id: z.uuid(),
  profile_id: z.uuid().nullable().optional(),
  zkteco_user_id: z.string().nullable().optional(),
  card_no: z.string().nullable().optional(),
  status: memberStatusSchema,
  plan: planTypeSchema.nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export const planSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, 'El nombre del plan es requerido'),
  slug: planTypeSchema,
  duration_days: z.number().int().positive(),
  price: z.number().positive(),
  active: z.boolean().default(true),
  created_at: z.string().optional()
});

export const paymentSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  amount: z.number().positive(),
  method: paymentMethodSchema.nullable().optional(),
  plan: planTypeSchema.nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  status: paymentStatusSchema.nullable().optional(),
  registered_by: z.uuid().nullable().optional(),
  payment_date: z.string().optional(),
  plan_start_date: z.string().nullable().optional(),
  plan_end_date: z.string().nullable().optional(),
  created_at: z.string().optional()
});

export const memberDayPassSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  payment_id: z.uuid().nullable().optional(),
  days_total: z.number().int().default(15),
  days_used: z.number().int().default(0),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  status: dayPassStatusSchema.nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export const accessLogSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  card_no: z.string(),
  event_type: accessEventTypeSchema.nullable().optional(),
  door: z.number().int().nullable().optional(),
  timestamp: z.string(),
  raw_payload: z.string().nullable().optional(),
  created_at: z.string().optional()
});

export const suggestionSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  message: z.string().min(1, 'El mensaje no puede estar vacío'),
  status: suggestionStatusSchema.default('pending'),
  response: z.string().nullable().optional(),
  created_at: z.string().optional()
});

export const gymConfigSchema = z.object({
  id: z.uuid(),
  name: z.string().default('Gimnasio Platinum Center'),
  logo_url: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  opening_time: z.string().nullable().optional(),
  closing_time: z.string().nullable().optional(),
  updated_at: z.string().optional()
});
