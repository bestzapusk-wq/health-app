import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle, ActivityIndicator } from 'react-native';

interface ImageWithFallbackProps {
  uri: string | null | undefined;
  style?: ImageStyle;
  fallbackEmoji?: string;
  fallbackStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function ImageWithFallback({
  uri,
  style,
  fallbackEmoji = '🖼️',
  fallbackStyle,
  resizeMode = 'cover',
}: ImageWithFallbackProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Если нет URI или была ошибка - показываем fallback
  if (!uri || error) {
    return (
      <View style={[styles.fallback, style, fallbackStyle]}>
        <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {loading && (
        <View style={[styles.loading, style]}>
          <ActivityIndicator size="small" color="#9ca3af" />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[style, { position: loading ? 'absolute' : 'relative', opacity: loading ? 0 : 1 }]}
        resizeMode={resizeMode}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 32,
  },
  loading: {
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

