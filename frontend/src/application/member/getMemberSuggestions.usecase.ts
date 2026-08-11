import { memberRepository } from '../../infrastructure/supabase/member.repository';
import type { Suggestion } from '../../domain/member/member.types';

export async function getMemberSuggestions(profileId: string): Promise<{ memberId: string | null; suggestions: Suggestion[] }> {
  const member = await memberRepository.getMemberByProfileId(profileId);
  if (!member) {
    return { memberId: null, suggestions: [] };
  }
  const suggestions = await memberRepository.getSuggestionsByMemberId(member.id);
  return { memberId: member.id, suggestions };
}
