/**
 * Color Service - RazaiToolsMobile
 * Camada de acesso a dados para Cores.
 */

import { supabase } from '../supabase';
import type { Color, ColorInput } from '../../types';

export const colorService = {
  /**
   * Lista todas as cores ordenadas por nome
   */
  async list(): Promise<Color[]> {
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca uma cor por ID
   */
  async getById(id: string): Promise<Color | null> {
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  /**
   * Busca cores por termo (nome ou SKU)
   */
  async search(term: string): Promise<Color[]> {
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .order('name')
      .limit(50);
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Lista cores por família
   */
  async listByFamily(family: string): Promise<Color[]> {
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .eq('family', family)
      .order('name');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Conta total de cores
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('colors')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    return count || 0;
  },
};
