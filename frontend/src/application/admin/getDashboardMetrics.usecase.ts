import { dashboardRepository } from '../../infrastructure/api/dashboard.repository';
import type { DashboardMetrics } from '../../infrastructure/supabase/admin.repository';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return dashboardRepository.getDashboardMetrics();
}
