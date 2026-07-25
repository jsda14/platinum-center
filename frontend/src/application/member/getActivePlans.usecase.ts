import { planRepository } from '../../infrastructure/supabase/plan.repository';
import type { Plan } from '../../domain/member/member.types';

export async function getActivePlans(): Promise<Plan[]> {
  return await planRepository.getActivePlans();
}
