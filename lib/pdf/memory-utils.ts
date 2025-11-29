/**
 * Utilitários para gerenciamento de memória na geração de PDFs
 * 
 * Problema: Android tem limites rígidos de alocação de memória.
 * O erro "java.lang.OutOfMemoryError: Failed to allocate X bytes"
 * ocorre quando tentamos alocar mais memória do que o permitido
 * em uma única operação.
 * 
 * Limites típicos Android:
 * - Heap máximo: 256-512MB (varia por dispositivo)
 * - Alocação única máxima: ~25-50% do heap livre
 * - expo-print usa WebView que consome memória adicional
 */

/**
 * Limites de memória seguros para Android
 */
export const ANDROID_MEMORY_LIMITS = {
  /** Alocação segura máxima (conservador) */
  SAFE_ALLOCATION: 30 * 1024 * 1024, // 30MB
  
  /** Limite crítico onde OOM é provável */
  CRITICAL_ALLOCATION: 80 * 1024 * 1024, // 80MB
  
  /** Tamanho máximo recomendado por imagem após compressão */
  MAX_IMAGE_SIZE: 100 * 1024, // 100KB
  
  /** Multiplicador para estimar pico de memória (HTML + render + buffers) */
  PEAK_MEMORY_MULTIPLIER: 3,
};

/**
 * Configuração para geração de PDF
 */
export interface PdfGenerationConfig {
  /** Dimensão máxima (largura ou altura) da imagem em pixels */
  maxImageDimension: number;
  /** Qualidade JPEG (0-1) */
  imageQuality: number;
  /** Máximo de imagens por página */
  maxImagesPerPage: number;
  /** Máximo total de imagens no PDF */
  maxTotalImages: number;
}

/**
 * Configuração padrão otimizada para Android
 */
export const DEFAULT_PDF_CONFIG: PdfGenerationConfig = {
  maxImageDimension: 400, // 400x400 máximo
  imageQuality: 0.6, // 60% quality
  maxImagesPerPage: 9, // 3x3 grid
  maxTotalImages: 30, // Limite total
};

/**
 * Calcula o tamanho estimado de uma string Base64
 * Base64 aumenta o tamanho em ~33% + overhead do data URI
 */
export function estimateBase64Size(originalBytes: number): number {
  const base64Overhead = 1.37; // ~37% maior (33% encoding + padding)
  const dataUriPrefix = 30; // "data:image/jpeg;base64," ≈ 23-30 chars
  return Math.ceil(originalBytes * base64Overhead) + dataUriPrefix;
}

/**
 * Estima o uso total de memória para gerar HTML com imagens
 */
export function estimateHtmlMemoryUsage(imageSizesInBytes: number[]): {
  totalBase64: number;
  htmlSize: number;
  estimatedPeakMemory: number;
  exceedsAndroidLimit: boolean;
} {
  const totalBase64 = imageSizesInBytes.reduce(
    (sum, size) => sum + estimateBase64Size(size),
    0
  );
  
  // HTML structure overhead (CSS, tags, etc) ≈ 10KB base + 500 bytes per image
  const htmlOverhead = 10000 + (imageSizesInBytes.length * 500);
  const htmlSize = totalBase64 + htmlOverhead;
  
  // Pico de memória: HTML + buffers de renderização + WebView overhead
  const estimatedPeakMemory = htmlSize * ANDROID_MEMORY_LIMITS.PEAK_MEMORY_MULTIPLIER;
  
  return {
    totalBase64,
    htmlSize,
    estimatedPeakMemory,
    exceedsAndroidLimit: estimatedPeakMemory > ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION,
  };
}

/**
 * Verifica se uma imagem deve ser comprimida
 */
export function shouldUseCompression(imageSizeBytes: number): boolean {
  return imageSizeBytes > ANDROID_MEMORY_LIMITS.MAX_IMAGE_SIZE;
}

/**
 * Divide imagens em batches que cabem na memória
 */
export function splitIntoBatches<T extends { size: number }>(
  images: T[],
  maxBatchMemory: number
): T[][] {
  const batches: T[][] = [];
  let currentBatch: T[] = [];
  let currentBatchSize = 0;

  for (const image of images) {
    const imageBase64Size = estimateBase64Size(image.size);
    
    // Se adicionar esta imagem excede o limite, cria novo batch
    if (currentBatchSize + imageBase64Size > maxBatchMemory && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }
    
    currentBatch.push(image);
    currentBatchSize += imageBase64Size;
  }

  // Adiciona o último batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Formata bytes para string legível
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
