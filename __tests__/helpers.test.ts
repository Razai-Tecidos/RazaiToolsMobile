/**
 * Testes de Utilitários e Helpers
 * Funções auxiliares usadas em toda a aplicação
 */

describe('Helpers - Formatação', () => {
  describe('formatCurrency', () => {
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    it('deve formatar valores em Real brasileiro', () => {
      expect(formatCurrency(10)).toBe('R$\u00A010,00');
      expect(formatCurrency(1000)).toBe('R$\u00A01.000,00');
      expect(formatCurrency(99.99)).toBe('R$\u00A099,99');
    });

    it('deve lidar com valores zero', () => {
      expect(formatCurrency(0)).toBe('R$\u00A00,00');
    });

    it('deve lidar com valores negativos', () => {
      expect(formatCurrency(-50)).toBe('-R$\u00A050,00');
    });
  });

  describe('formatDate', () => {
    const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    it('deve formatar data ISO para formato brasileiro', () => {
      expect(formatDate('2025-11-27T00:00:00Z')).toBe('27/11/2025');
      expect(formatDate('2025-01-01T12:00:00Z')).toBe('01/01/2025');
    });
  });

  describe('formatQuantity', () => {
    const formatQuantity = (qty: number, singular: string, plural: string): string => {
      return `${qty} ${qty === 1 ? singular : plural}`;
    };

    it('deve usar singular para 1', () => {
      expect(formatQuantity(1, 'rolo', 'rolos')).toBe('1 rolo');
    });

    it('deve usar plural para outros números', () => {
      expect(formatQuantity(0, 'rolo', 'rolos')).toBe('0 rolos');
      expect(formatQuantity(5, 'rolo', 'rolos')).toBe('5 rolos');
      expect(formatQuantity(100, 'rolo', 'rolos')).toBe('100 rolos');
    });
  });
});

describe('Helpers - Validação', () => {
  describe('isValidEmail', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('deve validar emails corretos', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user@razai.local')).toBe(true);
    });

    it('deve rejeitar emails inválidos', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidSku', () => {
    const isValidSku = (sku: string): boolean => {
      // SKU deve ter pelo menos 3 caracteres, alfanumérico com hífens
      const skuRegex = /^[A-Z0-9]{2,}(-[A-Z0-9]+)*$/i;
      return skuRegex.test(sku);
    };

    it('deve validar SKUs corretos', () => {
      expect(isValidSku('CAN-001')).toBe(true);
      expect(isValidSku('MAL-VER-001')).toBe(true);
      expect(isValidSku('ABC123')).toBe(true);
    });

    it('deve rejeitar SKUs inválidos', () => {
      expect(isValidSku('')).toBe(false);
      expect(isValidSku('A')).toBe(false);
      expect(isValidSku('--')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    const isPositiveNumber = (value: unknown): boolean => {
      return typeof value === 'number' && !isNaN(value) && value > 0;
    };

    it('deve aceitar números positivos', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.5)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
    });

    it('deve rejeitar números não positivos', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });

    it('deve rejeitar não-números', () => {
      expect(isPositiveNumber('1')).toBe(false);
      expect(isPositiveNumber(null)).toBe(false);
      expect(isPositiveNumber(undefined)).toBe(false);
      expect(isPositiveNumber(NaN)).toBe(false);
    });
  });
});

describe('Helpers - Transformação', () => {
  describe('slugify', () => {
    const slugify = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    it('deve converter texto para slug', () => {
      expect(slugify('Canelado Vermelho')).toBe('canelado-vermelho');
      expect(slugify('Malha 100% Algodão')).toBe('malha-100-algodao');
    });

    it('deve remover acentos', () => {
      expect(slugify('São Paulo')).toBe('sao-paulo');
      expect(slugify('Lençóis')).toBe('lencois');
    });

    it('deve limpar caracteres especiais', () => {
      expect(slugify('Teste!@#$%')).toBe('teste');
      expect(slugify('   espaços   ')).toBe('espacos');
    });
  });

  describe('truncate', () => {
    const truncate = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    };

    it('deve truncar textos longos', () => {
      expect(truncate('Texto muito longo aqui', 10)).toBe('Texto m...');
    });

    it('não deve truncar textos curtos', () => {
      expect(truncate('Curto', 10)).toBe('Curto');
    });

    it('deve lidar com texto exato no limite', () => {
      expect(truncate('1234567890', 10)).toBe('1234567890');
    });
  });

  describe('groupBy', () => {
    const groupBy = <T, K extends string | number>(
      array: T[],
      keyFn: (item: T) => K
    ): Record<K, T[]> => {
      return array.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(item);
        return result;
      }, {} as Record<K, T[]>);
    };

    it('deve agrupar por chave', () => {
      const items = [
        { name: 'A', type: 'x' },
        { name: 'B', type: 'y' },
        { name: 'C', type: 'x' },
      ];

      const grouped = groupBy(items, (i) => i.type);

      expect(grouped['x']).toHaveLength(2);
      expect(grouped['y']).toHaveLength(1);
    });

    it('deve lidar com array vazio', () => {
      const grouped = groupBy([], () => 'key');
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });
});

describe('Helpers - Cálculos de Estoque', () => {
  describe('calculateStockAfterMovement', () => {
    type MovementType = 'IN' | 'OUT' | 'ADJUST';

    const calculateStockAfterMovement = (
      currentStock: number,
      movementType: MovementType,
      quantity: number
    ): number => {
      switch (movementType) {
        case 'IN':
          return currentStock + quantity;
        case 'OUT':
          return Math.max(0, currentStock - quantity);
        case 'ADJUST':
          return Math.max(0, quantity);
        default:
          return currentStock;
      }
    };

    it('deve adicionar em movimentos de entrada', () => {
      expect(calculateStockAfterMovement(10, 'IN', 5)).toBe(15);
      expect(calculateStockAfterMovement(0, 'IN', 10)).toBe(10);
    });

    it('deve subtrair em movimentos de saída', () => {
      expect(calculateStockAfterMovement(10, 'OUT', 3)).toBe(7);
      expect(calculateStockAfterMovement(10, 'OUT', 10)).toBe(0);
    });

    it('não deve permitir estoque negativo em saídas', () => {
      expect(calculateStockAfterMovement(5, 'OUT', 10)).toBe(0);
    });

    it('deve definir valor absoluto em ajustes', () => {
      expect(calculateStockAfterMovement(100, 'ADJUST', 50)).toBe(50);
      expect(calculateStockAfterMovement(0, 'ADJUST', 100)).toBe(100);
    });
  });

  describe('getStockStatusColor', () => {
    const getStockStatusColor = (quantity: number): string => {
      if (quantity === 0) return '#dc2626'; // vermelho
      if (quantity <= 5) return '#f59e0b'; // amarelo
      return '#10b981'; // verde
    };

    it('deve retornar vermelho para estoque zerado', () => {
      expect(getStockStatusColor(0)).toBe('#dc2626');
    });

    it('deve retornar amarelo para estoque baixo (1-5)', () => {
      expect(getStockStatusColor(1)).toBe('#f59e0b');
      expect(getStockStatusColor(5)).toBe('#f59e0b');
    });

    it('deve retornar verde para estoque normal (>5)', () => {
      expect(getStockStatusColor(6)).toBe('#10b981');
      expect(getStockStatusColor(100)).toBe('#10b981');
    });
  });
});
