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
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';
import { generateOptimizedHtml, generateLinkHtml } from './html-generator';
import { 
  ANDROID_MEMORY_LIMITS,
  formatBytes,
  DEFAULT_PDF_CONFIG,
} from './memory-utils';

/**
 * Baixa e comprime uma imagem para uso seguro em PDF
 */
async function downloadAndCompressImage(url: string): Promise<string | null> {
  try {
    // 1. Download para cache local
    const filename = url.split('/').pop() || 'temp.jpg';
    const localUri = FileSystem.cacheDirectory + filename;
    
    const downloadRes = await FileSystem.downloadAsync(url, localUri);
    if (downloadRes.status !== 200) return null;

    // 2. Comprimir e Redimensionar (Crucial para Android)
    // Largura 350px é suficiente para PDF (grid pequeno) e economiza MUITA RAM
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 350 } }], 
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // Limpar arquivo temporário original
    await FileSystem.deleteAsync(localUri, { idempotent: true });

    return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
  } catch (error) {
    console.warn('[PDF] Erro ao processar imagem:', error);
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

  // Processar imagens em série para não estourar memória
  const images: Array<{ linkId: string; base64: string }> = [];
  
  for (const link of links) {
    if (link.image_path) {
      // Tenta baixar a imagem pública do Supabase
      // Se o link.image_path for caminho relativo, construir URL completa
      const publicUrl = link.image_path.startsWith('http') 
        ? link.image_path 
        : supabase.storage.from('tissue-images').getPublicUrl(link.image_path).data.publicUrl;

      const base64 = await downloadAndCompressImage(publicUrl);
      if (base64) {
        images.push({ linkId: link.id, base64 });
      }
    }
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

  // Validação de memória (apenas log)
  const htmlSize = html.length;
  if (htmlSize > ANDROID_MEMORY_LIMITS.SAFE_ALLOCATION) {
    console.warn(`[PDF] Atenção: HTML grande (${formatBytes(htmlSize)}). Pode falhar em devices antigos.`);
  }

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
    const publicUrl = link.image_path.startsWith('http') 
      ? link.image_path 
      : supabase.storage.from('tissue-images').getPublicUrl(link.image_path).data.publicUrl;
    
    imageBase64 = await downloadAndCompressImage(publicUrl);
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
