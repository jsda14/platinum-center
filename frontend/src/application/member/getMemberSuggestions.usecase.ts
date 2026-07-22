import { memberRepository } from '../../infrastructure/supabase/member.repository';
import type { Suggestion } from '../../domain/member/member.types';

export async function getMemberSuggestions(profileId: string): Promise<{ memberId: string; suggestions: Suggestion[] }> {
  const member = await memberRepository.getMemberByProfileId(profileId);
  const suggestions = await memberRepository.getSuggestionsByMemberId(member.id);
  return { memberId: member.id, suggestions };
}
