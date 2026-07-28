import { adminRepository, type MemberWithProfile } from '../../infrastructure/supabase/admin.repository';

export async function getMembers(): Promise<MemberWithProfile[]> {
  return adminRepository.getMembers();
}
