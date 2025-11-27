/**
 * Types - RazaiToolsMobile
 * Interfaces centralizadas para tipagem forte do projeto.
 */

// ============================================
// TISSUE (Tecido)
// ============================================
export interface Tissue {
  id: string;
  name: string;
  sku: string;
  width: number;
  composition: string;
  color?: string;
  created_at: string;
  updated_at?: string;
}

export interface TissueInput {
  name: string;
  width: number;
  composition: string;
  color?: string;
}

// ============================================
// COLOR (Cor)
// ============================================
export interface Color {
  id: string;
  name: string;
  sku: string;
  hex?: string;
  lab_l?: number;
  lab_a?: number;
  lab_b?: number;
  family?: string;
  created_at: string;
}

export interface ColorInput {
  name: string;
  hex?: string;
  lab_l?: number;
  lab_a?: number;
  lab_b?: number;
}

// ============================================
// LINK (Vínculo Tecido-Cor)
// ============================================
export interface Link {
  id: string;
  tissue_id: string;
  color_id: string;
  sku_filho: string;
  image_path?: string;
  status: 'Ativo' | 'Inativo';
  created_at: string;
  
  // Relacionamentos (quando join)
  tissues?: Tissue;
  colors?: Color;
}

export interface LinkWithDetails extends Link {
  tissues: Tissue;
  colors: Color;
}

// ============================================
// STOCK (Estoque)
// ============================================
export interface StockItem {
  id: string;
  link_id: string;
  quantity_rolls: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  link_id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  created_at: string;
  user_id?: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';

export interface StockMovementInput {
  link_id: string;
  type: StockMovementType;
  quantity: number;
}

// ============================================
// PREDICTION (Previsões)
// ============================================
export type StockStatus = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface StockPrediction {
  link_id: string;
  days_until_stockout: number;
  status: StockStatus;
  suggested_restock: number;
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ============================================
// AUTH
// ============================================
export interface User {
  id: string;
  email: string;
  role?: 'admin' | 'seller' | 'cutter';
}

// ============================================
// CATALOG
// ============================================
export interface CatalogItem {
  tissueId: string;
  tissueName: string;
  tissueSku: string;
  links: LinkWithDetails[];
}
