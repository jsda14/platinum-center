import { useEffect } from 'react';
import { notificationsRepository } from '../../infrastructure/supabase/notifications.repository';

export function useMemberStatusRealtime(
 memberId: string | undefined,
 onStatusChange: (status: string) => void
) {
 useEffect(() => {
  if (!memberId) return;

  notificationsRepository.subscribeToMemberStatus(memberId, onStatusChange);

  return () => {
   notificationsRepository.unsubscribe();
  };
 }, [memberId, onStatusChange]);
}
