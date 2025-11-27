import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareSheet from '../components/ShareSheet';
import { generateTissuePdf } from '../lib/pdf';
import { SkeletonList } from '../components/Skeleton';
import { theme } from '../lib/theme';

import { useTissues } from '../hooks/useTissues';

const WEB_APP_URL = 'https://razai-colaborador.vercel.app';

export default function TissuesScreen({ navigation }: any) {
  const { data: tissues = [], isLoading: loading, error } = useTissues();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedTissue, setSelectedTissue] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tecidos</Text>
        <Text style={styles.subtitle}>Lista de tecidos cadastrados</Text>
      </View>
      
      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={tissues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('TissueDetails', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.sku} • {item.width}cm</Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareBtn}
                  onPress={() => handleSharePress(item)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="share-social-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum tecido encontrado.</Text>}
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
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.font.sizes.xl,
    fontWeight: theme.font.weights.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  list: {
    padding: theme.spacing.lg,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xxxl,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: theme.font.sizes.sm,
    color: theme.colors.textSecondary,
  },
  shareBtn: {
    padding: theme.spacing.sm,
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
