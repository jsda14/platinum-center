import { memberRepository } from '../../infrastructure/supabase/member.repository';
import type { Suggestion } from '../../domain/member/member.types';

export async function createSuggestion(memberId: string, message: string): Promise<Suggestion> {
  return await memberRepository.createSuggestion(memberId, message);
}
