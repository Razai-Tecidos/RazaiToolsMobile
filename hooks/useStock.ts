/**
 * useStock - Hook para gerenciamento de estoque
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../lib/services';
import type { StockMovementInput } from '../types';

export function useStockLevel(linkId: string) {
  return useQuery<number>({
    queryKey: ['stock', linkId],
    queryFn: () => stockService.getLevel(linkId),
    enabled: !!linkId,
  });
}

export function useStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StockMovementInput) => stockService.registerMovement(input),
    onSuccess: (_, variables) => {
      // Invalida o cache do estoque desse link
      queryClient.invalidateQueries({ queryKey: ['stock', variables.link_id] });
      // Invalida lista geral de estoque
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useZeroStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => stockService.zeroStock(linkId),
    onSuccess: (_, linkId) => {
      queryClient.invalidateQueries({ queryKey: ['stock', linkId] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useStockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, quantity }: { linkId: string; quantity: number }) => 
      stockService.registerOut(linkId, quantity),
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['stock', linkId] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, quantity }: { linkId: string; quantity: number }) => 
      stockService.registerIn(linkId, quantity),
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['stock', linkId] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
