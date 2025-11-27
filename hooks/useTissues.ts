/**
 * useTissues - Hook para gerenciamento de tecidos
 */

import { useQuery } from '@tanstack/react-query';
import { tissueService } from '../lib/services';
import type { Tissue } from '../types';

export function useTissues() {
  return useQuery<Tissue[]>({
    queryKey: ['tissues'],
    queryFn: () => tissueService.list(),
  });
}

export function useTissue(id: string) {
  return useQuery<Tissue | null>({
    queryKey: ['tissues', id],
    queryFn: () => tissueService.getById(id),
    enabled: !!id,
  });
}

export function useTissueSearch(term: string) {
  return useQuery<Tissue[]>({
    queryKey: ['tissues', 'search', term],
    queryFn: () => tissueService.search(term),
    enabled: term.length > 1,
  });
}

export function useTissuesCount() {
  return useQuery<number>({
    queryKey: ['tissues', 'count'],
    queryFn: () => tissueService.count(),
  });
}
