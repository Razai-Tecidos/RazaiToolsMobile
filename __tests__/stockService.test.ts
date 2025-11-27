/**
 * Testes do Stock Service
 * Garantem que as regras de negócio de estoque continuem consistentes.
 */

import { stockService } from '../lib/services/stockService';
import { supabase } from '../lib/supabase';

describe('stockService - registerMovement', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve chamar a RPC de movimentação com os parâmetros corretos', async () => {
    const rpcMock = jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: null } as any);

    await stockService.registerMovement({
      link_id: 'link-123',
      type: 'IN',
      quantity: 4,
    });

    expect(rpcMock).toHaveBeenCalledWith('register_stock_movement', {
      p_link_id: 'link-123',
      p_type: 'IN',
      p_quantity: 4,
      p_user_id: null,
    });
  });

  it('deve lançar erro quando a RPC retornar erro', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { message: 'RPC error' },
    } as any);

    await expect(
      stockService.registerMovement({ link_id: 'link-1', type: 'OUT', quantity: 2 })
    ).rejects.toThrow('RPC error');
  });
});

describe('stockService - zeroStock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve registrar saída completa quando há estoque disponível', async () => {
    jest.spyOn(stockService, 'getLevel').mockResolvedValue(7);
    const registerMovementSpy = jest
      .spyOn(stockService, 'registerMovement')
      .mockResolvedValue();

    await stockService.zeroStock('link-abc');

    expect(registerMovementSpy).toHaveBeenCalledTimes(1);
    expect(registerMovementSpy).toHaveBeenCalledWith({
      link_id: 'link-abc',
      type: 'OUT',
      quantity: 7,
    });
  });

  it('deve registrar ajuste para zero quando não há estoque', async () => {
    jest.spyOn(stockService, 'getLevel').mockResolvedValue(0);
    const registerMovementSpy = jest
      .spyOn(stockService, 'registerMovement')
      .mockResolvedValue();

    await stockService.zeroStock('link-xyz');

    expect(registerMovementSpy).toHaveBeenCalledWith({
      link_id: 'link-xyz',
      type: 'ADJUST',
      quantity: 0,
    });
  });
});

describe('stockService - helpers de cálculo', () => {
  it('calculateStatus deve classificar corretamente o estoque', () => {
    expect(stockService.calculateStatus(0)).toBe('CRITICAL');
    expect(stockService.calculateStatus(5)).toBe('CRITICAL');
    expect(stockService.calculateStatus(7)).toBe('WARNING');
    expect(stockService.calculateStatus(12)).toBe('SAFE');
  });

  it('calculateSuggestedBuy deve sugerir compra quando estoque < meta', () => {
    // targetDays 10 * consumo 0.5 = meta 5
    expect(stockService.calculateSuggestedBuy(2, 10)).toBe(3);
    expect(stockService.calculateSuggestedBuy(6, 10)).toBe(0);
  });
});
