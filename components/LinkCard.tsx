import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

type LinkCardProps = {
  item: any;
  onPress: () => void;
};

export default function LinkCard({ item, onPress }: LinkCardProps) {
  // Use updated_at as cache buster if available, otherwise fallback to created_at or nothing
  // This ensures that if the record is updated (including image change), the URL changes
  const cacheBuster = item.updated_at ? `?t=${new Date(item.updated_at).getTime()}` : '';
  
  const imageUrl = item.image_path 
    ? `${supabase.storage.from('tissue-images').getPublicUrl(item.image_path).data.publicUrl}${cacheBuster}`
    : null;

  return (
    <TouchableOpacity style={styles.resultItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumbnailContainer}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.thumbnail} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.colorPreview, { backgroundColor: item.colors?.hex || '#ccc' }]} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>
          {item.tissues?.name} <Text style={styles.resultColor}>• {item.colors?.name}</Text>
        </Text>
        <Text style={styles.resultSku}>{item.sku_filho}</Text>
      </View>
      <View style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  colorPreview: {
    width: '100%',
    height: '100%',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: theme.font.sizes.base,
    fontWeight: theme.font.weights.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  resultColor: {
    fontWeight: theme.font.weights.regular,
    color: theme.colors.textSecondary,
  },
  resultSku: {
    fontSize: theme.font.sizes.xs,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  arrow: {
    marginLeft: theme.spacing.sm,
  },
  arrowText: {
    fontSize: 20,
    color: theme.colors.border,
    fontWeight: '300',
  }
});
