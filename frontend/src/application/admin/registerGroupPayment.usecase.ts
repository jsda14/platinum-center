import { adminRepository } from '../../infrastructure/supabase/admin.repository';
import type { RegisterGroupPaymentData } from '../../domain/member/member.types';

export async function registerGroupPayment(data: RegisterGroupPaymentData) {
  return await adminRepository.registerGroupPayment(data);
}
