import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const { uri } = await FileSystem.downloadAsync(
      url,
      FileSystem.cacheDirectory + 'temp_image_' + Math.random().toString(36).substring(7)
    );
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return null;
  }
}

export async function generateTissuePdf(tissueId: string) {
  try {
    // Fetch Tissue
    const { data: tissue, error: tissueError } = await supabase
      .from('tissues')
      .select('*')
      .eq('id', tissueId)
      .single();
    
    if (tissueError) throw tissueError;

    // Fetch Links
    const { data: links, error: linksError } = await supabase
      .from('links')
      .select(`
        *,
        colors (*)
      `)
      .eq('tissue_id', tissueId)
      .eq('status', 'Ativo');

    if (linksError) throw linksError;

    if (!links || links.length === 0) {
      throw new Error('Não há cores vinculadas para gerar o PDF.');
    }

    // Prepare data with base64 images
    const linksWithImages = await Promise.all(links.map(async (l: any) => {
      let imageUrl = null;
      if (l.image_path) {
        const publicUrl = supabase.storage.from('tissue-images').getPublicUrl(l.image_path).data.publicUrl;
        // Add cache buster to ensure we get the latest version
        const urlWithCache = `${publicUrl}?t=${Date.now()}`;
        imageUrl = await urlToBase64(urlWithCache);
      }
      return { ...l, imageUrl };
    }));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: A4; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            color: #111;
            background: #fff;
          }
          .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #111;
            padding-bottom: 20px;
          }
          .brand {
            font-size: 14px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
          }
          .title {
            font-size: 36px;
            font-weight: 300;
            margin: 0;
            margin-bottom: 12px;
            text-transform: capitalize;
          }
          .meta-grid {
            display: flex;
            gap: 40px;
            margin-top: 16px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .meta-value {
            font-size: 16px;
            font-weight: 500;
          }
          .grid {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: flex-start;
          }
          .card {
            width: 30%;
            margin-bottom: 30px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .image-container {
            width: 100%;
            aspect-ratio: 1;
            background-color: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
            border: 1px solid #eee;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .color-placeholder {
            width: 100%;
            height: 100%;
          }
          .info-name {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #000;
          }
          .info-sku {
            font-size: 12px;
            color: #666;
            font-family: monospace;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">RAZAI</div>
          <h1 class="title">${tissue.name}</h1>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Largura</span>
              <span class="meta-value">${tissue.width} cm</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Composição</span>
              <span class="meta-value">${tissue.composition || 'Não informada'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">SKU Base</span>
              <span class="meta-value">${tissue.sku}</span>
            </div>
          </div>
        </div>

        <div class="grid">
          ${linksWithImages.map((l: any) => `
            <div class="card">
              <div class="image-container">
                ${l.imageUrl 
                  ? `<img src="${l.imageUrl}" />` 
                  : `<div class="color-placeholder" style="background-color: ${l.colors?.hex || '#eee'}"></div>`
                }
              </div>
              <div class="info-name">${l.colors?.name}</div>
              <div class="info-sku">${l.sku_filho}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} • RAZAI Tools
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function generateLinkPdf(linkId: string) {
  try {
    // Fetch Link with details
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select(`
        *,
        tissues (*),
        colors (*)
      `)
      .eq('id', linkId)
      .single();

    if (linkError) throw linkError;
    if (!link) throw new Error('Vínculo não encontrado.');

    let imageUrl = null;
    if (link.image_path) {
      const publicUrl = supabase.storage.from('tissue-images').getPublicUrl(link.image_path).data.publicUrl;
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      imageUrl = await urlToBase64(urlWithCache);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: A4; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 60px; 
            color: #111;
            background: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .header {
            width: 100%;
            margin-bottom: 40px;
            border-bottom: 2px solid #111;
            padding-bottom: 20px;
            text-align: left;
          }
          .brand {
            font-size: 14px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
          }
          .title {
            font-size: 32px;
            font-weight: 300;
            margin: 0;
            text-transform: capitalize;
          }
          .subtitle {
            font-size: 24px;
            font-weight: 600;
            margin-top: 8px;
            color: #333;
          }
          .main-content {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .image-container {
            width: 80%;
            aspect-ratio: 1;
            background-color: #f0f0f0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 40px;
            border: 1px solid #eee;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .color-placeholder {
            width: 100%;
            height: 100%;
          }
          .details-grid {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            border-top: 1px solid #eee;
            padding-top: 30px;
          }
          .detail-item {
            margin-bottom: 15px;
          }
          .label {
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .value {
            font-size: 18px;
            font-weight: 500;
          }
          .sku-box {
            background: #f5f5f5;
            padding: 10px 20px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 2px;
            margin-top: 10px;
            display: inline-block;
          }
          .footer {
            margin-top: auto;
            padding-top: 40px;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">RAZAI</div>
          <h1 class="title">${link.tissues.name}</h1>
          <div class="subtitle">${link.colors.name}</div>
        </div>

        <div class="main-content">
          <div class="image-container">
            ${imageUrl 
              ? `<img src="${imageUrl}" />` 
              : `<div class="color-placeholder" style="background-color: ${link.colors?.hex || '#eee'}"></div>`
            }
          </div>

          <div class="sku-box">${link.sku_filho}</div>

          <div class="details-grid">
            <div class="detail-item">
              <div class="label">Largura</div>
              <div class="value">${link.tissues.width} cm</div>
            </div>
            <div class="detail-item">
              <div class="label">Composição</div>
              <div class="value">${link.tissues.composition || '—'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Família de Cor</div>
              <div class="value">${link.colors.family || '—'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Código Base</div>
              <div class="value">${link.tissues.sku}</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} • RAZAI Tools
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;

  } catch (error) {
    console.error('Error generating Link PDF:', error);
    throw error;
  }
}
