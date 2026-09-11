import type { GymStatus } from '@/domain/gym/gym.types';

export const gymRepository = {
  async getGymStatus(): Promise<GymStatus> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/gym/status`);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener el estado del gimnasio');
    }

    return response.json();
  },
};
