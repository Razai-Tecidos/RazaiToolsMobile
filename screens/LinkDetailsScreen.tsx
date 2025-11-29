import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, ActivityIndicator, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useLink } from '../hooks/useLinks';
import { generateLinkPdf } from '../lib/pdf';

export default function LinkDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { data: link, isLoading: loading } = useLink(id);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function shareImage() {
    if (!link?.image_path) return;
    const imageUrl = supabase.storage.from('tissue-images').getPublicUrl(link.image_path).data.publicUrl;
    try {
      await Share.share({
        message: `Confira este tecido: ${link.tissues.name} - ${link.colors.name} (${link.sku_filho})`,
        url: imageUrl, // iOS only supports url sharing this way usually, but let's try
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleGeneratePdf() {
    if (!link) return;
    try {
      setGeneratingPdf(true);
      await generateLinkPdf(link.id);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!link) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Vínculo não encontrado.</Text>
      </View>
    );
  }

  // Add cache buster to force refresh image
  const imageUrl = link.image_path 
    ? `${supabase.storage.from('tissue-images').getPublicUrl(link.image_path).data.publicUrl}?t=${Date.now()}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: link.colors?.hex || '#ccc' }]} />
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.actionsContainer}>
            {imageUrl && (
              <TouchableOpacity style={styles.actionButton} onPress={shareImage}>
                <Ionicons name="share-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="document-text-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.header}>
            <Text style={styles.tissueName}>{link.tissues?.name}</Text>
            <Text style={styles.colorName}>{link.colors?.name}</Text>
            <Text style={styles.sku}>{link.sku_filho}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ficha Técnica</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Largura</Text>
              <Text style={styles.value}>{link.tissues?.width} cm</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Composição</Text>
              <Text style={styles.value}>{link.tissues?.composition || 'Não informada'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Família de Cor</Text>
              <Text style={styles.value}>{/* TODO: Infer family if needed, or just show hex */}{link.colors?.hex}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#eee',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50, // Adjusted for status bar roughly if not using SafeAreaView for top
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 24,
    marginTop: -24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    marginBottom: 32,
  },
  tissueName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  colorName: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  sku: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
});
