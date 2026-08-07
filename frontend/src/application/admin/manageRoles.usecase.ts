import { adminRepository } from '../../infrastructure/supabase/admin.repository';
import type { Profile, UserRole } from '../../domain/member/member.types';

export async function getAllUsers(): Promise<Profile[]> {
  return adminRepository.getAllUsers();
}

export async function updateUserRole(profileId: string, newRole: UserRole): Promise<void> {
  return adminRepository.updateUserRole(profileId, newRole);
}
