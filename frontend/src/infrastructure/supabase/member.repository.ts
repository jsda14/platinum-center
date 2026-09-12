import { store } from '../store/store';
import { supabase } from './client';
import type { Member, MemberDayPass, Payment, Suggestion, GroupPricing, MemberGroup, ValidateEmailResponse } from '../../domain/member/member.types';

async function getAuthHeaders(): Promise<HeadersInit> {
  let token = store.getState().auth.accessToken;
  if (!token) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token || null;
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const memberRepository = {
  async getMemberByProfileId(_profileId?: string): Promise<Member | null> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me`, {
      method: 'GET',
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener datos del miembro desde el servidor');
    }

    const data = await response.json();
    return (data || null) as Member | null;
  },

  async getOrCreateMemberByProfileId(profileId: string): Promise<Member> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/get-or-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ profile_id: profileId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener o crear la membresía');
    }

    const data = await response.json();
    return data as Member;
  },

  async getActiveDayPass(_memberId?: string): Promise<MemberDayPass | null> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/day-passes`, {
      method: 'GET',
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al consultar pases diarios desde el servidor');
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return (data[0] || null) as MemberDayPass | null;
    }
    return (data || null) as MemberDayPass | null;
  },

  async getPaymentsByMemberId(_memberId?: string): Promise<Payment[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/payments`, {
      method: 'GET',
      headers,
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al consultar historial de pagos desde el servidor');
    }

    const data = await response.json();
    return (Array.isArray(data) ? data : []) as Payment[];
  },

  async createSuggestion(_memberId: string, message: string): Promise<Suggestion> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al enviar la sugerencia al servidor');
    }

    const data = await response.json();
    return data as Suggestion;
  },

  async getSuggestionsByMemberId(_memberId?: string): Promise<Suggestion[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/suggestions`, {
      method: 'GET',
      headers,
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al consultar sugerencias desde el servidor');
    }

    const data = await response.json();
    return (Array.isArray(data) ? data : []) as Suggestion[];
  },

  async getGroupPricing(): Promise<GroupPricing[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/group-pricing`);
    if (!response.ok) {
      throw new Error('Error al consultar precios grupales');
    }
    const data = await response.json();
    return (data.pricing || []) as GroupPricing[];
  },

  async getMyGroups(): Promise<MemberGroup[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/groups`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener tus grupos');
    }
    const data = await response.json();
    return (data.groups || []) as MemberGroup[];
  },

  async createGroup(groupData: { name?: string; emails: string[] }): Promise<{ group_id: string; total_members: number }> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/me/groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(groupData),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al crear el grupo');
    }
    return await response.json();
  },

  async validateMemberEmail(email: string): Promise<ValidateEmailResponse> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/members/validate-email?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return { valid: false };
    }
    return (await response.json()) as ValidateEmailResponse;
  },

  async createGroupPaymentIntent(intentData: { order_id: string; plan_slug: string; amount: number; member_ids: string[] }): Promise<{ status: string; total_amount: number; price_per_person: number }> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const headers = await getAuthHeaders();
    const response = await fetch(`${apiUrl}/bold/create-group-payment-intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(intentData),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al registrar la intención de pago grupal');
    }
    return await response.json();
  }
};

