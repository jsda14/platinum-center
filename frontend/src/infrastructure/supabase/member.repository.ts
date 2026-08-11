import { supabase } from './client';
import type { Member, MemberDayPass, Payment, Suggestion } from '../../domain/member/member.types';

export const memberRepository = {
  async getMemberByProfileId(profileId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return (data || null) as Member | null;
  },

  async getOrCreateMemberByProfileId(profileId: string): Promise<Member> {
    const existing = await this.getMemberByProfileId(profileId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('members')
      .insert({
        profile_id: profileId,
        status: 'expired',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
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
  },

  async getPaymentsByMemberId(memberId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as Payment[];
  },

  async createSuggestion(memberId: string, message: string): Promise<Suggestion> {
    const { data, error } = await supabase
      .from('suggestions')
      .insert({
        member_id: memberId,
        message,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as Suggestion;
  },

  async getSuggestionsByMemberId(memberId: string): Promise<Suggestion[]> {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as Suggestion[];
  }
};
