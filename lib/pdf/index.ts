/**
 * PDF Generation Module - Otimizado para Android
 * 
 * Solução para OutOfMemoryError:
 * 1. NÃO usar Base64 para imagens grandes
 * 2. Usar apenas placeholders de cor (hex) no PDF
 * 3. Opcionalmente, baixar e comprimir imagens antes de converter
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';
import { generateOptimizedHtml, generateLinkHtml } from './html-generator';
import { 
  estimateHtmlMemoryUsage, 
  ANDROID_MEMORY_LIMITS,
  formatBytes,
  DEFAULT_PDF_CONFIG,
} from './memory-utils';

/**
 * Baixa e comprime uma imagem para tamanho seguro
 */
async function downloadAndCompressImage(
  url: string,
  maxDimension: number = 300,
  quality: number = 0.5
): Promise<string | null> {
  try {
    // Baixa a imagem
    const filename = 'temp_' + Math.random().toString(36).substring(7) + '.jpg';
    const localUri = FileSystem.cacheDirectory + filename;
    
    const downloadResult = await Promise.race([
      FileSystem.downloadAsync(url, localUri),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ]) as FileSystem.FileSystemDownloadResult;

    if (!downloadResult.uri) {
      return null;
    }

    // Comprime a imagem
    const manipulated = await ImageManipulator.manipulateAsync(
      downloadResult.uri,
      [{ resize: { width: maxDimension } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Converte para base64
    const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Limpa arquivos temporários
    await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
    await FileSystem.deleteAsync(manipulated.uri, { idempotent: true });

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.warn('Failed to process image:', error);
    return null;
  }
}

/**
 * Gera PDF de um tecido com todas as suas cores
 */
export async function generateTissuePdf(tissueId: string): Promise<boolean> {
  // Fetch Tissue
  const { data: tissue, error: tissueError } = await supabase
    .from('tissues')
    .select('*')
    .eq('id', tissueId)
    .single();

  if (tissueError) throw tissueError;
  if (!tissue) throw new Error('Tecido não encontrado.');

  // Fetch Links
  const { data: links, error: linksError } = await supabase
    .from('links')
    .select(`*, colors (*)`)
    .eq('tissue_id', tissueId)
    .eq('status', 'Ativo');

  if (linksError) throw linksError;
  if (!links || links.length === 0) {
    throw new Error('Não há cores vinculadas para gerar o PDF.');
  }

  console.log(`[PDF] Gerando PDF para ${tissue.name} com ${links.length} cores`);

  // Decide se deve incluir imagens ou usar apenas cores
  const useImages = links.length <= DEFAULT_PDF_CONFIG.maxTotalImages;
  
  let images: Array<{ linkId: string; base64: string }> = [];

  if (useImages) {
    // Processa imagens em sequência para evitar pico de memória
    for (const link of links) {
      if (link.image_path) {
        const publicUrl = supabase.storage
          .from('tissue-images')
          .getPublicUrl(link.image_path).data.publicUrl;

        const base64 = await downloadAndCompressImage(
          publicUrl,
          DEFAULT_PDF_CONFIG.maxImageDimension,
          DEFAULT_PDF_CONFIG.imageQuality
        );

        if (base64) {
          images.push({ linkId: link.id, base64 });
        }
      }
    }

    // Verifica se o tamanho estimado é seguro
    const imageSizes = images.map(img => img.base64.length);
    const memoryUsage = estimateHtmlMemoryUsage(imageSizes);

    console.log(`[PDF] Memória estimada: ${formatBytes(memoryUsage.estimatedPeakMemory)}`);

    if (memoryUsage.exceedsAndroidLimit) {
      console.warn('[PDF] Memória excede limite, usando apenas cores');
      images = []; // Fallback para cores apenas
    }
  } else {
    console.log('[PDF] Muitas cores, usando apenas placeholders');
  }

  // Gera HTML otimizado
  const html = generateOptimizedHtml(
    {
      name: tissue.name,
      sku: tissue.sku,
      width: tissue.width,
      composition: tissue.composition,
    },
    links.map((l: any) => ({
      id: l.id,
      sku_filho: l.sku_filho,
      colors: l.colors,
    })),
    images
  );

  console.log(`[PDF] HTML gerado: ${formatBytes(html.length)}`);

  // Gera PDF
  const { uri } = await Print.printToFileAsync({ html });
  
  // Compartilha
  await Sharing.shareAsync(uri, { 
    UTI: '.pdf', 
    mimeType: 'application/pdf' 
  });

  return true;
}

/**
 * Gera PDF de um link individual (tecido + cor específica)
 */
export async function generateLinkPdf(linkId: string): Promise<boolean> {
  // Fetch Link com detalhes
  const { data: link, error: linkError } = await supabase
    .from('links')
    .select(`*, tissues (*), colors (*)`)
    .eq('id', linkId)
    .single();

  if (linkError) throw linkError;
  if (!link) throw new Error('Vínculo não encontrado.');

  let imageBase64: string | null = null;

  if (link.image_path) {
    const publicUrl = supabase.storage
      .from('tissue-images')
      .getPublicUrl(link.image_path).data.publicUrl;

    imageBase64 = await downloadAndCompressImage(
      publicUrl,
      400, // Um pouco maior para link individual
      0.6
    );
  }

  const html = generateLinkHtml(
    {
      name: link.tissues.name,
      sku: link.tissues.sku,
      width: link.tissues.width,
      composition: link.tissues.composition,
    },
    {
      name: link.colors.name,
      hex: link.colors.hex,
      family: link.colors.family,
    },
    link.sku_filho,
    imageBase64
  );

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

  return true;
}
