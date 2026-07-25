import { memberRepository } from '../../infrastructure/supabase/member.repository';
import type { Member, MemberDayPass } from '../../domain/member/member.types';

export interface MemberStatusResult {
  member: Member;
  dayPass: MemberDayPass | null;
  daysRemaining: number;
}

export async function getMemberStatus(profileId: string): Promise<MemberStatusResult> {
  const member = await memberRepository.getMemberByProfileId(profileId);
  let dayPass: MemberDayPass | null = null;
  let daysRemaining = 0;

  if (member.plan === '15_days') {
    dayPass = await memberRepository.getActiveDayPass(member.id);
  }

  // Calculate daysRemaining
  if (member.end_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(member.end_date);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return {
    member,
    dayPass,
    daysRemaining,
  };
}
