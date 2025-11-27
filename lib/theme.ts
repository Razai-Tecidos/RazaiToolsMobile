/**
 * Design System - RazaiToolsMobile
 * Tokens centralizados para cores, espaçamentos, tipografia e sombras.
 * Baseado no Design System Web para manter consistência visual.
 */

export const theme = {
  colors: {
    // Primárias
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: '#eff6ff',
    
    // Semânticas
    danger: '#dc2626',
    dangerLight: '#fef2f2',
    dangerBorder: '#fecaca',
    success: '#10b981',
    successLight: '#ecfdf5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    
    // Textos
    text: '#333333',
    textSecondary: '#666666',
    textMuted: '#999999',
    textInverse: '#ffffff',
    
    // Fundos
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceAlt: '#f0f0f0',
    
    // Bordas
    border: '#eeeeee',
    borderStrong: '#dddddd',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  
  font: {
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      md: 18,
      lg: 20,
      xl: 24,
      display: 32,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

// Type helpers
export type ThemeColors = keyof typeof theme.colors;
export type ThemeSpacing = keyof typeof theme.spacing;
export type ThemeRadius = keyof typeof theme.radius;
