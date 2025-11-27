import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useTissueDetails(id: string) {
  return useQuery({
    queryKey: ['tissue', id],
    queryFn: async () => {
      // Fetch Tissue
      const { data: tissue, error: tissueError } = await supabase
        .from('tissues')
        .select('*')
        .eq('id', id)
        .single();
      
      if (tissueError) throw tissueError;

      // Fetch Links (Active)
      const { data: links, error: linksError } = await supabase
        .from('links')
        .select(`
          *,
          colors (*)
        `)
        .eq('tissue_id', id)
        .eq('status', 'Ativo');

      if (linksError) throw linksError;

      return { tissue, links: links || [] };
    },
  });
}
