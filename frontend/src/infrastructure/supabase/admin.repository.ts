import { supabase } from './client';
import type { Member, Profile, Payment, MemberDayPass, Plan, GymConfig, PlanGroupPricing, UserRole } from '../../domain/member/member.types';


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

export interface AssignChipData {
  member_id: string;
  card_no: string;
  full_name: string;
  sn?: string;
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

async function getAdminAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const adminRepository = {
  async getMembers(withoutChip?: boolean): Promise<MemberWithProfile[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const queryParam = withoutChip ? '?without_chip=true' : '';
    const response = await fetch(`${apiUrl}/admin/members${queryParam}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener miembros');
    }

    const data = await response.json();
    return (data.members || []) as MemberWithProfile[];
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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/members/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        status: data.status,
        plan: data.plan,
        end_date: data.end_date,
        card_no: data.card_no,
        zkteco_user_id: data.zkteco_user_id,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar miembro');
    }

    const detail = await this.getMemberDetail(id);
    return detail.member;
  },

  async suspendMember(id: string): Promise<void> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/members/${id}/suspend`, {
      method: 'PUT',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al suspender miembro');
    }
  },

  async getMemberWithProfile(memberId: string): Promise<MemberWithProfile> {
    const detail = await this.getMemberDetail(memberId);
    return detail.member;
  },

  async registerManualPayment(data: ManualPaymentData): Promise<Payment> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/members/${data.member_id}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: data.amount,
        method: data.method,
        plan: data.plan,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al registrar el pago');
    }

    const resData = await response.json();
    return {
      id: resData.payment_id,
      member_id: data.member_id,
      amount: data.amount,
      method: data.method,
      plan: data.plan,
      status: 'confirmed',
    } as Payment;
  },

  registerPayment(data: ManualPaymentData): Promise<Payment> {
    return this.registerManualPayment(data);
  },

  async getPayments(): Promise<any[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/payments`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener pagos');
    }

    const data = await response.json();
    return (data.payments || []) as any[];
  },

  async getMemberDetail(memberId: string): Promise<MemberDetail> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/members/${memberId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener detalle del miembro');
    }

    const data = await response.json();
    return {
      member: data.member as MemberWithProfile,
      payments: (data.payments || []) as Payment[],
      dayPass: (data.day_pass || data.dayPass || null) as MemberDayPass | null,
    };
  },

  async updateMemberInfo(
    _memberId: string,
    profileId: string,
    data: { fullName: string; email: string; phone?: string | null }
  ): Promise<void> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/profiles/${profileId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar perfil del miembro');
    }
  },

  async getPlans(): Promise<Plan[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/plans`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener planes');
    }

    const data = await response.json();
    return (data.plans || []) as Plan[];
  },

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/plans/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar plan');
    }

    const resData = await response.json();
    return (resData.plan || { id, ...data }) as Plan;
  },

  async createPlan(data: Omit<Plan, 'id' | 'created_at'>): Promise<Plan> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al crear plan');
    }

    const resData = await response.json();
    return resData.plan as Plan;
  },

  async getGymConfig(): Promise<GymConfig> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/gym/config`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener configuración');
    }

    return (await response.json()) as GymConfig;
  },

  async updateGymConfig(data: Partial<GymConfig>): Promise<GymConfig> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/gym/config`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar configuración');
    }

    const resData = await response.json();
    return (resData.config || await this.getGymConfig()) as GymConfig;
  },

  async getGroupPricing(): Promise<PlanGroupPricing[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/group-pricing`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener precios grupales');
    }

    const data = await response.json();
    return (data.pricing || []) as PlanGroupPricing[];
  },

  async updateGroupPricing(id: string, data: Partial<PlanGroupPricing>): Promise<PlanGroupPricing> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/group-pricing/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar precio grupal');
    }

    const resData = await response.json();
    return (resData.pricing || { id, ...data }) as PlanGroupPricing;
  },

  async createGroupPricing(data: Omit<PlanGroupPricing, 'id' | 'created_at'>): Promise<PlanGroupPricing> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/group-pricing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al crear precio grupal');
    }

    const resData = await response.json();
    return resData.pricing as PlanGroupPricing;
  },

  async getCommunications(): Promise<any[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/communications`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener historial de comunicados');
    }

    const data = await response.json();
    return (data.communications || []) as any[];
  },

  async sendCommunication(subject: string, body: string, recipientType: string): Promise<any> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/admin/send-communication`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        subject,
        body,
        recipient_type: recipientType
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al enviar comunicado');
    }

    return response.json();
  },

  async getAllUsers(): Promise<Profile[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/users`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener usuarios');
    }

    const data = await response.json();
    return (data.users || []) as Profile[];
  },

  async updateUserRole(profileId: string, newRole: UserRole): Promise<void> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAdminAuthHeaders();
    const response = await fetch(`${apiUrl}/admin/profiles/${profileId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar el rol');
    }
  },

  async assignChip(data: AssignChipData): Promise<any> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/admin/assign-chip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        member_id: data.member_id,
        card_no: data.card_no,
        full_name: data.full_name,
        sn: data.sn || 'AJYX215160006'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al asignar chip en el servidor.');
    }

    return response.json();
  }
};
