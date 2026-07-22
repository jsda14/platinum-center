import { supabase } from './client';
import type { Member, MemberDayPass } from '../../domain/member/member.types';

export const memberRepository = {
  async getMemberByProfileId(profileId: string): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error('No se encontró información de membresía para este perfil.');
    }
    return data as Member;
  },

  async getActiveDayPass(memberId: string): Promise<MemberDayPass | null> {
    const { data, error } = await supabase
      .from('member_day_passes')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data as MemberDayPass | null;
  }
};
