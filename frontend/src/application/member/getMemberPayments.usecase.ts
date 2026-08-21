import { memberRepository } from '../../infrastructure/supabase/member.repository';
import type { Payment } from '../../domain/member/member.types';

export async function getMemberPayments(profileId: string): Promise<Payment[]> {
  const member = await memberRepository.getMemberByProfileId(profileId);
  if (!member) {
    return [];
  }
  return await memberRepository.getPaymentsByMemberId(member.id);
}
