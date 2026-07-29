import { adminRepository, type MemberDetail } from '../../infrastructure/supabase/admin.repository';

export async function getMemberDetail(memberId: string): Promise<MemberDetail> {
  return adminRepository.getMemberDetail(memberId);
}
