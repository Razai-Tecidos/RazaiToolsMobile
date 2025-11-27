/**
 * Testes do Design System (Theme)
 * Verifica consistência dos tokens de design
 */

import { theme } from '../lib/theme';

describe('Theme - Design System', () => {
  describe('Colors', () => {
    it('deve ter cores primárias definidas', () => {
      expect(theme.colors.primary).toBeDefined();
      expect(theme.colors.primaryDark).toBeDefined();
      expect(theme.colors.primaryLight).toBeDefined();
    });

    it('deve ter cores semânticas definidas', () => {
      expect(theme.colors.danger).toBeDefined();
      expect(theme.colors.success).toBeDefined();
      expect(theme.colors.warning).toBeDefined();
    });

    it('cores devem ser strings hexadecimais válidas', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      expect(theme.colors.primary).toMatch(hexRegex);
      expect(theme.colors.danger).toMatch(hexRegex);
      expect(theme.colors.success).toMatch(hexRegex);
    });

    it('deve ter cores de texto definidas', () => {
      expect(theme.colors.text).toBeDefined();
      expect(theme.colors.textSecondary).toBeDefined();
      expect(theme.colors.textMuted).toBeDefined();
      expect(theme.colors.textInverse).toBeDefined();
    });

    it('deve ter cores de fundo definidas', () => {
      expect(theme.colors.background).toBeDefined();
      expect(theme.colors.surface).toBeDefined();
      expect(theme.colors.surfaceAlt).toBeDefined();
    });
  });

  describe('Spacing', () => {
    it('deve ter escalas de espaçamento definidas', () => {
      expect(theme.spacing.xs).toBeDefined();
      expect(theme.spacing.sm).toBeDefined();
      expect(theme.spacing.md).toBeDefined();
      expect(theme.spacing.lg).toBeDefined();
      expect(theme.spacing.xl).toBeDefined();
    });

    it('espaçamentos devem ser números', () => {
      expect(typeof theme.spacing.xs).toBe('number');
      expect(typeof theme.spacing.md).toBe('number');
      expect(typeof theme.spacing.xl).toBe('number');
    });

    it('espaçamentos devem estar em ordem crescente', () => {
      expect(theme.spacing.xs).toBeLessThan(theme.spacing.sm);
      expect(theme.spacing.sm).toBeLessThan(theme.spacing.md);
      expect(theme.spacing.md).toBeLessThan(theme.spacing.lg);
      expect(theme.spacing.lg).toBeLessThan(theme.spacing.xl);
    });
  });

  describe('Border Radius', () => {
    it('deve ter escalas de radius definidas', () => {
      expect(theme.radius.sm).toBeDefined();
      expect(theme.radius.md).toBeDefined();
      expect(theme.radius.lg).toBeDefined();
      expect(theme.radius.pill).toBeDefined();
    });

    it('pill deve ser um valor alto para círculos', () => {
      expect(theme.radius.pill).toBeGreaterThanOrEqual(999);
    });
  });

  describe('Typography', () => {
    it('deve ter tamanhos de fonte definidos', () => {
      expect(theme.font.sizes.xs).toBeDefined();
      expect(theme.font.sizes.sm).toBeDefined();
      expect(theme.font.sizes.base).toBeDefined();
      expect(theme.font.sizes.lg).toBeDefined();
      expect(theme.font.sizes.xl).toBeDefined();
    });

    it('deve ter pesos de fonte definidos', () => {
      expect(theme.font.weights.regular).toBeDefined();
      expect(theme.font.weights.medium).toBeDefined();
      expect(theme.font.weights.semibold).toBeDefined();
      expect(theme.font.weights.bold).toBeDefined();
    });

    it('tamanho base deve ser 16 (acessibilidade)', () => {
      expect(theme.font.sizes.base).toBe(16);
    });
  });

  describe('Shadows', () => {
    it('deve ter níveis de sombra definidos', () => {
      expect(theme.shadow.sm).toBeDefined();
      expect(theme.shadow.md).toBeDefined();
      expect(theme.shadow.lg).toBeDefined();
    });

    it('sombras devem ter propriedades necessárias para React Native', () => {
      expect(theme.shadow.md).toHaveProperty('shadowColor');
      expect(theme.shadow.md).toHaveProperty('shadowOffset');
      expect(theme.shadow.md).toHaveProperty('shadowOpacity');
      expect(theme.shadow.md).toHaveProperty('shadowRadius');
      expect(theme.shadow.md).toHaveProperty('elevation');
    });
  });
});
