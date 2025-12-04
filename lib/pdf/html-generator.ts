/**
 * Gerador de HTML para PDFs - Design Elegante com Paginação Manual
 * 
 * Layout Catálogo:
 * - Paginação manual para controle total de quebras
 * - Página 1: Header completo + 12 cores
 * - Página 2+: Header simplificado + 16 cores
 * - Imagens otimizadas
 */

import { DEFAULT_PDF_CONFIG, PdfGenerationConfig } from './memory-utils';

// ============================================================================
// TYPES
// ============================================================================

interface TissueData {
  name: string;
  sku: string;
  width: number;
  composition?: string | null;
}

interface LinkData {
  id: string;
  sku_filho: string;
  colors: {
    name: string;
    hex: string;
  } | null;
}

interface ImageData {
  linkId: string;
  base64: string;
}

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const DESIGN = {
  colors: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    accent: '#c9a961',
    text: '#1a1a1a',
    textMuted: '#666666',
    textLight: '#999999',
    border: '#e5e5e5',
    background: '#ffffff',
    cardBg: '#fafafa',
  },
  fonts: {
    main: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    mono: 'SF Mono, Monaco, Consolas, monospace',
  },
};

// ============================================================================
// CSS STYLES
// ============================================================================

const CATALOG_STYLES = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${DESIGN.fonts.main}; color: ${DESIGN.colors.text}; background: ${DESIGN.colors.background}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* Container da Página A4 */
.page {
  width: 210mm;
  height: 297mm;
  padding: 15mm 12mm;
  position: relative;
  page-break-after: always;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.page:last-child { page-break-after: avoid; }

/* Header Página 1 */
.header-full { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 6mm; margin-bottom: 6mm; border-bottom: 0.5mm solid ${DESIGN.colors.primary}; flex-shrink: 0; }
.header-left { flex: 1; }
.brand { font-size: 8pt; font-weight: 600; letter-spacing: 4px; color: ${DESIGN.colors.accent}; text-transform: uppercase; margin-bottom: 2mm; }
.tissue-name { font-size: 24pt; font-weight: 300; color: ${DESIGN.colors.primary}; letter-spacing: 0.5px; margin-bottom: 3mm; }
.tissue-meta { display: flex; gap: 5mm; flex-wrap: wrap; }
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 6pt; text-transform: uppercase; letter-spacing: 1px; color: ${DESIGN.colors.textLight}; margin-bottom: 0.5mm; }
.meta-value { font-size: 9pt; font-weight: 500; color: ${DESIGN.colors.text}; }
.header-right { text-align: right; }
.sku-badge { display: inline-block; background: ${DESIGN.colors.cardBg}; border: 0.3mm solid ${DESIGN.colors.border}; padding: 2mm 4mm; border-radius: 1.5mm; font-family: ${DESIGN.fonts.mono}; font-size: 9pt; font-weight: 500; letter-spacing: 1px; color: ${DESIGN.colors.primary}; }
.color-count { font-size: 7pt; color: ${DESIGN.colors.textMuted}; margin-top: 2mm; }

/* Header Simplificado (Pág 2+) */
.header-simple { display: flex; align-items: center; justify-content: space-between; padding-bottom: 4mm; margin-bottom: 6mm; border-bottom: 0.3mm solid ${DESIGN.colors.border}; flex-shrink: 0; }
.simple-title { font-size: 12pt; font-weight: 600; color: ${DESIGN.colors.primary}; }
.simple-meta { font-size: 8pt; color: ${DESIGN.colors.textMuted}; }

/* Grid de Cores */
.colors-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; align-content: start; flex: 1; }
.color-card { background: ${DESIGN.colors.background}; border: 0.3mm solid ${DESIGN.colors.border}; border-radius: 2mm; overflow: hidden; height: fit-content; }
.color-image { width: 100%; aspect-ratio: 1; overflow: hidden; position: relative; background: ${DESIGN.colors.cardBg}; }
.color-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.color-swatch { width: 100%; height: 100%; }
.color-info { padding: 2mm 2.5mm; background: ${DESIGN.colors.background}; border-top: 0.3mm solid ${DESIGN.colors.border}; }
.color-name { font-size: 7.5pt; font-weight: 600; color: ${DESIGN.colors.text}; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.color-details { display: flex; justify-content: space-between; align-items: center; }
.color-sku { font-family: ${DESIGN.fonts.mono}; font-size: 5.5pt; color: ${DESIGN.colors.textMuted}; letter-spacing: 0.5px; }
.color-hex { font-family: ${DESIGN.fonts.mono}; font-size: 5.5pt; color: ${DESIGN.colors.textLight}; text-transform: uppercase; }

/* Footer de Página */
.page-footer { position: absolute; bottom: 8mm; left: 0; right: 0; text-align: center; font-size: 7pt; color: ${DESIGN.colors.textLight}; }
`;

// ============================================================================
// HELPERS
// ============================================================================

function renderColorCard(link: LinkData, imageBase64?: string): string {
  const colorHex = link.colors?.hex || '#eeeeee';
  const colorName = link.colors?.name || 'Sem nome';
  
  const imageContent = imageBase64
    ? `<img src="${imageBase64}" alt="${colorName}"/>`
    : `<div class="color-swatch" style="background:${colorHex}"></div>`;
  
  return `
    <div class="color-card">
      <div class="color-image">${imageContent}</div>
      <div class="color-info">
        <div class="color-name">${colorName}</div>
        <div class="color-details">
          <span class="color-sku">${link.sku_filho}</span>
          <span class="color-hex">${colorHex}</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Gera HTML do catálogo com grid de cores elegante e paginação manual
 */
export function generateOptimizedHtml(
  tissue: TissueData,
  links: LinkData[],
  images: ImageData[],
  _config: PdfGenerationConfig = DEFAULT_PDF_CONFIG
): string {
  const imageMap = new Map(images.map(img => [img.linkId, img.base64]));
  
  // Configuração de Paginação
  const ITEMS_PER_PAGE_1 = 9; // 9 itens na primeira página
  const ITEMS_PER_PAGE_N = 9; // 9 itens nas demais páginas

  const pagesHtml: string[] = [];
  
  // Separa itens da primeira página
  const page1Links = links.slice(0, ITEMS_PER_PAGE_1);
  const remainingLinks = links.slice(ITEMS_PER_PAGE_1);

  // --- PÁGINA 1 ---
  const page1Cards = page1Links.map(link => renderColorCard(link, imageMap.get(link.id))).join('');
  
  pagesHtml.push(`
    <div class="page">
      <header class="header-full">
        <div class="header-left">
          <div class="brand">RAZAI TECIDOS</div>
          <h1 class="tissue-name">${tissue.name}</h1>
          <div class="tissue-meta">
            <div class="meta-item"><span class="meta-label">Largura</span><span class="meta-value">${tissue.width} cm</span></div>
            <div class="meta-item"><span class="meta-label">Composição</span><span class="meta-value">${tissue.composition || 'Não informada'}</span></div>
          </div>
        </div>
        <div class="header-right">
          <div class="sku-badge">${tissue.sku}</div>
          <div class="color-count">${links.length} ${links.length === 1 ? 'cor' : 'cores'}</div>
        </div>
      </header>
      <div class="colors-grid">
        ${page1Cards}
      </div>
      <div class="page-footer">Página 1</div>
    </div>
  `);

  // --- PÁGINAS SUBSEQUENTES ---
  let currentPage = 2;
  for (let i = 0; i < remainingLinks.length; i += ITEMS_PER_PAGE_N) {
    const pageLinks = remainingLinks.slice(i, i + ITEMS_PER_PAGE_N);
    const pageCards = pageLinks.map(link => renderColorCard(link, imageMap.get(link.id))).join('');

    pagesHtml.push(`
      <div class="page">
        <div class="colors-grid" style="margin-top: 0;">
          ${pageCards}
        </div>
        <div class="page-footer">Página ${currentPage}</div>
      </div>
    `);
    currentPage++;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${tissue.name} - RAZAI</title>
  <style>${CATALOG_STYLES}</style>
</head>
<body>
  ${pagesHtml.join('')}
</body>
</html>`;
}

// ============================================================================
// SINGLE LINK GENERATOR (Mantido igual, apenas re-exportado)
// ============================================================================

const SINGLE_LINK_STYLES = `
@page { size: A4; margin: 15mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${DESIGN.fonts.main}; color: ${DESIGN.colors.text}; background: ${DESIGN.colors.background}; min-height: 100vh; display: flex; flex-direction: column; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { flex: 1; display: flex; flex-direction: column; padding: 5mm 0; }
.header { text-align: center; padding-bottom: 8mm; margin-bottom: 10mm; border-bottom: 0.5mm solid ${DESIGN.colors.primary}; }
.brand { font-size: 9pt; font-weight: 600; letter-spacing: 4px; color: ${DESIGN.colors.accent}; text-transform: uppercase; margin-bottom: 4mm; }
.tissue-name { font-size: 28pt; font-weight: 300; color: ${DESIGN.colors.primary}; margin-bottom: 3mm; }
.color-title { font-size: 16pt; font-weight: 600; color: ${DESIGN.colors.text}; }
.content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.image-container { width: 100%; max-width: 140mm; aspect-ratio: 1; border-radius: 4mm; overflow: hidden; box-shadow: 0 4mm 16mm rgba(0,0,0,0.08); margin-bottom: 10mm; border: 0.3mm solid ${DESIGN.colors.border}; }
.image-container img { width: 100%; height: 100%; object-fit: cover; display: block; }
.color-swatch { width: 100%; height: 100%; }
.sku-display { display: inline-block; background: ${DESIGN.colors.cardBg}; border: 0.3mm solid ${DESIGN.colors.border}; padding: 3mm 8mm; border-radius: 2mm; font-family: ${DESIGN.fonts.mono}; font-size: 14pt; font-weight: 500; letter-spacing: 2px; color: ${DESIGN.colors.primary}; margin-bottom: 10mm; }
.details-grid { width: 100%; max-width: 160mm; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; padding: 8mm; background: ${DESIGN.colors.cardBg}; border-radius: 3mm; border: 0.3mm solid ${DESIGN.colors.border}; }
.detail-item { text-align: center; padding: 3mm; }
.detail-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.5px; color: ${DESIGN.colors.textLight}; margin-bottom: 2mm; }
.detail-value { font-size: 11pt; font-weight: 500; color: ${DESIGN.colors.text}; }
.footer { text-align: center; padding-top: 8mm; margin-top: auto; font-size: 8pt; color: ${DESIGN.colors.textLight}; }
.footer-brand { font-weight: 600; letter-spacing: 2px; color: ${DESIGN.colors.primary}; }
`;

/**
 * Gera HTML para PDF de link individual (uma cor destacada)
 */
export function generateLinkHtml(
  tissue: TissueData,
  color: { name: string; hex: string; family?: string | null },
  skuFilho: string,
  imageBase64: string | null
): string {
  const imageContent = imageBase64
    ? `<img src="${imageBase64}" alt="${color.name}"/>`
    : `<div class="color-swatch" style="background:${color.hex}"></div>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${tissue.name} - ${color.name} - RAZAI</title><style>${SINGLE_LINK_STYLES}</style></head><body>
<div class="page">
<header class="header">
<div class="brand">RAZAI TECIDOS</div>
<h1 class="tissue-name">${tissue.name}</h1>
<div class="color-title">${color.name}</div>
</header>
<main class="content">
<div class="image-container">${imageContent}</div>
<div class="sku-display">${skuFilho}</div>
<div class="details-grid">
<div class="detail-item"><div class="detail-label">Largura</div><div class="detail-value">${tissue.width} cm</div></div>
<div class="detail-item"><div class="detail-label">Composição</div><div class="detail-value">${tissue.composition || '—'}</div></div>
<div class="detail-item"><div class="detail-label">Família</div><div class="detail-value">${color.family || '—'}</div></div>
<div class="detail-item"><div class="detail-label">Cor HEX</div><div class="detail-value">${color.hex.toUpperCase()}</div></div>
</div>
</main>
<footer class="footer"><span class="footer-brand">RAZAI</span> • ${tissue.name} • ${color.name}</footer>
</div>
</body></html>`;
}

/**
 * Calcula dimensões para compressão de imagem mantendo proporção
 */
export function compressImageForPdf(options: {
  width: number;
  height: number;
  targetMaxDimension: number;
}): { width: number; height: number; quality: number } {
  const { width, height, targetMaxDimension } = options;
  
  // Se já é pequena, não precisa redimensionar
  if (width <= targetMaxDimension && height <= targetMaxDimension) {
    return { width, height, quality: 0.7 };
  }
  
  // Calcula escala mantendo proporção
  const scale = targetMaxDimension / Math.max(width, height);
  
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    quality: 0.6, // Qualidade menor para imagens maiores
  };
}
