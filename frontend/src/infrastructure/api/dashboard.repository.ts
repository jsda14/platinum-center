import { store } from '../store/store';
import type { DashboardMetrics } from '../supabase/admin.repository';

export const dashboardRepository = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const state = store.getState();
    const token = state.auth.accessToken;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/admin/dashboard/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al obtener las métricas del servidor.');
    }

    return response.json();
  }
};
