import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton - Animated loading placeholder
 * Shows a pulsing gray rectangle while content is loading
 */
export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = theme.radius.sm,
  style 
}: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonCard - Card-shaped skeleton for list items
 */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={14} />
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
    </View>
  );
}

/**
 * SkeletonList - Multiple skeleton cards for loading lists
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    padding: theme.spacing.md,
  },
});

export default Skeleton;
