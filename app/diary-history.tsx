import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiaryHistory, DiaryEntry } from '@/lib/diary';

const MOODS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😫', label: 'Плохо' },
  2: { emoji: '😕', label: 'Так себе' },
  3: { emoji: '😐', label: 'Норм' },
  4: { emoji: '🙂', label: 'Хорошо' },
  5: { emoji: '😊', label: 'Отлично' },
};

export default function DiaryHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getDiaryHistory(30);
      setEntries(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    });
  };

  const getWeekdayShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  };

  const getDayNumber = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>История дневника</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{entries.length}</Text>
            <Text style={styles.summaryLabel}>записей</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {entries.filter(e => e.mood && e.mood >= 4).length}
            </Text>
            <Text style={styles.summaryLabel}>хороших дней</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {Math.round(entries.reduce((acc, e) => acc + (e.water || 0), 0) / Math.max(entries.length, 1))}
            </Text>
            <Text style={styles.summaryLabel}>ст. воды/день</Text>
          </View>
        </View>

        {/* Entries List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>Пока нет записей</Text>
            <Text style={styles.emptyHint}>Заполните дневник сегодня!</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/diary')}
            >
              <Text style={styles.emptyButtonText}>Заполнить дневник</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={styles.entryCard}
                activeOpacity={0.7}
              >
                <View style={styles.entryDate}>
                  <Text style={styles.entryDayNumber}>{getDayNumber(entry.date)}</Text>
                  <Text style={styles.entryWeekday}>{getWeekdayShort(entry.date)}</Text>
                </View>
                
                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDateText}>{formatDate(entry.date)}</Text>
                    {entry.mood && MOODS[entry.mood] && (
                      <View style={styles.moodBadge}>
                        <Text style={styles.moodEmoji}>{MOODS[entry.mood].emoji}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.entryStats}>
                    <View style={styles.entryStat}>
                      <Text style={styles.entryStatIcon}>💧</Text>
                      <Text style={styles.entryStatValue}>{entry.water || 0}/8</Text>
                    </View>
                    <View style={styles.entryStat}>
                      <Text style={styles.entryStatIcon}>😴</Text>
                      <Text style={styles.entryStatValue}>{entry.sleep || '—'}</Text>
                    </View>
                    <View style={styles.entryStat}>
                      <Text style={styles.entryStatIcon}>😰</Text>
                      <Text style={styles.entryStatValue}>{entry.stress || '—'}</Text>
                    </View>
                    <View style={styles.entryStat}>
                      <Text style={styles.entryStatIcon}>🏃</Text>
                      <Text style={styles.entryStatValue}>{entry.activity || 0}м</Text>
                    </View>
                  </View>

                  {entry.note && (
                    <Text style={styles.entryNote} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backIcon: {
    fontSize: 18,
    color: '#4b5563',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  entriesList: {
    paddingHorizontal: 16,
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  entryDate: {
    width: 60,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  entryDayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  entryWeekday: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  entryContent: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  entryDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  moodBadge: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moodEmoji: {
    fontSize: 16,
  },
  entryStats: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  entryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  entryStatIcon: {
    fontSize: 14,
  },
  entryStatValue: {
    fontSize: 12,
    color: '#6b7280',
  },
  entryNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

