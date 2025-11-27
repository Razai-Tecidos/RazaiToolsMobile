/**
 * Link Service - RazaiToolsMobile
 * Camada de acesso a dados para Links (Tecido-Cor).
 */

import { supabase } from '../supabase';
import type { Link, LinkWithDetails } from '../../types';

export const linkService = {
  /**
   * Lista todos os links com detalhes de tecido e cor
   */
  async list(): Promise<LinkWithDetails[]> {
    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .order('sku_filho');
    
    if (error) throw new Error(error.message);
    return (data || []) as LinkWithDetails[];
  },

  /**
   * Lista links ativos com detalhes
   */
  async listActive(): Promise<LinkWithDetails[]> {
    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .eq('status', 'Ativo')
      .order('sku_filho');
    
    if (error) throw new Error(error.message);
    return (data || []) as LinkWithDetails[];
  },

  /**
   * Busca um link por ID com detalhes
   */
  async getById(id: string): Promise<LinkWithDetails | null> {
    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data as LinkWithDetails;
  },

  /**
   * Busca links por SKU, nome do tecido ou nome da cor
   */
  async search(term: string): Promise<LinkWithDetails[]> {
    // Primeiro busca tecidos e cores que correspondem
    const [tissuesRes, colorsRes] = await Promise.all([
      supabase.from('tissues').select('id').or(`name.ilike.%${term}%,sku.ilike.%${term}%`),
      supabase.from('colors').select('id').or(`name.ilike.%${term}%,sku.ilike.%${term}%`),
    ]);

    const tissueIds = tissuesRes.data?.map(t => t.id) || [];
    const colorIds = colorsRes.data?.map(c => c.id) || [];

    // Monta query para links
    const conditions = [`sku_filho.ilike.%${term}%`];
    if (tissueIds.length > 0) conditions.push(`tissue_id.in.(${tissueIds.join(',')})`);
    if (colorIds.length > 0) conditions.push(`color_id.in.(${colorIds.join(',')})`);

    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .or(conditions.join(','))
      .limit(50);

    if (error) throw new Error(error.message);
    return (data || []) as LinkWithDetails[];
  },

  /**
   * Lista links por tecido
   */
  async listByTissue(tissueId: string): Promise<LinkWithDetails[]> {
    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .eq('tissue_id', tissueId)
      .eq('status', 'Ativo')
      .order('sku_filho');

    if (error) throw new Error(error.message);
    return (data || []) as LinkWithDetails[];
  },

  /**
   * Retorna URL pública da imagem
   */
  getImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    return supabase.storage.from('tissue-images').getPublicUrl(imagePath).data.publicUrl;
  },
};
