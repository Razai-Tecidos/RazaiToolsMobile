/**
 * StockOutFlowScreen - Fluxo de Saída de Estoque
 * 
 * Fluxo em 4 steps:
 * 1. Selecionar Tecido
 * 2. Selecionar Cor/Estampa (com imagens dos links)
 * 3. Informar Quantidade
 * 4. Modal de Confirmação
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { linkService } from '../lib/services/linkService';

// Types
interface Tissue {
  id: string;
  name: string;
  sku: string;
}

interface LinkWithStock {
  id: string;
  sku_filho: string;
  image_path: string | null;
  tissue_id: string;
  color_id: string;
  colors: {
    id: string;
    name: string;
    sku: string;
    hex: string | null;
  };
  stock_items: {
    quantity_rolls: number;
  }[] | null;
}

type Step = 'tissue' | 'color' | 'quantity';

interface Props {
  navigation: any;
}

export default function StockOutFlowScreen({ navigation }: Props) {
    function resolveLinkImage(imagePath: string | null | undefined): string | null {
      if (!imagePath) return null;
      if (/^https?:\/\//i.test(imagePath)) return imagePath;
      return linkService.getImageUrl(imagePath);
    }

  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>('tissue');
  
  // Data state
  const [tissues, setTissues] = useState<Tissue[]>([]);
  const [links, setLinks] = useState<LinkWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedTissue, setSelectedTissue] = useState<Tissue | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkWithStock | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Load tissues on mount
  useEffect(() => {
    loadTissues();
  }, []);

  // Load links when tissue is selected
  useEffect(() => {
    if (selectedTissue) {
      loadLinksForTissue(selectedTissue.id);
    }
  }, [selectedTissue]);

  async function loadTissues() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tissues')
        .select('id, name, sku')
        .order('name');
      
      if (error) throw error;
      setTissues(data || []);
    } catch (err) {
      console.error('Erro ao carregar tecidos:', err);
      Alert.alert('Erro', 'Não foi possível carregar os tecidos');
    } finally {
      setLoading(false);
    }
  }

  async function loadLinksForTissue(tissueId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('links')
        .select(`
          id,
          sku_filho,
          image_path,
          tissue_id,
          color_id,
          colors (id, name, sku, hex),
          stock_items (quantity_rolls)
        `)
        .eq('tissue_id', tissueId)
        .eq('status', 'Ativo')
        .order('sku_filho');
      
      if (error) throw error;
      const normalizedLinks = (data || []).map((link) => ({
        ...link,
        colors: Array.isArray(link.colors) ? link.colors[0] : link.colors,
      })) as LinkWithStock[];
      setLinks(normalizedLinks);
    } catch (err) {
      console.error('Erro ao carregar cores:', err);
      Alert.alert('Erro', 'Não foi possível carregar as cores');
    } finally {
      setLoading(false);
    }
  }

  function getStockQuantity(link: LinkWithStock): number {
    if (!link.stock_items || link.stock_items.length === 0) return 0;
    return link.stock_items[0].quantity_rolls || 0;
  }

  function handleSelectTissue(tissue: Tissue) {
    setSelectedTissue(tissue);
    setSearchQuery('');
    setCurrentStep('color');
  }

  function handleSelectLink(link: LinkWithStock) {
    setSelectedLink(link);
    setQuantity(1);
    setCurrentStep('quantity');
  }

  function handleContinueToConfirm() {
    setConfirmModalVisible(true);
  }

  async function handleConfirmStockOut() {
    if (!selectedLink) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('register_stock_movement', {
        p_link_id: selectedLink.id,
        p_type: 'OUT',
        p_quantity: quantity,
        p_user_id: null,
      });

      if (error) throw error;

      const currentStock = getStockQuantity(selectedLink);
      const newStock = Math.max(0, currentStock - quantity);

      Alert.alert(
        '✅ Registrado!',
        `Saíram ${quantity} rolo${quantity > 1 ? 's' : ''}.\nEstoque atual: ${newStock} rolo${newStock !== 1 ? 's' : ''}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Erro ao registrar saída:', err);
      Alert.alert('Erro', 'Não foi possível registrar a saída');
    } finally {
      setProcessing(false);
      setConfirmModalVisible(false);
    }
  }

  function handleBack() {
    if (currentStep === 'color') {
      setCurrentStep('tissue');
      setSelectedTissue(null);
      setLinks([]);
    } else if (currentStep === 'quantity') {
      setCurrentStep('color');
      setSelectedLink(null);
    }
  }

  // Filter tissues by search
  const filteredTissues = tissues.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render step indicator
  function renderStepIndicator() {
    const steps = [
      { key: 'tissue', label: 'Tecido', number: 1 },
      { key: 'color', label: 'Cor', number: 2 },
      { key: 'quantity', label: 'Quantidade', number: 3 },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                index <= currentIndex && styles.stepCircleActive
              ]}>
                {index < currentIndex ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    index <= currentIndex && styles.stepNumberActive
                  ]}>
                    {step.number}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                index <= currentIndex && styles.stepLabelActive
              ]}>
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentIndex && styles.stepLineActive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }

  // Step 1: Select Tissue
  function renderTissueStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Qual tecido acabou?</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tecido..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTissues}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.tissueCard}
                onPress={() => handleSelectTissue(item)}
                activeOpacity={0.7}
              >
                <View style={styles.tissueInfo}>
                  <Text style={styles.tissueName}>{item.name}</Text>
                  <Text style={styles.tissueSku}>{item.sku}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>Nenhum tecido encontrado</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // Step 2: Select Color
  function renderColorStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Qual cor de {selectedTissue?.name}?</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={links}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.colorGrid}
            renderItem={({ item }) => {
              const stock = getStockQuantity(item);
              const stockColor = stock === 0 ? '#dc2626' : stock <= 5 ? '#f59e0b' : '#10b981';
              
              return (
                <TouchableOpacity
                  style={styles.colorCard}
                  onPress={() => handleSelectLink(item)}
                  activeOpacity={0.7}
                >
                  {/* Image */}
                  <View style={styles.colorImageContainer}>
                    {resolveLinkImage(item.image_path) ? (
                      <Image
                        source={{ uri: resolveLinkImage(item.image_path) as string }}
                        style={styles.colorImage}
                        resizeMode="cover"
                      />
                    ) : item.colors?.hex ? (
                      <View style={[styles.colorPreview, { backgroundColor: item.colors.hex }]} />
                    ) : (
                      <View style={styles.colorPlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  
                  {/* Info */}
                  <View style={styles.colorInfo}>
                    <Text style={styles.colorName} numberOfLines={1}>
                      {item.colors?.name || 'Sem nome'}
                    </Text>
                    <Text style={styles.colorSku}>{item.sku_filho}</Text>
                  </View>
                  
                  {/* Stock Badge */}
                  <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
                    <Text style={styles.stockBadgeText}>{stock}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="color-palette-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>Nenhuma cor vinculada</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // Step 3: Enter Quantity
  function renderQuantityStep() {
    const currentStock = selectedLink ? getStockQuantity(selectedLink) : 0;
    const stockColor = currentStock === 0 ? '#dc2626' : currentStock <= 5 ? '#f59e0b' : '#10b981';

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Quantas peças usou?</Text>
        
        {/* Selected item info */}
        <View style={styles.selectedItemCard}>
          <View style={styles.selectedImageContainer}>
            {resolveLinkImage(selectedLink?.image_path) ? (
              <Image
                source={{ uri: resolveLinkImage(selectedLink?.image_path) as string }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            ) : selectedLink?.colors?.hex ? (
              <View style={[styles.selectedColorPreview, { backgroundColor: selectedLink.colors.hex }]} />
            ) : (
              <View style={styles.selectedPlaceholder}>
                <Ionicons name="image-outline" size={24} color="#9ca3af" />
              </View>
            )}
          </View>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTissue}>{selectedTissue?.name}</Text>
            <Text style={styles.selectedColor}>{selectedLink?.colors?.name}</Text>
            <Text style={styles.selectedSku}>{selectedLink?.sku_filho}</Text>
          </View>
        </View>

        {/* Current stock */}
        <View style={styles.currentStockContainer}>
          <Text style={styles.currentStockLabel}>Estoque atual:</Text>
          <Text style={[styles.currentStockValue, { color: stockColor }]}>
            {currentStock} rolo{currentStock !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Quantity selector */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={32} color={quantity <= 1 ? '#d1d5db' : '#fff'} />
          </TouchableOpacity>
          
          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Text style={styles.qtyLabel}>rolo{quantity > 1 ? 's' : ''}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.qtyButton, quantity >= currentStock && styles.qtyButtonDisabled]}
            onPress={() => setQuantity(Math.min(currentStock, quantity + 1))}
            disabled={quantity >= currentStock}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color={quantity >= currentStock ? '#d1d5db' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* Quick select buttons */}
        <View style={styles.quickSelectRow}>
          {[1, 2, 3, 5, 10].filter(n => n <= currentStock).map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.quickSelectBtn,
                quantity === num && styles.quickSelectBtnActive
              ]}
              onPress={() => setQuantity(num)}
            >
              <Text style={[
                styles.quickSelectText,
                quantity === num && styles.quickSelectTextActive
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueToConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // Confirmation Modal
  function renderConfirmModal() {
    const currentStock = selectedLink ? getStockQuantity(selectedLink) : 0;
    const newStock = Math.max(0, currentStock - quantity);

    return (
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar saída?</Text>
            
            {/* Item info with image */}
            <View style={styles.modalItemInfo}>
              <View style={styles.modalImageContainer}>
                {resolveLinkImage(selectedLink?.image_path) ? (
                  <Image
                    source={{ uri: resolveLinkImage(selectedLink?.image_path) as string }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : selectedLink?.colors?.hex ? (
                  <View style={[styles.modalColorPreview, { backgroundColor: selectedLink.colors.hex }]} />
                ) : (
                  <View style={styles.modalPlaceholder}>
                    <Ionicons name="image-outline" size={24} color="#9ca3af" />
                  </View>
                )}
              </View>
              <View style={styles.modalItemText}>
                <Text style={styles.modalItemTissue}>{selectedTissue?.name}</Text>
                <Text style={styles.modalItemColor}>{selectedLink?.colors?.name}</Text>
              </View>
            </View>

            {/* Stock changes */}
            <View style={styles.stockChangesContainer}>
              <View style={styles.stockChangeRow}>
                <Text style={styles.stockChangeLabel}>Estoque antes:</Text>
                <Text style={styles.stockChangeValue}>{currentStock} rolos</Text>
              </View>
              <View style={styles.stockChangeRow}>
                <Text style={styles.stockChangeLabel}>Saída:</Text>
                <Text style={[styles.stockChangeValue, { color: '#dc2626' }]}>-{quantity} rolos</Text>
              </View>
              <View style={[styles.stockChangeRow, styles.stockChangeRowHighlight]}>
                <Text style={styles.stockChangeLabelBold}>Estoque depois:</Text>
                <Text style={[styles.stockChangeValueBold, { color: newStock === 0 ? '#dc2626' : '#10b981' }]}>
                  {newStock} rolos
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={processing}
              >
                <Text style={styles.modalCancelText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmStockOut}
                disabled={processing}
                activeOpacity={0.8}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.modalConfirmText}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={currentStep === 'tissue' ? () => navigation.goBack() : handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Saída</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Current Step Content */}
      {currentStep === 'tissue' && renderTissueStep()}
      {currentStep === 'color' && renderColorStep()}
      {currentStep === 'quantity' && renderQuantityStep()}

      {/* Confirmation Modal */}
      {renderConfirmModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  stepLabelActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary,
  },

  // Step Content
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // List
  listContent: {
    paddingBottom: 20,
  },
  
  // Tissue Card
  tissueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tissueInfo: {
    flex: 1,
  },
  tissueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tissueSku: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  
  // Color Card (Grid)
  colorGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  colorImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
  },
  colorImage: {
    width: '100%',
    height: '100%',
  },
  colorPreview: {
    width: '100%',
    height: '100%',
  },
  colorPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorInfo: {
    padding: 10,
  },
  colorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  colorSku: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  
  // Quantity Step
  selectedItemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  selectedImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  selectedColorPreview: {
    width: '100%',
    height: '100%',
  },
  selectedPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  selectedTissue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectedColor: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedSku: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  
  // Current Stock
  currentStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  currentStockLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
  },
  currentStockValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Quantity Selector
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  qtyButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  qtyDisplay: {
    alignItems: 'center',
    marginHorizontal: 32,
  },
  qtyValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#111827',
  },
  qtyLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Quick Select
  quickSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  quickSelectBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickSelectBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#eff6ff',
  },
  quickSelectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  quickSelectTextActive: {
    color: theme.colors.primary,
  },
  
  // Continue Button
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalColorPreview: {
    width: '100%',
    height: '100%',
  },
  modalPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemText: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemTissue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalItemColor: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Stock Changes
  stockChangesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stockChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stockChangeRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  stockChangeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockChangeValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  stockChangeLabelBold: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  stockChangeValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Modal Buttons
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    gap: 6,
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
