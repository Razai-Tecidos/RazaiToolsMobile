/**
 * useColors - Hook para gerenciamento de cores
 */

import { useQuery } from '@tanstack/react-query';
import { colorService } from '../lib/services';
import type { Color } from '../types';

export function useColors() {
  return useQuery<Color[]>({
    queryKey: ['colors'],
    queryFn: () => colorService.list(),
  });
}

export function useColor(id: string) {
  return useQuery<Color | null>({
    queryKey: ['colors', id],
    queryFn: () => colorService.getById(id),
    enabled: !!id,
  });
}

export function useColorSearch(term: string) {
  return useQuery<Color[]>({
    queryKey: ['colors', 'search', term],
    queryFn: () => colorService.search(term),
    enabled: term.length > 1,
  });
}

export function useColorsCount() {
  return useQuery<number>({
    queryKey: ['colors', 'count'],
    queryFn: () => colorService.count(),
  });
}
