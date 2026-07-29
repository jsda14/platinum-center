import { adminRepository } from '../../infrastructure/supabase/admin.repository';
import type { Plan } from '../../domain/member/member.types';

export async function getPlans(): Promise<Plan[]> {
  return adminRepository.getPlans();
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
  return adminRepository.updatePlan(id, data);
}

export async function createPlan(data: Omit<Plan, 'id' | 'created_at'>): Promise<Plan> {
  return adminRepository.createPlan(data);
}
