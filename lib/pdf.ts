/**
 * PDF Generation - Re-export from optimized module
 * 
 * Este módulo foi refatorado para evitar OutOfMemoryError em Android.
 * A nova implementação:
 * 1. Comprime imagens antes de converter para Base64
 * 2. Usa placeholders de cor quando há muitas imagens
 * 3. Processa imagens sequencialmente para evitar pico de memória
 */

export { generateTissuePdf, generateLinkPdf } from './pdf/index';
