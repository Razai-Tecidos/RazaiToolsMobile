/**
 * useLinks - Hook para gerenciamento de links (Tecido-Cor)
 */

import { useQuery } from '@tanstack/react-query';
import { linkService } from '../lib/services';
import type { LinkWithDetails } from '../types';

export function useLinks() {
  return useQuery<LinkWithDetails[]>({
    queryKey: ['links'],
    queryFn: () => linkService.list(),
  });
}

export function useActiveLinks() {
  return useQuery<LinkWithDetails[]>({
    queryKey: ['links', 'active'],
    queryFn: () => linkService.listActive(),
  });
}

export function useLink(id: string) {
  return useQuery<LinkWithDetails | null>({
    queryKey: ['links', id],
    queryFn: () => linkService.getById(id),
    enabled: !!id,
  });
}

export function useLinkSearch(term: string) {
  return useQuery<LinkWithDetails[]>({
    queryKey: ['links', 'search', term],
    queryFn: () => linkService.search(term),
    enabled: term.length > 1,
  });
}

export function useLinksByTissue(tissueId: string) {
  return useQuery<LinkWithDetails[]>({
    queryKey: ['links', 'tissue', tissueId],
    queryFn: () => linkService.listByTissue(tissueId),
    enabled: !!tissueId,
  });
}
