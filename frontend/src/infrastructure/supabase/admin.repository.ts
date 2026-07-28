import { supabase } from './client';
import type { Member, Profile } from '../../domain/member/member.types';

export interface MemberWithProfile extends Member {
  profiles: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
}

export interface CreateMemberData {
  fullName: string;
  email: string;
  phone?: string;
  plan: '1_day' | '15_days' | '1_month' | '1_year';
  paymentMethod: 'cash' | 'nequi' | 'daviplata' | 'bold' | 'other';
  amount: number;
}

export interface UpdateMemberData {
  fullName?: string;
  email?: string;
  phone?: string | null;
  status?: 'active' | 'expired' | 'suspended';
  plan?: '1_day' | '15_days' | '1_month' | '1_year' | null;
  end_date?: string | null;
  card_no?: string | null;
  zkteco_user_id?: string | null;
}

export const adminRepository = {
  async getMembers(): Promise<MemberWithProfile[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*, profiles:profile_id(full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as MemberWithProfile[];
  },

  async createMember(data: CreateMemberData): Promise<Member> {
    // Obtener la sesión activa para mandar el token de autorización JWT
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/admin/members/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al registrar miembro en el servidor.');
    }

    const createdMember = await response.json();
    return createdMember as Member;
  },

  async updateMember(id: string, data: UpdateMemberData): Promise<Member> {
    const { data: currentMember, error: fetchError } = await supabase
      .from('members')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Error al buscar miembro: ${fetchError.message}`);
    }

    const profileId = currentMember.profile_id;

    if (profileId && (data.fullName !== undefined || data.email !== undefined || data.phone !== undefined)) {
      const profileUpdates: Partial<Profile> = {};
      if (data.fullName !== undefined) profileUpdates.full_name = data.fullName;
      if (data.email !== undefined) profileUpdates.email = data.email;
      if (data.phone !== undefined) profileUpdates.phone = data.phone;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profileId);

      if (profileError) {
        throw new Error(`Error al actualizar perfil: ${profileError.message}`);
      }
    }

    const memberUpdates: Partial<Member> = {};
    if (data.status !== undefined) memberUpdates.status = data.status;
    if (data.plan !== undefined) memberUpdates.plan = data.plan;
    if (data.end_date !== undefined) memberUpdates.end_date = data.end_date;
    if (data.card_no !== undefined) memberUpdates.card_no = data.card_no;
    if (data.zkteco_user_id !== undefined) memberUpdates.zkteco_user_id = data.zkteco_user_id;
    memberUpdates.updated_at = new Date().toISOString();

    const { data: updatedMember, error: memberError } = await supabase
      .from('members')
      .update(memberUpdates)
      .eq('id', id)
      .select()
      .single();

    if (memberError) {
      throw new Error(`Error al actualizar miembro: ${memberError.message}`);
    }

    return updatedMember as Member;
  },

  async suspendMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('members')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Error al suspender miembro: ${error.message}`);
    }
  }
};
