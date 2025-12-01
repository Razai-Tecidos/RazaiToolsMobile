/**
 * Script para visualizar o PDF gerado no navegador
 * Execute: node scripts/preview-pdf.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ============================================================================
// DESIGN TOKENS & STYLES (Copiado de html-generator.ts)
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

const CATALOG_STYLES = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${DESIGN.fonts.main}; color: ${DESIGN.colors.text}; background: #f0f0f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }

/* Container da Página A4 */
.page {
  width: 210mm;
  height: 297mm;
  padding: 15mm 12mm;
  position: relative;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

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
.colors-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; align-content: start; flex: 1; }
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

.preview-info { background: #fff3cd; padding: 10px; border-radius: 4px; font-size: 12px; width: 210mm; text-align: center; }
`;

// ============================================================================
// DADOS DE TESTE
// ============================================================================

// Gera muitas cores para testar paginação
const generateColors = (count, prefix) => {
  return Array.from({ length: count }).map((_, i) => ({
    name: `Cor Teste ${i + 1}`,
    hex: ['#1a1a1a', '#dc2626', '#059669', '#eab308', '#2563eb'][i % 5],
    sku: `${prefix}-C${String(i + 1).padStart(3, '0')}`
  }));
};

const testTissues = [
  {
    name: 'Anarruga (Muitas Cores)',
    sku: 'T001',
    width: 150,
    composition: '100% Poliéster',
    colors: generateColors(30, 'T001') // 30 cores = 12 (pág 1) + 16 (pág 2) + 2 (pág 3)
  },
  {
    name: 'Canelado (Poucas Cores)',
    sku: 'T002',
    width: 180,
    composition: '95% Algodão',
    colors: generateColors(6, 'T002') // 6 cores = Apenas pág 1
  }
];

// ============================================================================
// GERADOR
// ============================================================================

function renderColorCard(color) {
  return `
    <div class="color-card">
      <div class="color-image">
        <div class="color-swatch" style="background:${color.hex}"></div>
      </div>
      <div class="color-info">
        <div class="color-name">${color.name}</div>
        <div class="color-details">
          <span class="color-sku">${color.sku}</span>
          <span class="color-hex">${color.hex}</span>
        </div>
      </div>
    </div>
  `;
}

function generateTissuePages(tissue) {
  const ITEMS_PER_PAGE_1 = 12;
  const ITEMS_PER_PAGE_N = 16;
  const pagesHtml = [];
  
  const page1Links = tissue.colors.slice(0, ITEMS_PER_PAGE_1);
  const remainingLinks = tissue.colors.slice(ITEMS_PER_PAGE_1);

  // PÁGINA 1
  const page1Cards = page1Links.map(renderColorCard).join('');
  pagesHtml.push(`
    <div class="page">
      <header class="header-full">
        <div class="header-left">
          <div class="brand">RAZAI TECIDOS</div>
          <h1 class="tissue-name">${tissue.name}</h1>
          <div class="tissue-meta">
            <div class="meta-item"><span class="meta-label">Largura</span><span class="meta-value">${tissue.width} cm</span></div>
            <div class="meta-item"><span class="meta-label">Composição</span><span class="meta-value">${tissue.composition}</span></div>
          </div>
        </div>
        <div class="header-right">
          <div class="sku-badge">${tissue.sku}</div>
          <div class="color-count">${tissue.colors.length} cores</div>
        </div>
      </header>
      <div class="colors-grid">${page1Cards}</div>
      <div class="page-footer">Página 1</div>
    </div>
  `);

  // PÁGINAS SUBSEQUENTES
  let currentPage = 2;
  for (let i = 0; i < remainingLinks.length; i += ITEMS_PER_PAGE_N) {
    const pageLinks = remainingLinks.slice(i, i + ITEMS_PER_PAGE_N);
    const pageCards = pageLinks.map(renderColorCard).join('');

    pagesHtml.push(`
      <div class="page">
        <header class="header-simple">
          <div class="simple-title">${tissue.name} <span style="font-weight:400; color:#999">(cont.)</span></div>
          <div class="simple-meta">${tissue.sku}</div>
        </header>
        <div class="colors-grid">${pageCards}</div>
        <div class="page-footer">Página ${currentPage}</div>
      </div>
    `);
    currentPage++;
  }

  return pagesHtml.join('');
}

function generatePreviewHtml() {
  const allPages = testTissues.map(generateTissuePages).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview PDF - RAZAI Catálogo</title>
  <style>${CATALOG_STYLES}</style>
</head>
<body>
  <div class="preview-info">
    <strong>🔍 Preview do PDF (Paginação Manual)</strong><br>
    Verifique se as quebras de página estão corretas.
    O Anarruga deve ter 3 páginas (12 + 16 + 2 itens).
  </div>
  ${allPages}
</body>
</html>`;
}

// Gera o HTML e salva
const html = generatePreviewHtml();
const outputPath = path.join(__dirname, '..', 'pdf-preview.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log('✅ Preview gerado em:', outputPath);
console.log('📄 Abrindo no navegador...');

// Abre no navegador padrão
const start = process.platform === 'win32' ? 'start' : 
              process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${start} "${outputPath}"`);
