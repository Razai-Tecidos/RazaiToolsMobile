/**
 * Gerador de HTML otimizado para PDFs
 * 
 * Regras:
 * 1. Cada cor em página própria (page-break-before: always)
 * 2. Imagens nunca quebram (page-break-inside: avoid)
 * 3. Compressão de imagens para reduzir memória
 */

import { DEFAULT_PDF_CONFIG, PdfGenerationConfig } from './memory-utils';

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

/**
 * Gera HTML com cada cor em página própria
 */
export function generateOptimizedHtml(
  tissue: TissueData,
  links: LinkData[],
  images: ImageData[],
  _config: PdfGenerationConfig = DEFAULT_PDF_CONFIG
): string {
  const imageMap = new Map(images.map(img => [img.linkId, img.base64]));
  
  // Cada cor gera uma página completa
  const pagesHtml = links.map((link, index) => {
    const imageBase64 = imageMap.get(link.id);
    const colorHex = link.colors?.hex || '#eeeeee';
    const colorName = link.colors?.name || 'Sem nome';
    
    const imageContent = imageBase64
      ? `<img src="${imageBase64}" alt="${colorName}"/>`
      : `<div class="swatch" style="background:${colorHex}"></div>`;
    
    const isFirst = index === 0;
    
    return `<div class="page"${isFirst ? '' : ' style="page-break-before:always"'}>
<div class="header">
<div class="brand">RAZAI</div>
<h1 class="title">${tissue.name}</h1>
<div class="meta">
<span>${tissue.width}cm</span>
<span>•</span>
<span>${tissue.composition || 'Composição não informada'}</span>
<span>•</span>
<span>${tissue.sku}</span>
</div>
</div>
<div class="content">
<div class="img-box">${imageContent}</div>
<div class="info">
<div class="color-name">${colorName}</div>
<div class="color-sku">${link.sku_filho}</div>
<div class="color-hex">${colorHex.toUpperCase()}</div>
</div>
</div>
<div class="footer">${tissue.name} • ${colorName} • RAZAI</div>
</div>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Helvetica,Arial,sans-serif;color:#111;background:#fff}
.page{min-height:100vh;display:flex;flex-direction:column;padding:5mm 0;page-break-inside:avoid}
.header{text-align:center;padding-bottom:8mm;border-bottom:2px solid #111;margin-bottom:8mm}
.brand{font-size:11pt;letter-spacing:3px;font-weight:bold;margin-bottom:3mm}
.title{font-size:26pt;font-weight:300;margin-bottom:3mm}
.meta{font-size:9pt;color:#666}
.meta span{margin:0 2mm}
.content{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-inside:avoid}
.img-box{width:100%;max-width:130mm;aspect-ratio:1;border-radius:4mm;overflow:hidden;box-shadow:0 2mm 8mm rgba(0,0,0,0.1);margin-bottom:8mm;page-break-inside:avoid}
.img-box img{width:100%;height:100%;object-fit:cover;display:block}
.swatch{width:100%;height:100%}
.info{text-align:center;padding:5mm 8mm;background:#f8f9fa;border-radius:3mm;page-break-inside:avoid}
.color-name{font-size:18pt;font-weight:bold;color:#1e3a5f;margin-bottom:2mm}
.color-sku{font-size:12pt;color:#666;letter-spacing:1px;margin-bottom:2mm}
.color-hex{font-size:10pt;color:#999;font-family:monospace}
.footer{text-align:center;font-size:8pt;color:#aaa;margin-top:auto;padding-top:5mm}
</style></head><body>
${pagesHtml}
</body></html>`;
}

/**
 * Gera HTML para PDF de link individual (uma cor, uma página)
 */
export function generateLinkHtml(
  tissue: TissueData,
  color: { name: string; hex: string; family?: string | null },
  skuFilho: string,
  imageBase64: string | null
): string {
  const imageContent = imageBase64
    ? `<img src="${imageBase64}" alt="${color.name}"/>`
    : `<div class="swatch" style="background:${color.hex}"></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Helvetica,Arial,sans-serif;color:#111;background:#fff;min-height:100vh;display:flex;flex-direction:column;padding:10mm 0}
.header{text-align:center;padding-bottom:8mm;border-bottom:2px solid #111;margin-bottom:8mm}
.brand{font-size:11pt;letter-spacing:3px;font-weight:bold;margin-bottom:3mm}
.title{font-size:26pt;font-weight:300;margin-bottom:3mm}
.subtitle{font-size:16pt;font-weight:600;color:#333}
.content{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
.img-box{width:100%;max-width:130mm;aspect-ratio:1;border-radius:4mm;overflow:hidden;box-shadow:0 2mm 8mm rgba(0,0,0,0.1);margin-bottom:8mm}
.img-box img{width:100%;height:100%;object-fit:cover;display:block}
.swatch{width:100%;height:100%}
.sku-badge{background:#f5f5f5;padding:3mm 6mm;border-radius:2mm;font-family:monospace;font-size:14pt;letter-spacing:2px;margin-bottom:8mm}
.details{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:5mm;border-top:1px solid #eee;padding-top:8mm}
.detail-item{margin-bottom:3mm}
.label{font-size:8pt;text-transform:uppercase;color:#666;letter-spacing:1px;margin-bottom:1mm}
.value{font-size:12pt;font-weight:500}
.footer{text-align:center;font-size:8pt;color:#aaa;margin-top:auto;padding-top:8mm}
</style></head><body>
<div class="header">
<div class="brand">RAZAI</div>
<h1 class="title">${tissue.name}</h1>
<div class="subtitle">${color.name}</div>
</div>
<div class="content">
<div class="img-box">${imageContent}</div>
<div class="sku-badge">${skuFilho}</div>
<div class="details">
<div class="detail-item"><div class="label">Largura</div><div class="value">${tissue.width} cm</div></div>
<div class="detail-item"><div class="label">Composição</div><div class="value">${tissue.composition || '—'}</div></div>
<div class="detail-item"><div class="label">Família</div><div class="value">${color.family || '—'}</div></div>
<div class="detail-item"><div class="label">Código Base</div><div class="value">${tissue.sku}</div></div>
</div>
</div>
<div class="footer">${tissue.name} • ${color.name} • RAZAI</div>
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
