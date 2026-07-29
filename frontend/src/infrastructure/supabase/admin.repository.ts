import { supabase } from './client';
import type { Member, Profile, Payment, MemberDayPass, Plan } from '../../domain/member/member.types';

export interface ManualPaymentData {
  member_id: string;
  plan: '1_day' | '15_days' | '1_month' | '1_year';
  amount: number;
  method: 'cash' | 'nequi' | 'daviplata' | 'bold' | 'other';
  notes?: string;
}

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

export interface MemberDetail {
  member: MemberWithProfile;
  payments: Payment[];
  dayPass: MemberDayPass | null;
}

export interface DashboardMetrics {
  totalActiveMembers: number;
  monthlyRevenue: number;
  expiringThisWeek: MemberWithProfile[];
  newMembersThisMonth: number;
  revenueByMonth: { name: string; revenue: number }[];
  planDistribution: { name: string; value: number }[];
  paymentMethodDistribution: { name: string; value: number; method: string }[];
  recentPayments: any[];
  membersWithoutChip: MemberWithProfile[];
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
  },

  async getMemberWithProfile(memberId: string): Promise<MemberWithProfile> {
    const { data, error } = await supabase
      .from('members')
      .select('*, profiles:profile_id(full_name, email, phone)')
      .eq('id', memberId)
      .single();

    if (error) {
      throw new Error(`Error al buscar miembro: ${error.message}`);
    }

    return data as MemberWithProfile;
  },

  async registerManualPayment(data: ManualPaymentData): Promise<Payment> {
    // 1. Obtener la sesión activa para registrar quién lo hizo
    const { data: sessionData } = await supabase.auth.getSession();
    const adminUserId = sessionData.session?.user?.id;

    // 2. Consultar la vigencia del plan en la tabla plans
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('duration_days')
      .eq('slug', data.plan)
      .single();

    if (planError) {
      throw new Error(`Error al buscar plan: ${planError.message}`);
    }

    const durationDays = planData.duration_days;

    // 3. Consultar el estado actual del miembro
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('status, end_date')
      .eq('id', data.member_id)
      .single();

    if (memberError) {
      throw new Error(`Error al buscar miembro: ${memberError.message}`);
    }

    // 4. Lógica de renovación anticipada
    let startDate: string;
    let endDate: string;

    const todayStr = new Date().toISOString().split('T')[0];

    if (memberData.status === 'active' && memberData.end_date && memberData.end_date > todayStr) {
      startDate = memberData.end_date;
    } else {
      startDate = todayStr;
    }

    // Calcular endDate sumando los durationDays a startDate
    const parts = startDate.split('-');
    const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    start.setDate(start.getDate() + durationDays);

    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    endDate = `${year}-${month}-${day}`;

    // 5. Registrar el pago
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        member_id: data.member_id,
        amount: data.amount,
        method: data.method,
        plan: data.plan,
        status: 'confirmed',
        registered_by: adminUserId || null,
        plan_start_date: startDate,
        plan_end_date: endDate
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Error al registrar el pago: ${paymentError.message}`);
    }

    // 6. Actualizar el miembro
    const { error: updateMemberError } = await supabase
      .from('members')
      .update({
        status: 'active',
        plan: data.plan,
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.member_id);

    if (updateMemberError) {
      throw new Error(`Error al actualizar membresía: ${updateMemberError.message}`);
    }

    // 7. Si es un plan de 15 días, registrar el member_day_passes
    if (data.plan === '15_days') {
      const partsStart = startDate.split('-');
      const startD = new Date(Number(partsStart[0]), Number(partsStart[1]) - 1, Number(partsStart[2]));
      startD.setDate(startD.getDate() + 30); // valid_until es valid_from + 30 días
      const y = startD.getFullYear();
      const m = String(startD.getMonth() + 1).padStart(2, '0');
      const d = String(startD.getDate()).padStart(2, '0');
      const validUntil = `${y}-${m}-${d}`;

      const { error: passError } = await supabase
        .from('member_day_passes')
        .insert({
          member_id: data.member_id,
          payment_id: payment.id,
          days_total: 15,
          days_used: 0,
          valid_from: startDate,
          valid_until: validUntil,
          status: 'active'
        });

      if (passError) {
        throw new Error(`Error al registrar pases: ${passError.message}`);
      }
    }

    return payment as Payment;
  },

  async getPayments(): Promise<any[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, members(id, profiles:profile_id(full_name, email))')
      .order('payment_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  },

  async getMemberDetail(memberId: string): Promise<MemberDetail> {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*, profiles:profile_id(full_name, email, phone)')
      .eq('id', memberId)
      .single();

    if (memberError) {
      throw new Error(`Error al obtener miembro: ${memberError.message}`);
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      throw new Error(`Error al obtener pagos: ${paymentsError.message}`);
    }

    let dayPass: MemberDayPass | null = null;
    if (member && member.plan === '15_days') {
      const { data: dayPasses, error: dayPassError } = await supabase
        .from('member_day_passes')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (dayPassError) {
        throw new Error(`Error al obtener pases de día: ${dayPassError.message}`);
      }

      if (dayPasses && dayPasses.length > 0) {
        dayPass = dayPasses[0] as MemberDayPass;
      }
    }

    return {
      member: member as MemberWithProfile,
      payments: (payments || []) as Payment[],
      dayPass
    };
  },

  async updateMemberInfo(
    _memberId: string,
    profileId: string,
    data: { fullName: string; email: string; phone?: string | null }
  ): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone
      })
      .eq('id', profileId);

    if (error) {
      throw new Error(`Error al actualizar perfil del miembro: ${error.message}`);
    }
  },

  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener planes: ${error.message}`);
    }
    return (data || []) as Plan[];
  },

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    const { data: updated, error } = await supabase
      .from('plans')
      .update({
        name: data.name,
        price: data.price,
        duration_days: data.duration_days,
        active: data.active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar plan: ${error.message}`);
    }
    return updated as Plan;
  },

  async createPlan(data: Omit<Plan, 'id' | 'created_at'>): Promise<Plan> {
    const { data: created, error } = await supabase
      .from('plans')
      .insert({
        name: data.name,
        slug: data.slug,
        price: data.price,
        duration_days: data.duration_days,
        active: data.active
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear plan: ${error.message}`);
    }
    return created as Plan;
  }
};
