/**
 * Tissue Service - RazaiToolsMobile
 * Camada de acesso a dados para Tecidos.
 */

import { supabase } from '../supabase';
import type { Tissue, TissueInput, ApiResponse } from '../../types';

export const tissueService = {
  /**
   * Lista todos os tecidos ordenados por nome
   */
  async list(): Promise<Tissue[]> {
    const { data, error } = await supabase
      .from('tissues')
      .select('*')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca um tecido por ID
   */
  async getById(id: string): Promise<Tissue | null> {
    const { data, error } = await supabase
      .from('tissues')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }
    return data;
  },

  /**
   * Busca tecidos por termo (nome ou SKU)
   */
  async search(term: string): Promise<Tissue[]> {
    const { data, error } = await supabase
      .from('tissues')
      .select('*')
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .order('name')
      .limit(50);
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Conta total de tecidos
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('tissues')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    return count || 0;
  },
};
