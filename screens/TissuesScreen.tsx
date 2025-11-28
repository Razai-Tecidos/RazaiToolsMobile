import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Share, Alert, ActivityIndicator, TextInput, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareSheet from '../components/ShareSheet';
import { generateTissuePdf } from '../lib/pdf';
import { SkeletonList } from '../components/Skeleton';
import { theme } from '../lib/theme';
import { AnimatedCard } from '../components/AnimatedCard';

import { useTissues } from '../hooks/useTissues';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const WEB_APP_URL = 'https://razai-colaborador.vercel.app';

export default function TissuesScreen({ navigation }: any) {
  const { data: tissues = [], isLoading: loading } = useTissues();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedTissue, setSelectedTissue] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  function handleSharePress(tissue: any) {
    setSelectedTissue(tissue);
    setShareModalVisible(true);
  }

  async function handleSharePdf() {
    if (!selectedTissue) return;
    setGenerating(true);
    try {
      await generateTissuePdf(selectedTissue.id);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Verifique se há cores vinculadas.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleShareLink() {
    if (!selectedTissue) return;
    const url = `${WEB_APP_URL}/vitrine/tecido/${selectedTissue.id}`;
    try {
      await Share.share({
        message: `Confira o tecido ${selectedTissue.name} no nosso catálogo: ${url}`,
        url: url, // iOS only
      });
    } catch (error) {
      console.error(error);
    }
  }

  const handleSearchFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchFocused(true);
  };

  const handleSearchCancel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQuery('');
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const filteredTissues = useMemo(() => {
    if (!query.trim()) return tissues;
    const normalized = query.trim().toLowerCase();
    return tissues.filter((t: any) =>
      t.name.toLowerCase().includes(normalized) ||
      t.sku.toLowerCase().includes(normalized) ||
      String(t.width || '').toLowerCase().includes(normalized)
    );
  }, [tissues, query]);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={filteredTissues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <>
              {!isSearchFocused && (
                <View style={styles.hero}>
                  <Text style={styles.brand}>Coleção</Text>
                  <Text style={styles.heroTitle}>Tecidos RAZAI</Text>
                  <Text style={styles.heroSubtitle}>Explore, compartilhe e abra detalhes premium de cada tecido.</Text>
                  <View style={styles.heroStats}>
                    <View style={styles.heroChip}>
                      <Text style={styles.heroChipValue}>{tissues.length}</Text>
                      <Text style={styles.heroChipLabel}>Cadastrados</Text>
                    </View>
                    <View style={styles.heroChip}>
                      <Text style={styles.heroChipValue}>{filteredTissues.length}</Text>
                      <Text style={styles.heroChipLabel}>Filtrados</Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={[styles.searchCard, isSearchFocused && styles.searchCardFocused]}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nome, SKU ou largura"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={handleSearchFocus}
                  autoCapitalize="none"
                />
                {(query.length > 0 || isSearchFocused) && (
                  <TouchableOpacity onPress={handleSearchCancel}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: 8 }}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          renderItem={({ item, index }) => (
            <AnimatedCard index={index}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('TissueDetails', { id: item.id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.monogram}>
                    <Text style={styles.monogramText}>{item.name?.slice(0, 1) || 'T'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.sku}</Text>
                  </View>
                  <TouchableOpacity style={styles.shareChip} onPress={() => handleSharePress(item)}>
                    <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.shareChipText}>Compartilhar</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardMetaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="resize-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{item.width || '—'} cm</Text>
                  </View>
                  <View style={[styles.metaPill, { marginLeft: theme.spacing.sm }]}>
                    <Ionicons name="color-palette-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{item.composition || 'Composição não informada'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{query ? 'Nada corresponde à busca.' : 'Nenhum tecido cadastrado.'}</Text>}
        />
      )}

      <ShareSheet 
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onSharePdf={handleSharePdf}
        onShareLink={handleShareLink}
      />

      {generating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Gerando PDF...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  hero: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  brand: {
    fontSize: theme.font.sizes.xs,
    letterSpacing: 6,
    color: '#ffffff99',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: theme.colors.textInverse,
    fontSize: theme.font.sizes.display,
    fontWeight: theme.font.weights.bold,
    marginTop: theme.spacing.xs,
  },
  heroSubtitle: {
    color: '#ffffffcc',
    marginTop: theme.spacing.sm,
    fontSize: theme.font.sizes.sm,
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
  },
  heroChip: {
    backgroundColor: '#ffffff10',
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginRight: theme.spacing.sm,
  },
  heroChipValue: {
    color: theme.colors.textInverse,
    fontSize: 28,
    fontWeight: theme.font.weights.bold,
  },
  heroChipLabel: {
    color: '#ffffff99',
    fontSize: theme.font.sizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  searchCardFocused: {
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceAlt,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  monogramText: {
    color: theme.colors.primary,
    fontWeight: theme.font.weights.bold,
    fontSize: theme.font.sizes.lg,
  },
  cardTitle: {
    fontSize: theme.font.sizes.lg,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  cardSubtitle: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  shareChipText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.primary,
    fontWeight: theme.font.weights.semibold,
    fontSize: theme.font.sizes.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  metaText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: theme.colors.textInverse,
    marginTop: theme.spacing.md,
  },
});
