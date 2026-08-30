import { adminRepository, type AssignChipData } from '../../infrastructure/supabase/admin.repository';

export async function assignChip(data: AssignChipData): Promise<any> {
  return adminRepository.assignChip(data);
}
