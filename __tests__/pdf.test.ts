/**
 * Testes do PDF Service
 * 
 * Simula as limitações de memória de um dispositivo Android:
 * - Heap máximo típico: 256MB (alguns dispositivos 512MB)
 * - Limite de alocação única: ~50-100MB
 * - Strings Base64 aumentam tamanho em ~33%
 * 
 * Imagens típicas do Supabase Storage:
 * - Resolução: 1000x1000 a 2000x2000 pixels
 * - Tamanho: 200KB a 2MB cada (JPEG)
 * - Base64: 270KB a 2.7MB cada (33% maior)
 * 
 * Cenário problemático detectado:
 * - 10 imagens de 1.5MB cada = 15MB raw
 * - Em Base64: ~20MB
 * - HTML string com imagens inline: ~20MB
 * - expo-print processa e duplica: ~40-60MB
 * - WebView renderiza: mais memória
 * - Total: facilmente ultrapassa 100MB de alocação única
 */

import {
  estimateBase64Size,
  estimateHtmlMemoryUsage,
  shouldUseCompression,
  splitIntoBatches,
  ANDROID_MEMORY_LIMITS,
  PdfGenerationConfig,
} from '../lib/pdf/memory-utils';

import {
  generateOptimizedHtml,
  compressImageForPdf,
} from '../lib/pdf/html-generator';

describe('PDF Memory Utils', () => {
  describe('estimateBase64Size', () => {
    it('deve calcular corretamente o tamanho base64 (~37% maior)', () => {
      const originalSize = 1000000; // 1MB
      const base64Size = estimateBase64Size(originalSize);
      // Base64 aumenta ~37% (1.37x) + overhead
      expect(base64Size).toBeGreaterThan(1300000);
      expect(base64Size).toBeLessThan(1500000);
    });

    it('deve considerar overhead de data URI', () => {
      const size = estimateBase64Size(100);
      // data:image/jpeg;base64, = 23 chars
      expect(size).toBeGreaterThan(133);
    });
  });

  describe('estimateHtmlMemoryUsage', () => {
    it('deve estimar memória total para múltiplas imagens', () => {
      const imageSizes = [500000, 500000, 500000]; // 3 imagens de 500KB
      const usage = estimateHtmlMemoryUsage(imageSizes);
      
      // Base64 de 1.5MB = ~2MB
      // HTML overhead + duplicação no render = ~4-6MB
      expect(usage.totalBase64).toBeGreaterThan(1500000);
      expect(usage.estimatedPeakMemory).toBeGreaterThan(usage.totalBase64);
    });

    it('deve identificar quando ultrapassa limite de memória Android', () => {
      // 20 imagens de 2MB = 40MB raw, muito acima do limite
      const largeSizes = Array(20).fill(2000000);
      const usage = estimateHtmlMemoryUsage(largeSizes);
      
      expect(usage.exceedsAndroidLimit).toBe(true);
      expect(usage.estimatedPeakMemory).toBeGreaterThan(ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION);
    });

    it('deve aprovar conjunto pequeno de imagens', () => {
      // 3 imagens de 100KB = 300KB raw, bem abaixo do limite
      const smallSizes = [100000, 100000, 100000];
      const usage = estimateHtmlMemoryUsage(smallSizes);
      
      expect(usage.exceedsAndroidLimit).toBe(false);
    });
  });

  describe('shouldUseCompression', () => {
    it('deve recomendar compressão para imagens grandes', () => {
      expect(shouldUseCompression(2000000)).toBe(true); // 2MB
      expect(shouldUseCompression(1500000)).toBe(true); // 1.5MB
    });

    it('deve não recomendar compressão para imagens pequenas', () => {
      expect(shouldUseCompression(50000)).toBe(false); // 50KB
      expect(shouldUseCompression(100000)).toBe(false); // 100KB
    });
  });

  describe('splitIntoBatches', () => {
    it('deve dividir imagens grandes em batches seguros para memória', () => {
      // 50 imagens de 2MB cada - forçar split
      const images = Array(50).fill(null).map((_, i) => ({
        id: `img-${i}`,
        size: 2000000, // 2MB cada
      }));

      const batches = splitIntoBatches(images, ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION);
      
      // Com 50 imagens de 2MB, deve criar múltiplos batches
      expect(batches.length).toBeGreaterThanOrEqual(1);
      
      // Cada batch deve estar dentro do limite
      batches.forEach(batch => {
        const batchSize = batch.reduce((sum, img) => sum + estimateBase64Size(img.size), 0);
        expect(batchSize).toBeLessThanOrEqual(ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION);
      });
    });

    it('deve manter imagens pequenas em um único batch', () => {
      const images = Array(5).fill(null).map((_, i) => ({
        id: `img-${i}`,
        size: 50000, // 50KB cada
      }));

      const batches = splitIntoBatches(images, ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION);
      expect(batches.length).toBe(1);
    });
  });
});

describe('PDF HTML Generator', () => {
  describe('generateOptimizedHtml', () => {
    const mockTissue = {
      name: 'Canelado',
      sku: 'T002',
      width: 150,
      composition: '100% Algodão',
    };

    it('deve gerar HTML válido sem imagens', () => {
      const links = [
        { id: '1', colors: { name: 'Verde', hex: '#00FF00' }, sku_filho: 'T002-VD001' },
        { id: '2', colors: { name: 'Azul', hex: '#0000FF' }, sku_filho: 'T002-AZ001' },
      ];

      const html = generateOptimizedHtml(mockTissue, links, []);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Canelado');
      expect(html).toContain('T002');
      expect(html).toContain('Verde');
      expect(html).toContain('#00FF00');
    });

    it('deve usar placeholders de cor quando não há imagem', () => {
      const links = [
        { id: '1', colors: { name: 'Vermelho', hex: '#FF0000' }, sku_filho: 'T002-VM001' },
      ];

      const html = generateOptimizedHtml(mockTissue, links, []);
      
      // Deve ter um div com background (estilo inline minificado usa "background:" ao invés de "background-color:")
      expect(html).toContain('background:');
      expect(html).toContain('#FF0000');
      expect(html).not.toContain('<img');
    });

    it('deve incluir imagens base64 quando fornecidas', () => {
      const links = [
        { id: '1', colors: { name: 'Verde', hex: '#00FF00' }, sku_filho: 'T002-VD001' },
      ];
      const images = [
        { linkId: '1', base64: 'data:image/jpeg;base64,/9j/4AAQ...' },
      ];

      const html = generateOptimizedHtml(mockTissue, links, images);
      
      expect(html).toContain('<img');
      expect(html).toContain('data:image/jpeg;base64');
    });

    it('deve gerar HTML com tamanho razoável para Android', () => {
      const links = Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        colors: { name: `Cor ${i}`, hex: '#AABBCC' },
        sku_filho: `T002-C${i.toString().padStart(3, '0')}`,
      }));

      const html = generateOptimizedHtml(mockTissue, links, []);
      
      // HTML sem imagens deve ser pequeno (< 50KB)
      expect(html.length).toBeLessThan(50000);
    });
  });

  describe('compressImageForPdf', () => {
    it('deve retornar dimensões reduzidas para imagens grandes', () => {
      const result = compressImageForPdf({
        width: 2000,
        height: 2000,
        targetMaxDimension: 400,
      });

      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
      expect(result.quality).toBeLessThanOrEqual(0.7);
    });

    it('deve manter proporção da imagem', () => {
      const result = compressImageForPdf({
        width: 1600,
        height: 800,
        targetMaxDimension: 400,
      });

      expect(result.width).toBe(400);
      expect(result.height).toBe(200);
    });

    it('deve não redimensionar imagens já pequenas', () => {
      const result = compressImageForPdf({
        width: 300,
        height: 300,
        targetMaxDimension: 400,
      });

      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });
  });
});

describe('PDF Generation Config', () => {
  it('deve ter configurações seguras para Android', () => {
    const config: PdfGenerationConfig = {
      maxImageDimension: 400,
      imageQuality: 0.6,
      maxImagesPerPage: 9,
      maxTotalImages: 30,
    };

    // Com 30 imagens de 400x400 a 60% quality ≈ 30 * 50KB = 1.5MB
    // Base64: ~2MB, bem dentro do limite de 50MB
    const estimatedPerImage = 50000; // 50KB compressed
    const totalBase64 = config.maxTotalImages * estimateBase64Size(estimatedPerImage);
    
    expect(totalBase64).toBeLessThan(ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION);
  });
});

describe('Cenário Real: Tecido com muitas cores (caso Canelado)', () => {
  it('deve calcular se o cenário original causaria OOM', () => {
    // Simulando o cenário que causou o erro:
    // - Tecido "Canelado" com ~10-20 cores
    // - Cada imagem original: ~1-2MB
    // - Total raw: 10-40MB
    
    const originalScenario = {
      imageCount: 15,
      avgImageSize: 1500000, // 1.5MB cada
    };

    const imageSizes = Array(originalScenario.imageCount).fill(originalScenario.avgImageSize);
    const usage = estimateHtmlMemoryUsage(imageSizes);

    // Este cenário DEVE exceder o limite
    expect(usage.exceedsAndroidLimit).toBe(true);
    console.log(`Cenário original: ${(usage.estimatedPeakMemory / 1000000).toFixed(1)}MB estimados`);
  });

  it('deve calcular se o cenário otimizado é seguro', () => {
    // Cenário otimizado:
    // - Mesmas 15 cores
    // - Cada imagem comprimida: ~50KB (400x400 a 60% quality)
    
    const optimizedScenario = {
      imageCount: 15,
      avgImageSize: 50000, // 50KB cada após compressão
    };

    const imageSizes = Array(optimizedScenario.imageCount).fill(optimizedScenario.avgImageSize);
    const usage = estimateHtmlMemoryUsage(imageSizes);

    // Este cenário deve estar OK
    expect(usage.exceedsAndroidLimit).toBe(false);
    console.log(`Cenário otimizado: ${(usage.estimatedPeakMemory / 1000000).toFixed(1)}MB estimados`);
  });
});
