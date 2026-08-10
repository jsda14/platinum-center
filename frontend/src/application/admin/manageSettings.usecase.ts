import { adminRepository } from '../../infrastructure/supabase/admin.repository';
import type { GymConfig, PlanGroupPricing } from '../../domain/member/member.types';

export async function getGymConfig(): Promise<GymConfig> {
  return adminRepository.getGymConfig();
}

export async function updateGymConfig(data: Partial<GymConfig>): Promise<GymConfig> {
  return adminRepository.updateGymConfig(data);
}

export async function getGroupPricing(): Promise<PlanGroupPricing[]> {
  return adminRepository.getGroupPricing();
}

export async function updateGroupPricing(id: string, data: Partial<PlanGroupPricing>): Promise<PlanGroupPricing> {
  return adminRepository.updateGroupPricing(id, data);
}

export async function createGroupPricing(data: Omit<PlanGroupPricing, 'id' | 'created_at'>): Promise<PlanGroupPricing> {
  return adminRepository.createGroupPricing(data);
}
