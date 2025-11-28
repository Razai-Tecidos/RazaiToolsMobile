import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, FlatList, Linking, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../lib/theme';
import { Skeleton } from '../components/Skeleton';
import { AnimatedCard } from '../components/AnimatedCard';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const WEB_APP_URL = 'https://razai-colaborador.vercel.app';

export default function HomeScreen({ navigation }: any) {
  const { signOut, role, user } = useAuth();
  const [stats, setStats] = useState({ tissues: 0, colors: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    fetchStats();
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchFocused(true);
  };

  const handleSearchCancel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchQuery('');
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  async function fetchProfile() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        // Capitalize first letter
        const name = data.display_name || data.username || 'Colaborador';
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (e) {
      // ignore
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  async function fetchStats() {
    try {
      const [tissuesResponse, colorsResponse] = await Promise.all([
        supabase.from('tissues').select('*', { count: 'exact', head: true }),
        supabase.from('colors').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        tissues: tissuesResponse.count || 0,
        colors: colorsResponse.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query: string) {
    setSearching(true);
    try {
      // 1. Find matching Tissues
      const { data: tissues } = await supabase
        .from('tissues')
        .select('id')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
      
      const tissueIds = tissues?.map(t => t.id) || [];

      // 2. Find matching Colors
      const { data: colors } = await supabase
        .from('colors')
        .select('id')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
      
      const colorIds = colors?.map(c => c.id) || [];

      // 3. Find Links matching SKU OR Tissue OR Color
      let linkQuery = supabase
        .from('links')
        .select(`
          id,
          sku_filho,
          image_path,
          tissues!inner (name, sku),
          colors!inner (name, sku, hex)
        `)
        .limit(50);

      const conditions = [`sku_filho.ilike.%${query}%`];
      if (tissueIds.length > 0) conditions.push(`tissue_id.in.(${tissueIds.join(',')})`);
      if (colorIds.length > 0) conditions.push(`color_id.in.(${colorIds.join(',')})`);

      const { data: links, error } = await linkQuery.or(conditions.join(','));

      if (error) throw error;
      setSearchResults(links || []);

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }

  // Funções handleShortage e confirmShortage movidas para StockOutFlowScreen

  function renderSearchResult({ item }: { item: any }) {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => navigation.navigate('LinkDetails', { id: item.id })}
      >
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{item.tissues?.name?.slice(0, 1) || 'R'}</Text>
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>{item.tissues?.name}</Text>
          <Text style={styles.resultSubtitle}>{item.colors?.name} • {item.sku_filho}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const showResults = searchQuery.trim().length > 1;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={showResults ? searchResults : []}
        keyExtractor={(item) => item.id}
        renderItem={renderSearchResult}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            {!isSearchFocused && (
              <AnimatedCard index={0} style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.brandPill}>RAZAI {role === 'admin' ? 'ADMIN' : ''}</Text>
                    <Text style={styles.heroTitle}>{getGreeting()}, {userName}!</Text>
                    <Text style={styles.heroSubtitle}>Controle de estoque impecável com poucos toques.</Text>
                  </View>
                  <TouchableOpacity onPress={() => signOut()} style={styles.signOutBtn}>
                    <Ionicons name="log-out-outline" size={20} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                </View>
                <View style={styles.heroActions}>
                  <TouchableOpacity style={styles.heroPrimary} onPress={() => navigation.navigate('StockOutFlow')}>
                    <Ionicons name="cut" size={20} color={theme.colors.textInverse} />
                    <View style={styles.heroPrimaryText}>
                      <Text style={styles.heroPrimaryLabel}>Registrar falta</Text>
                      <Text style={styles.heroPrimaryCaption}>Fluxo guiado em 3 passos</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.statGrid}>
                  <View style={styles.statCard}>
                    {loading ? (
                      <Skeleton width={72} height={28} />
                    ) : (
                      <>
                        <Text style={styles.statValue}>{stats.tissues}</Text>
                        <Text style={styles.statLabel}>Tecidos</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.statCard}>
                    {loading ? (
                      <Skeleton width={72} height={28} />
                    ) : (
                      <>
                        <Text style={styles.statValue}>{stats.colors}</Text>
                        <Text style={styles.statLabel}>Cores</Text>
                      </>
                    )}
                  </View>
                </View>
              </AnimatedCard>
            )}

            <AnimatedCard index={1} style={[styles.searchPanel, isSearchFocused && styles.searchPanelFocused]}>
              {!isSearchFocused && (
                <View style={styles.searchHeader}>
                  <Text style={styles.sectionTitle}>Busca global</Text>
                  {searching && <ActivityIndicator size="small" color={theme.colors.primary} />}
                </View>
              )}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Digite código, tecido ou cor"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={handleSearchFocus}
                  autoCapitalize="none"
                />
                {(searchQuery.length > 0 || isSearchFocused) && (
                  <TouchableOpacity onPress={handleSearchCancel}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: 8 }}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!showResults && !isSearchFocused && (
                <View style={styles.guidedCard}>
                  <View style={styles.guidedIcon}>
                    <Ionicons name="sparkles-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guidedTitle}>Tudo em um só lugar</Text>
                    <Text style={styles.guidedCaption}>Pesquise por SKU, cor, tecido ou abra os atalhos acima.</Text>
                  </View>
                </View>
              )}
            </AnimatedCard>

            {role === 'admin' && !isSearchFocused && (
              <AnimatedCard index={2} style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
                <TouchableOpacity
                  style={styles.adminCard}
                  onPress={() => Linking.openURL(WEB_APP_URL)}
                  activeOpacity={0.85}
                >
                  <View style={styles.adminIconWrap}>
                    <Ionicons name="settings-outline" size={24} color={theme.colors.textInverse} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminTitle}>Painel Administrativo</Text>
                    <Text style={styles.adminSubtitle}>Gerenciar cores, usuários e configurações avançadas via Web.</Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color={theme.colors.textInverse} />
                </TouchableOpacity>
              </AnimatedCard>
            )}
          </>
        )}
        ListEmptyComponent={
          showResults && !searching ? (
            <Text style={styles.emptyText}>Nenhum tecido encontrado para "{searchQuery}".</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  heroCard: {
    backgroundColor: theme.colors.text,
    margin: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  brandPill: {
    fontSize: theme.font.sizes.xs,
    letterSpacing: 6,
    textTransform: 'uppercase',
    color: '#ffffff99',
    marginBottom: theme.spacing.xs,
  },
  heroTitle: {
    fontSize: 32,
    color: theme.colors.textInverse,
    fontWeight: theme.font.weights.bold,
  },
  heroSubtitle: {
    color: '#ffffffcc',
    marginTop: theme.spacing.sm,
    fontSize: theme.font.sizes.sm,
    maxWidth: 260,
    lineHeight: 20,
  },
  signOutBtn: {
    backgroundColor: '#0f172a',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
  },
  heroActions: {
    marginBottom: theme.spacing.lg,
  },
  heroPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  heroPrimaryText: {
    marginLeft: theme.spacing.sm,
  },
  heroPrimaryLabel: {
    color: theme.colors.textInverse,
    fontWeight: theme.font.weights.semibold,
    fontSize: theme.font.sizes.base,
  },
  heroPrimaryCaption: {
    color: '#e0edff',
    fontSize: theme.font.sizes.xs,
  },
  heroSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.sm,
  },
  heroSecondaryLabel: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.primary,
    fontWeight: theme.font.weights.semibold,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff12',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  statValue: {
    color: theme.colors.textInverse,
    fontSize: 32,
    fontWeight: theme.font.weights.bold,
  },
  statLabel: {
    color: '#ffffff99',
    marginTop: theme.spacing.xs,
    fontSize: theme.font.sizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  shortcutSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  shortcutLabel: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  shortcutCaption: {
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b', // Slate 800
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  adminTitle: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.bold,
    color: theme.colors.textInverse,
  },
  adminSubtitle: {
    fontSize: theme.font.sizes.xs,
    color: '#94a3b8',
    marginTop: 2,
  },
  searchPanel: {
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchPanelFocused: {
    marginHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingTop: theme.spacing.md,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.text,
  },
  guidedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
  },
  guidedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  guidedTitle: {
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  guidedCaption: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: theme.font.sizes.lg,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptyStateCaption: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: theme.font.weights.semibold,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  resultCard: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  resultBadgeText: {
    color: theme.colors.primary,
    fontWeight: theme.font.weights.bold,
    fontSize: theme.font.sizes.md,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
  },
  resultSubtitle: {
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

