import { supabase } from './client';
import type { Plan } from '../../domain/member/member.types';

export const planRepository = {
  async getActivePlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as Plan[];
  }
};

export default planRepository;
