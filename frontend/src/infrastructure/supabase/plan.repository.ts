import type { Plan } from '@/domain/member/member.types';

export const planRepository = {
  async getActivePlans(): Promise<Plan[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/plans`);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al consultar planes disponibles');
    }

    const data = await res.json();
    return (data.plans || []) as Plan[];
  },
};

export default planRepository;

