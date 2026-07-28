import { adminRepository, type UpdateMemberData } from '../../infrastructure/supabase/admin.repository';
import type { Member } from '../../domain/member/member.types';

export async function updateMember(id: string, data: UpdateMemberData): Promise<Member> {
  return adminRepository.updateMember(id, data);
}
