import { adminRepository, type CreateMemberData } from '../../infrastructure/supabase/admin.repository';
import type { Member } from '../../domain/member/member.types';

export async function createMember(data: CreateMemberData): Promise<Member> {
  return adminRepository.createMember(data);
}
