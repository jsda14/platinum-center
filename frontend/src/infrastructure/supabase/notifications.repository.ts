import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

let activeChannel: RealtimeChannel | null = null;

export const notificationsRepository = {
 subscribeToMemberStatus(memberId: string, callback: (newStatus: string) => void): RealtimeChannel {
  if (activeChannel) {
   activeChannel.unsubscribe();
  }

  activeChannel = supabase
   .channel(`member-status-${memberId}`)
   .on(
    'postgres_changes',
    {
     event: 'UPDATE',
     schema: 'public',
     table: 'members',
     filter: `id=eq.${memberId}`,
    },
    (payload) => {
     if (payload.new && 'status' in payload.new) {
      callback(payload.new.status as string);
     }
    }
   )
   .subscribe();

  return activeChannel;
 },

 unsubscribe() {
  if (activeChannel) {
   activeChannel.unsubscribe();
   activeChannel = null;
  }
 }
};
