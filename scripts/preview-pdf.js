/**
 * Script para visualizar o PDF gerado no navegador
 * Execute: node scripts/preview-pdf.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Simula os design tokens e estilos do html-generator.ts
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
@page { size: A4; margin: 15mm 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${DESIGN.fonts.main}; color: ${DESIGN.colors.text}; background: ${DESIGN.colors.background}; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.tissue-section { page-break-before: always; page-break-inside: avoid; }
.tissue-section:first-child { page-break-before: avoid; }
.header { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 6mm; margin-bottom: 8mm; border-bottom: 0.5mm solid ${DESIGN.colors.primary}; }
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
.colors-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.color-card { page-break-inside: avoid; break-inside: avoid; background: ${DESIGN.colors.background}; border: 0.3mm solid ${DESIGN.colors.border}; border-radius: 2mm; overflow: hidden; }
.color-image { width: 100%; aspect-ratio: 1; overflow: hidden; position: relative; }
.color-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.color-swatch { width: 100%; height: 100%; }
.color-info { padding: 2.5mm 3mm; background: ${DESIGN.colors.background}; border-top: 0.3mm solid ${DESIGN.colors.border}; }
.color-name { font-size: 8pt; font-weight: 600; color: ${DESIGN.colors.text}; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.color-details { display: flex; justify-content: space-between; align-items: center; }
.color-sku { font-family: ${DESIGN.fonts.mono}; font-size: 6pt; color: ${DESIGN.colors.textMuted}; letter-spacing: 0.5px; }
.color-hex { font-family: ${DESIGN.fonts.mono}; font-size: 6pt; color: ${DESIGN.colors.textLight}; text-transform: uppercase; }

/* Preview helpers */
.preview-info { background: #fff3cd; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 12px; }
.a4-page { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 15mm 12mm; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
@media screen { body { background: #f0f0f0; padding: 20px; } }
`;

// Dados de teste - simula tecidos reais
const testTissues = [
  {
    name: 'Anarruga',
    sku: 'T001',
    width: 150,
    composition: '100% Poliéster',
    colors: [
      { name: 'Preto Urbano', hex: '#1a1a1a', sku: 'T001-PT001' },
      { name: 'Branco Neve', hex: '#fafafa', sku: 'T001-BR001' },
      { name: 'Azul Royal', hex: '#1e3a8a', sku: 'T001-AZ001' },
      { name: 'Vermelho Cereja', hex: '#dc2626', sku: 'T001-VM001' },
      { name: 'Verde Esmeralda', hex: '#059669', sku: 'T001-VD001' },
      { name: 'Amarelo Sol', hex: '#eab308', sku: 'T001-AM001' },
      { name: 'Rosa Pink', hex: '#ec4899', sku: 'T001-RS001' },
      { name: 'Roxo Violeta', hex: '#7c3aed', sku: 'T001-RX001' },
      { name: 'Laranja Tangerina', hex: '#ea580c', sku: 'T001-LR001' },
      { name: 'Cinza Chumbo', hex: '#525252', sku: 'T001-CZ001' },
      { name: 'Marrom Café', hex: '#78350f', sku: 'T001-MR001' },
      { name: 'Bege Areia', hex: '#d4c4a8', sku: 'T001-BG001' },
      { name: 'Azul Marinho', hex: '#1e3a5f', sku: 'T001-AZ002' },
      { name: 'Turquesa', hex: '#06b6d4', sku: 'T001-TQ001' },
    ]
  },
  {
    name: 'Canelado',
    sku: 'T002',
    width: 180,
    composition: '95% Algodão, 5% Elastano',
    colors: [
      { name: 'Off White', hex: '#f5f5f0', sku: 'T002-OW001' },
      { name: 'Nude', hex: '#d4a574', sku: 'T002-ND001' },
      { name: 'Terracota', hex: '#c2410c', sku: 'T002-TC001' },
      { name: 'Musgo', hex: '#4d7c0f', sku: 'T002-MS001' },
      { name: 'Bordô', hex: '#7f1d1d', sku: 'T002-BD001' },
      { name: 'Petróleo', hex: '#134e4a', sku: 'T002-PT001' },
    ]
  }
];

function generateColorCard(color) {
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
    </div>`;
}

function generateTissueSection(tissue, isFirst) {
  const colorCards = tissue.colors.map(generateColorCard).join('');
  
  return `
  <div class="tissue-section"${isFirst ? '' : ' style="page-break-before: always"'}>
    <header class="header">
      <div class="header-left">
        <div class="brand">RAZAI TECIDOS</div>
        <h1 class="tissue-name">${tissue.name}</h1>
        <div class="tissue-meta">
          <div class="meta-item">
            <span class="meta-label">Largura</span>
            <span class="meta-value">${tissue.width} cm</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Composição</span>
            <span class="meta-value">${tissue.composition}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="sku-badge">${tissue.sku}</div>
        <div class="color-count">${tissue.colors.length} cores</div>
      </div>
    </header>
    <div class="colors-grid">
      ${colorCards}
    </div>
  </div>`;
}

function generatePreviewHtml() {
  const tissueSections = testTissues.map((tissue, i) => 
    generateTissueSection(tissue, i === 0)
  ).join('');

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
    <strong>🔍 Preview do PDF</strong> - Este é o layout que será gerado. 
    Use Ctrl+P para ver como ficará impresso. 
    Cada tecido começa em uma nova página.
  </div>
  
  <div class="a4-page">
    ${tissueSections}
  </div>
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
