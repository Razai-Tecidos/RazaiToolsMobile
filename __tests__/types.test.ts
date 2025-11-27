/**
 * Testes das Interfaces/Types
 * Verifica se as interfaces estão bem definidas e consistentes
 */

import {
  Tissue,
  TissueInput,
  Color,
  ColorInput,
  Link,
  LinkWithDetails,
  StockItem,
  StockMovement,
  StockMovementType,
  StockMovementInput,
  StockStatus,
  StockPrediction,
  User,
  CatalogItem,
} from '../types';

describe('Types - Interfaces do Sistema', () => {
  describe('Tissue (Tecido)', () => {
    it('deve aceitar objeto Tissue válido', () => {
      const tissue: Tissue = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Canelado',
        sku: 'CAN-001',
        width: 1.50,
        composition: '100% Algodão',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(tissue.id).toBeDefined();
      expect(tissue.name).toBe('Canelado');
      expect(tissue.width).toBe(1.50);
    });

    it('deve aceitar TissueInput para criação', () => {
      const input: TissueInput = {
        name: 'Malha',
        width: 1.80,
        composition: '50% Algodão, 50% Poliéster',
        color: 'Branco',
      };

      expect(input.name).toBe('Malha');
      expect(input.color).toBe('Branco');
    });

    it('color deve ser opcional em TissueInput', () => {
      const input: TissueInput = {
        name: 'Linho',
        width: 1.40,
        composition: '100% Linho',
      };

      expect(input.color).toBeUndefined();
    });
  });

  describe('StockMovement', () => {
    it('StockMovementType deve aceitar apenas valores válidos', () => {
      const validTypes: StockMovementType[] = ['IN', 'OUT', 'ADJUST'];
      
      validTypes.forEach(type => {
        expect(['IN', 'OUT', 'ADJUST']).toContain(type);
      });
    });

    it('StockMovementInput deve ter campos obrigatórios', () => {
      const input: StockMovementInput = {
        link_id: '123',
        type: 'OUT',
        quantity: 5,
      };

      expect(input.link_id).toBeDefined();
      expect(input.type).toBe('OUT');
      expect(input.quantity).toBe(5);
    });
  });

  describe('StockStatus', () => {
    it('deve ter status de estoque válidos', () => {
      const validStatuses: StockStatus[] = ['SAFE', 'WARNING', 'CRITICAL'];
      
      expect(validStatuses).toContain('SAFE');
      expect(validStatuses).toContain('WARNING');
      expect(validStatuses).toContain('CRITICAL');
    });
  });

  describe('User', () => {
    it('deve ter estrutura de usuário', () => {
      const user: User = {
        id: 'user-123',
        email: 'teste@razai.local',
        role: 'cutter',
      };

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@');
      expect(['admin', 'seller', 'cutter']).toContain(user.role);
    });
  });

  describe('CatalogItem', () => {
    it('deve ter estrutura de item do catálogo', () => {
      const item: CatalogItem = {
        tissueId: 'tissue-123',
        tissueName: 'Canelado',
        tissueSku: 'CAN-001',
        links: [],
      };

      expect(item.tissueId).toBeDefined();
      expect(item.tissueName).toBeDefined();
      expect(item.tissueSku).toBeDefined();
      expect(item.links).toEqual([]);
    });
  });
});

describe('Validações de Negócio', () => {
  describe('Estoque', () => {
    it('quantidade de estoque não deve ser negativa', () => {
      const validateStock = (quantity: number): boolean => quantity >= 0;

      expect(validateStock(0)).toBe(true);
      expect(validateStock(10)).toBe(true);
      expect(validateStock(-1)).toBe(false);
    });

    it('saída não deve exceder estoque disponível', () => {
      const canProcessOut = (current: number, requested: number): boolean => {
        return requested <= current && requested > 0;
      };

      expect(canProcessOut(10, 5)).toBe(true);
      expect(canProcessOut(10, 10)).toBe(true);
      expect(canProcessOut(10, 15)).toBe(false);
      expect(canProcessOut(10, 0)).toBe(false);
    });
  });

  describe('SKU', () => {
    it('SKU filho deve seguir padrão', () => {
      // Padrão: TECIDO-COR ou TECIDO-COR-VARIANTE
      const isValidSkuFilho = (sku: string): boolean => {
        const pattern = /^[A-Z]{2,4}-[A-Z]{2,4}(-\d{3})?$/;
        return pattern.test(sku);
      };

      expect(isValidSkuFilho('CAN-VER')).toBe(true);
      expect(isValidSkuFilho('MAL-AZU-001')).toBe(true);
      expect(isValidSkuFilho('invalid')).toBe(false);
    });
  });

  describe('Movimentação de Estoque', () => {
    it('deve calcular estoque após movimentação', () => {
      const calculateNewStock = (
        current: number,
        type: StockMovementType,
        quantity: number
      ): number => {
        switch (type) {
          case 'IN':
            return current + quantity;
          case 'OUT':
            return Math.max(0, current - quantity);
          case 'ADJUST':
            return quantity;
          default:
            return current;
        }
      };

      // Entrada
      expect(calculateNewStock(10, 'IN', 5)).toBe(15);
      
      // Saída
      expect(calculateNewStock(10, 'OUT', 3)).toBe(7);
      expect(calculateNewStock(10, 'OUT', 15)).toBe(0); // Não fica negativo
      
      // Ajuste
      expect(calculateNewStock(10, 'ADJUST', 20)).toBe(20);
      expect(calculateNewStock(10, 'ADJUST', 0)).toBe(0);
    });
  });

  describe('Status de Estoque', () => {
    it('deve determinar status baseado na quantidade', () => {
      const getStockStatus = (quantity: number): StockStatus => {
        if (quantity === 0) return 'CRITICAL';
        if (quantity <= 5) return 'WARNING';
        return 'SAFE';
      };

      expect(getStockStatus(0)).toBe('CRITICAL');
      expect(getStockStatus(3)).toBe('WARNING');
      expect(getStockStatus(5)).toBe('WARNING');
      expect(getStockStatus(10)).toBe('SAFE');
    });
  });
});
