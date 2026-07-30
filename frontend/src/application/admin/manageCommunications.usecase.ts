import { adminRepository } from '../../infrastructure/supabase/admin.repository';

export async function getCommunicationsHistory(): Promise<any[]> {
  return adminRepository.getCommunications();
}

export async function sendBulkCommunication(
  subject: string,
  body: string,
  recipientType: string
): Promise<any> {
  return adminRepository.sendCommunication(subject, body, recipientType);
}
