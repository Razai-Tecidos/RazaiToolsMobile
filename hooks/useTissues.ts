import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useTissues() {
  return useQuery({
    queryKey: ['tissues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tissues')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}
