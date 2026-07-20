import type { z } from 'zod';
import type {
  userRoleSchema,
  memberStatusSchema,
  planTypeSchema,
  paymentMethodSchema,
  paymentStatusSchema,
  dayPassStatusSchema,
  accessEventTypeSchema,
  suggestionStatusSchema,
  profileSchema,
  memberSchema,
  planSchema,
  paymentSchema,
  memberDayPassSchema,
  accessLogSchema,
  suggestionSchema,
  gymConfigSchema
} from './member.schema';

export type UserRole = z.infer<typeof userRoleSchema>;
export type MemberStatus = z.infer<typeof memberStatusSchema>;
export type PlanType = z.infer<typeof planTypeSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type DayPassStatus = z.infer<typeof dayPassStatusSchema>;
export type AccessEventType = z.infer<typeof accessEventTypeSchema>;
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;

export type Profile = z.infer<typeof profileSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type MemberDayPass = z.infer<typeof memberDayPassSchema>;
export type AccessLog = z.infer<typeof accessLogSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type GymConfig = z.infer<typeof gymConfigSchema>;
