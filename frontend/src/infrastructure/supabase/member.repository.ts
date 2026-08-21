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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/members/get-or-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_id: profileId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: 'Error al obtener o crear la membresía' }));
      throw new Error(errData.detail || 'Error al obtener o crear la membresía');
    }

    const data = await response.json();
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
