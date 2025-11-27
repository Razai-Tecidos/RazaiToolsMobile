import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../lib/theme';
import { Skeleton } from '../components/Skeleton';
import LinkCard from '../components/LinkCard';

export default function HomeScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const [stats, setStats] = useState({ tissues: 0, colors: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  // Removido: cutterMode, modalVisible, selectedItem, quantity - agora usa StockOutFlowScreen

  useEffect(() => {
    fetchStats();
  }, []);

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
      <LinkCard 
        item={item} 
        onPress={() => {
          navigation.navigate('LinkDetails', { id: item.id });
        }} 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.title, { marginBottom: 0 }]}>Razai Mobile</Text>
          <TouchableOpacity onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tecido, cor ou código..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          {searching && <ActivityIndicator size="small" color="#2563eb" />}
        </View>
      </View>

      {searchQuery.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            !searching ? <Text style={styles.emptyText}>Nenhum resultado encontrado.</Text> : null
          }
        />
      ) : (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Bem-vindo ao sistema de gestão</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              {loading ? (
                <Skeleton width={60} height={28} />
              ) : (
                <Text style={styles.statNumber}>{stats.tissues}</Text>
              )}
              <Text style={styles.statLabel}>Tecidos</Text>
            </View>
            <View style={styles.statCard}>
              {loading ? (
                <Skeleton width={60} height={28} />
              ) : (
                <Text style={styles.statNumber}>{stats.colors}</Text>
              )}
              <Text style={styles.statLabel}>Cores</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Tecidos')}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Ver Tecidos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { marginTop: 16, backgroundColor: theme.colors.danger }]}
            onPress={() => navigation.navigate('StockOutFlow')}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              ✂️ Avisar Falta de Tecido
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },
});

