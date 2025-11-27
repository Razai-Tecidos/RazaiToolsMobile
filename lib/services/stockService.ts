/**
 * Stock Service - RazaiToolsMobile
 * Camada de acesso a dados para Estoque.
 */

import { supabase } from '../supabase';
import type { StockItem, StockMovement, StockMovementInput, StockStatus } from '../../types';

export const stockService = {
  /**
   * Busca nível de estoque de um link
   */
  async getLevel(linkId: string): Promise<number> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('quantity_rolls')
      .eq('link_id', linkId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return 0; // Não existe = 0
      throw new Error(error.message);
    }
    return data?.quantity_rolls || 0;
  },

  /**
   * Registra movimentação de estoque (usa RPC do Supabase)
   */
  async registerMovement(input: StockMovementInput): Promise<void> {
    const { error } = await supabase.rpc('register_stock_movement', {
      p_link_id: input.link_id,
      p_type: input.type,
      p_quantity: input.quantity,
      p_user_id: null, // TODO: pegar do contexto de auth
    });
    
    if (error) throw new Error(error.message);
  },

  /**
   * Zera o estoque de um link
   */
  async zeroStock(linkId: string): Promise<void> {
    const current = await this.getLevel(linkId);
    
    if (current > 0) {
      await this.registerMovement({
        link_id: linkId,
        type: 'OUT',
        quantity: current,
      });
    } else {
      await this.registerMovement({
        link_id: linkId,
        type: 'ADJUST',
        quantity: 0,
      });
    }
  },

  /**
   * Registra saída de estoque
   */
  async registerOut(linkId: string, quantity: number): Promise<void> {
    await this.registerMovement({
      link_id: linkId,
      type: 'OUT',
      quantity,
    });
  },

  /**
   * Registra entrada de estoque
   */
  async registerIn(linkId: string, quantity: number): Promise<void> {
    await this.registerMovement({
      link_id: linkId,
      type: 'IN',
      quantity,
    });
  },

  /**
   * Calcula status de estoque baseado em quantidade
   */
  calculateStatus(quantity: number, threshold: number = 5): StockStatus {
    if (quantity <= threshold) return 'CRITICAL';
    if (quantity <= threshold * 2) return 'WARNING';
    return 'SAFE';
  },

  /**
   * Calcula quantidade sugerida de compra
   */
  calculateSuggestedBuy(current: number, targetDays: number, avgDailyConsumption: number = 0.5): number {
    const target = targetDays * avgDailyConsumption;
    return current < target ? Math.ceil(target - current) : 0;
  },
};
