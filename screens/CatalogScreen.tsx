import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ShareSheet from '../components/ShareSheet';

import { useTissues } from '../hooks/useTissues';
import { theme } from '../lib/theme';

const WEB_APP_URL = 'https://razai-colaborador.vercel.app';

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function CatalogScreen() {
  const { data: tissues = [], isLoading: loading } = useTissues();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const selectedCount = selectedIds.size;
  const totalTissues = tissues.length;
  const allSelected = totalTissues > 0 && selectedCount === totalTissues;

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(tissues.map(t => t.id)));
  }

  async function handleSharePdf() {
    if (selectedIds.size === 0) return;
    setGenerating(true);

    try {
      const ids = Array.from(selectedIds);
      
      // Fetch details for all selected tissues
      // We need links for each tissue
      const { data: linksData, error } = await supabase
        .from('links')
        .select(`
          *,
          tissues (*),
          colors (*)
        `)
        .in('tissue_id', ids)
        .eq('status', 'Ativo')
        .order('tissue_id'); // Group by tissue roughly

      if (error) throw error;

      // Group by tissue
      const grouped = new Map<string, { tissue: any, links: any[] }>();
      
      // Initialize with selected tissues to ensure order or existence even if empty
      // (Optional: fetch tissues again if needed, but we have them in 'tissues' state)
      ids.forEach(id => {
        const t = tissues.find(x => x.id === id);
        if (t) grouped.set(id, { tissue: t, links: [] });
      });

      linksData?.forEach(l => {
        if (grouped.has(l.tissue_id)) {
          grouped.get(l.tissue_id)?.links.push({
            ...l,
            imageUrl: l.image_path 
              ? supabase.storage.from('tissue-images').getPublicUrl(l.image_path).data.publicUrl
              : null
          });
        }
      });

      const sectionsHtml = Array.from(grouped.values()).map((group, index) => {
        const { tissue, links } = group;
        return `
          <section class="tissue-section" style="${index > 0 ? 'page-break-before: always;' : ''}">
            <header class="section-header">
              <div class="brand-pill">RAZAI</div>
              <div>
                <p class="eyebrow">Coleção exclusiva • ${links.length} variações</p>
                <h1>${tissue.name}</h1>
                <p class="meta">Largura ${tissue.width || '—'} cm · ${tissue.composition || 'Composição não informada'}</p>
              </div>
            </header>
            <div class="grid">
              ${links.map(l => `
                <article class="color-card">
                  <div class="thumb">
                    ${l.imageUrl
                      ? `<img src="${l.imageUrl}" />`
                      : `<div class="swatch" style="background:${l.colors?.hex || '#d1d5db'}"></div>`}
                  </div>
                  <div class="color-info">
                    <strong>${l.colors?.name || 'Sem nome'}</strong>
                    <span>${l.sku_filho}</span>
                  </div>
                </article>
              `).join('')}
            </div>
          </section>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4; margin: 32pt; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
            }
            section.tissue-section {
              background: #fff;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 20px 60px rgba(15,23,42,0.08);
              margin-bottom: 24px;
            }
            section.tissue-section header {
              display: flex;
              align-items: center;
              gap: 24px;
              margin-bottom: 28px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 20px;
            }
            .brand-pill {
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.3em;
              text-transform: uppercase;
              color: #0f172a;
              padding: 8px 14px;
              border-radius: 999px;
              border: 1px solid #e2e8f0;
            }
            .eyebrow {
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.2em;
              margin: 0;
              color: #64748b;
            }
            header h1 {
              font-size: 34px;
              margin: 6px 0 4px;
              font-weight: 600;
            }
            .meta {
              font-size: 13px;
              color: #475569;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
            }
            .color-card {
              background: #f8fafc;
              border-radius: 14px;
              padding: 14px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              border: 1px solid #e2e8f0;
            }
            .thumb {
              width: 100%;
              aspect-ratio: 1/1;
              border-radius: 12px;
              overflow: hidden;
              background: #e2e8f0;
            }
            .thumb img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            .swatch {
              width: 100%;
              height: 100%;
            }
            .color-info {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .color-info strong {
              font-size: 15px;
            }
            .color-info span {
              font-size: 12px;
              letter-spacing: 0.08em;
              color: #64748b;
              font-family: 'Space Mono', monospace;
            }
          </style>
        </head>
        <body>
          ${sectionsHtml}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      console.error('Error generating catalog:', error);
      Alert.alert('Erro', 'Falha ao gerar catálogo.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleShareLink() {
    const url = `${WEB_APP_URL}/vitrine`;
    try {
      await Share.share({
        message: `Confira nosso catálogo completo de tecidos: ${url}`,
        url: url,
      });
    } catch (error) {
      console.error(error);
    }
  }
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroBadge}>Coleção Razai</Text>
          <View style={styles.heroIcons}>
            <Ionicons name="document-text-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Ionicons name="share-social-outline" size={18} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Catálogo premium</Text>
        <Text style={styles.heroSubtitle}>
          Monte uma curadoria elegante e compartilhe como PDF ou vitrine responsiva.
        </Text>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Ionicons name="sparkles-outline" size={14} color="#fff" />
            <Text style={styles.heroChipText}>PDF com branding</Text>
          </View>
          <View style={styles.heroChip}>
            <Ionicons name="link-outline" size={14} color="#fff" />
            <Text style={styles.heroChipText}>Link compartilhável</Text>
          </View>
        </View>
      </View>

      <View style={styles.selectionPanel}>
        <View style={styles.selectionDetails}>
          <View>
            <Text style={styles.selectionLabel}>Seleção ativa</Text>
            <Text style={styles.selectionValue}>{selectedCount}</Text>
          </View>
          <View style={styles.selectionDivider} />
          <View>
            <Text style={styles.selectionLabel}>Tecidos totais</Text>
            <Text style={styles.selectionValue}>{totalTissues}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleSelectAll} style={styles.selectionButton} activeOpacity={0.9}>
          <Ionicons name={allSelected ? 'close' : 'add'} size={16} color={theme.colors.primary} />
          <Text style={styles.selectionButtonText}>{allSelected ? 'Limpar seleção' : 'Selecionar todos'}</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Sincronizando catálogo…</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={tissues}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="archive-outline" size={32} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum tecido cadastrado</Text>
            <Text style={styles.emptySubtitle}>Os lançamentos aparecerão aqui para compor o PDF premium.</Text>
          </View>
        ) : null}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          const initials = getInitials(item.name);
          const widthLabel = item.width ? `${item.width} cm` : 'Largura flexível';
          const compositionLabel = item.composition || 'Composição não informada';

          return (
            <TouchableOpacity
              style={[styles.catalogCard, selected && styles.catalogCardSelected]}
              onPress={() => toggleSelection(item.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.monogram, selected && styles.monogramSelected]}>
                  <Text style={[styles.monogramText, selected && styles.monogramTextSelected]}>{initials}</Text>
                </View>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.catalogTitle}>{item.name}</Text>
                  <Text style={styles.catalogSubtitle}>{item.sku}</Text>
                </View>
                <View style={[styles.selectionBadge, selected && styles.selectionBadgeActive]}>
                  <Ionicons
                    name={selected ? 'checkmark' : 'add'}
                    size={14}
                    color={selected ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.metaPill}>
                  <Ionicons name="resize-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaPillText}>{widthLabel}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="color-palette-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaPillText} numberOfLines={1}>{compositionLabel}</Text>
                </View>
              </View>
              <Text style={styles.hintText}>
                Toque para {selected ? 'remover da' : 'adicionar à'} seleção premium.
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Entrega personalizada</Text>
        <TouchableOpacity
          style={[styles.button, (selectedCount === 0 || generating) && styles.buttonDisabled]}
          disabled={selectedCount === 0 || generating}
          onPress={() => setShareModalVisible(true)}
          activeOpacity={0.9}
        >
          {generating ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="share-outline" size={18} color={theme.colors.textInverse} />
              <Text style={styles.buttonText}>Compartilhar seleção ({selectedCount})</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.footerHint}>Abriremos opções para PDF premium e vitrine compartilhável.</Text>
      </View>

      <ShareSheet
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onSharePdf={handleSharePdf}
        onShareLink={handleShareLink}
        title="Exportar Catálogo"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    ...theme.shadow.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroBadge: {
    fontSize: theme.font.sizes.xs,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    fontWeight: theme.font.weights.semibold,
  },
  heroIcons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: theme.font.sizes.display,
    fontWeight: theme.font.weights.bold,
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: theme.font.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  heroChips: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  heroChipText: {
    color: '#fff',
    fontSize: theme.font.sizes.xs,
    fontWeight: theme.font.weights.medium,
  },
  selectionPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing.md,
  },
  selectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  selectionLabel: {
    fontSize: theme.font.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
  },
  selectionValue: {
    fontSize: theme.font.sizes.xl,
    fontWeight: theme.font.weights.bold,
    color: theme.colors.text,
    marginTop: 2,
  },
  selectionDivider: {
    width: 1,
    height: 42,
    backgroundColor: theme.colors.border,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceAlt,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  selectionButtonText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizes.sm,
    fontWeight: theme.font.weights.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizes.sm,
  },
  listContent: {
    paddingBottom: 180,
  },
  catalogCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  catalogCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  monogramSelected: {
    backgroundColor: theme.colors.primary,
  },
  monogramText: {
    fontSize: theme.font.sizes.md,
    fontWeight: theme.font.weights.bold,
    color: theme.colors.text,
  },
  monogramTextSelected: {
    color: theme.colors.textInverse,
  },
  cardTitleGroup: {
    flex: 1,
  },
  catalogTitle: {
    fontSize: theme.font.sizes.lg,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  catalogSubtitle: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    flex: 1,
  },
  metaPillText: {
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  hintText: {
    marginTop: theme.spacing.md,
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.font.sizes.lg,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  footerLabel: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: theme.font.sizes.md,
    fontWeight: theme.font.weights.semibold,
  },
  footerHint: {
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
  },
});
