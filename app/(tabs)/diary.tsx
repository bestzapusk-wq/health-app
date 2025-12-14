import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTodayEntry, saveDiaryEntry, getDiaryHistory, getMonthlyStats, getWeekProgress, DiaryEntry } from '@/lib/diary';
import ProfileAvatar from '@/components/ProfileAvatar';

const { width } = Dimensions.get('window');

const MOODS = [
  { value: 1, emoji: '😔', label: 'Плохо', color: '#ef4444' },
  { value: 3, emoji: '😐', label: 'Нормально', color: '#f59e0b' },
  { value: 5, emoji: '😊', label: 'Хорошо', color: '#22c55e' },
];

const ACTIVITY_OPTIONS = [0, 15, 30, 45, 60, 90];

const STRESS_COLORS: Record<number, readonly [string, string]> = {
  1: ['#22c55e', '#16a34a'],
  2: ['#facc15', '#eab308'],
  3: ['#fb923c', '#f97316'],
  4: ['#f87171', '#ef4444'],
  5: ['#dc2626', '#b91c1c'],
};

const SLEEP_LABELS: Record<number, string> = {
  1: 'Не выспался',
  2: 'Мало сна',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично',
};

const STRESS_LABELS: Record<number, string> = {
  1: '😌 Спокоен',
  2: 'Лёгкий',
  3: 'Средний',
  4: 'Высокий',
  5: '🔥 Сильный',
};

const DEFAULT_SUPPLEMENTS = [
  { id: 1, name: 'Витамин D', taken: false },
  { id: 2, name: 'Омега-3', taken: false },
  { id: 3, name: 'Магний', taken: false },
];

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Состояния формы
  const [mood, setMood] = useState<number | null>(null);
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [activity, setActivity] = useState(0);
  const [note, setNote] = useState('');
  const [supplements, setSupplements] = useState(DEFAULT_SUPPLEMENTS);
  const [weeklyGoal, setWeeklyGoal] = useState({
    target: 10000,
    current: 0,
    unit: 'шагов',
  });
  
  // UI состояния
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  
  // История и статистика
  const [diaryHistory, setDiaryHistory] = useState<DiaryEntry[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    avgMood: 0,
    avgWater: 0,
    avgSleep: 0,
    avgStress: 0,
    avgActivity: 0,
    totalDays: 0,
  });
  
  // Прогресс недели (дни заполнения)
  const [weekProgress, setWeekProgress] = useState<boolean[]>([false, false, false, false, false, false, false]);

  // Загружаем запись за сегодня при фокусе
  useFocusEffect(
    useCallback(() => {
      loadTodayEntry();
    }, [])
  );

  const loadTodayEntry = async () => {
    setLoading(true);
    try {
      const [entry, history, stats, weekProg] = await Promise.all([
        getTodayEntry(),
        getDiaryHistory(7),
        getMonthlyStats(),
        getWeekProgress(),
      ]);
      
      setWeekProgress(weekProg);
      
      if (entry) {
        setMood(entry.mood);
        setWater(entry.water || 0);
        setSleep(entry.sleep);
        setStress(entry.stress);
        setActivity(entry.activity || 0);
        setNote(entry.note || '');
        setWeeklyGoal(prev => ({
          ...prev,
          current: entry.weekly_goal_current || 0,
          target: entry.weekly_goal_target || 10000,
        }));
        
        // Восстанавливаем БАДы
        if (entry.supplements && entry.supplements.length > 0) {
          setSupplements(DEFAULT_SUPPLEMENTS.map(s => ({
            ...s,
            taken: entry.supplements.includes(s.name),
          })));
        }
        setSaved(true);
      }
      
      setDiaryHistory(history);
      setMonthlyStats(stats);
    } catch (error) {
      console.error('Error loading entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplement = (id: number) => {
    setSupplements(supplements.map(s =>
      s.id === id ? { ...s, taken: !s.taken } : s
    ));
    setSaved(false);
  };

  const addToGoal = () => {
    setWeeklyGoal(prev => ({ ...prev, current: prev.current + 1000 }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const takenSupplements = supplements.filter(s => s.taken).map(s => s.name);
      
      const result = await saveDiaryEntry({
        mood,
        water,
        sleep,
        stress,
        activity,
        note,
        supplements: takenSupplements,
        weekly_goal_current: weeklyGoal.current,
        weekly_goal_target: weeklyGoal.target,
      });

      if (result.success) {
        setSaved(true);
        setShowSuccessNotification(true);
        
        // Обновляем историю и прогресс недели
        const [history, progress] = await Promise.all([
          getDiaryHistory(7),
          getWeekProgress(),
        ]);
        setDiaryHistory(history);
        setWeekProgress(progress);
        
        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 3000);
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось сохранить');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.min((weeklyGoal.current / weeklyGoal.target) * 100, 100);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)')}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Дневник</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                weekday: 'long',
              })}
            </Text>
          </View>
          <ProfileAvatar size={40} />
        </View>

        {/* Прогресс недели - тонкая плашка */}
        <View style={styles.weekProgressBar}>
          <View style={styles.weekProgressDays}>
            {weekProgress.map((completed, index) => (
              <View key={index} style={styles.weekDayItem}>
                <View style={[
                  styles.weekDayCircle,
                  completed && styles.weekDayCircleCompleted,
                  index === 6 && styles.weekDayCircleGift,
                ]}>
                  {index === 6 ? (
                    <Text style={styles.weekDayGift}>🎁</Text>
                  ) : completed ? (
                    <Text style={styles.weekDayCheck}>✓</Text>
                  ) : (
                    <Text style={styles.weekDayNumber}>{index + 1}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.weekProgressHint}>Заполняй 7 дней подряд и получи подарок 🎁</Text>
        </View>

        {/* Если день уже сохранён - показываем сводку */}
        {saved ? (
          <View style={styles.savedSummaryCard}>
            <View style={styles.savedSummaryHeader}>
              <Text style={styles.savedSummaryIcon}>✅</Text>
              <Text style={styles.savedSummaryTitle}>Отчёт за сегодня сохранён!</Text>
            </View>
            <View style={styles.savedSummaryStats}>
              <View style={styles.savedStatItem}>
                <Text style={styles.savedStatEmoji}>{MOODS.find(m => m.value === mood)?.emoji || '😐'}</Text>
                <Text style={styles.savedStatLabel}>Самочувствие</Text>
              </View>
              <View style={styles.savedStatItem}>
                <Text style={styles.savedStatEmoji}>💧</Text>
                <Text style={styles.savedStatValue}>{water}/8</Text>
              </View>
              <View style={styles.savedStatItem}>
                <Text style={styles.savedStatEmoji}>😴</Text>
                <Text style={styles.savedStatValue}>{sleep || '—'}</Text>
              </View>
              <View style={styles.savedStatItem}>
                <Text style={styles.savedStatEmoji}>😰</Text>
                <Text style={styles.savedStatValue}>{stress || '—'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setSaved(false)}
            >
              <Text style={styles.editButtonText}>✏️ Редактировать</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Самочувствие */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Как самочувствие?</Text>
              <View style={styles.moodContainer}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.moodButton,
                      mood === m.value && styles.moodButtonActive,
                    ]}
                    onPress={() => { setMood(m.value); setSaved(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      mood === m.value && styles.moodLabelActive,
                    ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

        {/* Вода */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>💧</Text>
              <Text style={styles.cardTitleText}>Вода</Text>
            </View>
            <Text style={styles.waterCount}>{water}/8</Text>
          </View>
          <View style={styles.waterContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TouchableOpacity
                key={i}
                style={styles.waterBar}
                onPress={() => { setWater(i); setSaved(false); }}
                activeOpacity={0.7}
              >
                {i <= water ? (
                  <LinearGradient
                    colors={['#60a5fa', '#3b82f6']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.waterBarFilled}
                  />
                ) : (
                  <View style={styles.waterBarEmpty} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.waterLabel}>стаканов воды</Text>
        </View>

        {/* Сон и Стресс */}
        <View style={styles.rowCards}>
          {/* Сон */}
          <View style={styles.halfCard}>
            <View style={styles.smallCardHeader}>
              <Text style={styles.smallCardIcon}>😴</Text>
              <Text style={styles.smallCardTitle}>Сон</Text>
            </View>
            <View style={styles.scaleContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.scaleButton,
                    sleep === i && styles.sleepButtonActive,
                  ]}
                  onPress={() => { setSleep(i); setSaved(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.scaleText,
                    sleep === i && styles.scaleTextActive,
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleLabel}>{sleep ? SLEEP_LABELS[sleep] : 'Выберите'}</Text>
          </View>

          {/* Стресс */}
          <View style={styles.halfCard}>
            <View style={styles.smallCardHeader}>
              <Text style={styles.smallCardIcon}>😰</Text>
              <Text style={styles.smallCardTitle}>Стресс</Text>
            </View>
            <View style={styles.scaleContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.scaleButton}
                  onPress={() => { setStress(i); setSaved(false); }}
                  activeOpacity={0.7}
                >
                  {stress === i ? (
                    <LinearGradient
                      colors={STRESS_COLORS[i]}
                      style={styles.stressButtonActive}
                    >
                      <Text style={styles.scaleTextActive}>{i}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.scaleButtonInner}>
                      <Text style={styles.scaleText}>{i}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleLabel}>{stress ? STRESS_LABELS[stress] : 'Выберите'}</Text>
          </View>
        </View>

        {/* Физ активность */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>🏃</Text>
              <Text style={styles.cardTitleText}>Физ. активность</Text>
            </View>
            <Text style={styles.activityCount}>{activity} мин</Text>
          </View>
          <View style={styles.activityContainer}>
            {ACTIVITY_OPTIONS.map((min) => (
              <TouchableOpacity
                key={min}
                style={styles.activityButton}
                onPress={() => { setActivity(min); setSaved(false); }}
                activeOpacity={0.7}
              >
                {activity === min ? (
                  <LinearGradient
                    colors={['#fb923c', '#f97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activityButtonActive}
                  >
                    <Text style={styles.activityTextActive}>{min} мин</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.activityButtonInner}>
                    <Text style={styles.activityText}>{min} мин</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* БАДы */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>💊</Text>
              <Text style={styles.cardTitleText}>БАДы</Text>
            </View>
            <Text style={styles.supplementCount}>
              {supplements.filter(s => s.taken).length}/{supplements.length}
            </Text>
          </View>
          <View style={styles.supplementsContainer}>
            {supplements.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.supplementItem,
                  s.taken && styles.supplementItemChecked,
                ]}
                onPress={() => toggleSupplement(s.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.supplementName,
                  s.taken && styles.supplementNameChecked,
                ]}>
                  {s.name}
                </Text>
                <View style={[
                  styles.checkbox,
                  s.taken && styles.checkboxChecked,
                ]}>
                  {s.taken && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Заметка */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitleText}>Заметка о здоровье</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Как себя чувствуете? Симптомы, изменения, наблюдения..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={(text) => { setNote(text); setSaved(false); }}
            textAlignVertical="top"
          />
        </View>

        {/* Кнопка сохранить */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          activeOpacity={0.9}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={saved ? ['#22c55e', '#16a34a'] : ['#14b8a6', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveText}>
                {saved ? 'Сохранено ✓' : 'Сохранить день'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Уведомление об успешном сохранении */}
        {showSuccessNotification && (
          <View style={styles.successNotification}>
            <Text style={styles.successNotificationEmoji}>✅</Text>
            <Text style={styles.successNotificationText}>День сохранён!</Text>
          </View>
        )}
          </>
        )}

        {/* Секция Дневник - история и динамика */}
        <View style={styles.diarySection}>
          <View style={styles.diarySectionHeader}>
            <Text style={styles.diarySectionTitle}>📔 Мой дневник</Text>
          </View>

          {/* Динамика за месяц */}
          {monthlyStats.totalDays > 0 && (
            <View style={styles.dynamicsCard}>
              <Text style={styles.dynamicsTitle}>📊 Динамика за месяц</Text>
              <View style={styles.dynamicsGrid}>
                <View style={styles.dynamicItem}>
                  <Text style={styles.dynamicEmoji}>😊</Text>
                  <Text style={styles.dynamicValue}>{monthlyStats.avgMood.toFixed(1)}</Text>
                  <Text style={styles.dynamicLabel}>настроение</Text>
                </View>
                <View style={styles.dynamicItem}>
                  <Text style={styles.dynamicEmoji}>💧</Text>
                  <Text style={styles.dynamicValue}>{monthlyStats.avgWater.toFixed(1)}</Text>
                  <Text style={styles.dynamicLabel}>ст/день</Text>
                </View>
                <View style={styles.dynamicItem}>
                  <Text style={styles.dynamicEmoji}>😴</Text>
                  <Text style={styles.dynamicValue}>{monthlyStats.avgSleep.toFixed(1)}</Text>
                  <Text style={styles.dynamicLabel}>сон</Text>
                </View>
                <View style={styles.dynamicItem}>
                  <Text style={styles.dynamicEmoji}>😰</Text>
                  <Text style={styles.dynamicValue}>{monthlyStats.avgStress.toFixed(1)}</Text>
                  <Text style={styles.dynamicLabel}>стресс</Text>
                </View>
              </View>
              <Text style={styles.dynamicsNote}>
                На основе {monthlyStats.totalDays} {monthlyStats.totalDays === 1 ? 'записи' : 'записей'}
              </Text>
            </View>
          )}

          {/* Записи */}
          {diaryHistory.length > 0 ? (
            diaryHistory.slice(0, 3).map((entry, index) => {
              const entryDate = new Date(entry.date);
              const isToday = entry.date === new Date().toISOString().split('T')[0];
              const moodEmoji = entry.mood ? ['😫', '😕', '😐', '🙂', '😊'][entry.mood - 1] : '—';
              
              return (
                <TouchableOpacity 
                  key={entry.id || index} 
                  style={[styles.historyItem, isToday && styles.historyItemToday]}
                  onPress={() => router.push('/diary-history')}
                >
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDay}>
                      {entryDate.getDate()}
                    </Text>
                    <Text style={styles.historyMonth}>
                      {entryDate.toLocaleDateString('ru-RU', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyIndicators}>
                      <Text style={styles.historyIndicator}>{moodEmoji}</Text>
                      <Text style={styles.historyIndicator}>💧{entry.water || 0}</Text>
                      <Text style={styles.historyIndicator}>😴{entry.sleep || '—'}</Text>
                      <Text style={styles.historyIndicator}>🏃{entry.activity || 0}м</Text>
                    </View>
                    {entry.note && (
                      <Text style={styles.historyNote} numberOfLines={1}>
                        {entry.note}
                      </Text>
                    )}
                  </View>
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Сегодня</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryEmoji}>📝</Text>
              <Text style={styles.emptyHistoryText}>Пока нет записей</Text>
              <Text style={styles.emptyHistoryHint}>Заполните дневник и нажмите "Сохранить"</Text>
            </View>
          )}
          
          {/* Кнопка "Все записи" внизу */}
          {diaryHistory.length > 0 && (
            <TouchableOpacity 
              style={styles.allEntriesButton}
              onPress={() => router.push('/diary-history')}
            >
              <Text style={styles.allEntriesText}>Все записи</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  // Прогресс недели
  weekProgressBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weekProgressDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  weekDayItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  weekDayCircleCompleted: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  weekDayCircleGift: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  weekDayNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  weekDayCheck: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  weekDayGift: {
    fontSize: 16,
  },
  weekProgressHint: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
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
  headerCenter: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerDate: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  savedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedBadgeText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  historyButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  historyIcon: {
    fontSize: 18,
  },
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  goalCard: {
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editIcon: {
    fontSize: 14,
  },
  goalNumbers: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  goalCurrent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  goalTarget: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  goalRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    gap: 12,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  moodButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  moodEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  moodLabelActive: {
    color: '#16a34a',
    fontWeight: '600',
  },
  waterCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  waterContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'transparent',
  },
  waterBar: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  waterBarFilled: {
    flex: 1,
    borderRadius: 8,
  },
  waterBarEmpty: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  waterLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  rowCards: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  smallCardIcon: {
    fontSize: 20,
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  scaleContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  scaleButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleButtonInner: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  sleepButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  stressButtonActive: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  scaleTextActive: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  scaleLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  activityCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
  },
  activityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  activityButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  activityButtonActive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  activityTextActive: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  supplementCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  supplementsContainer: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  supplementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  supplementItemChecked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  supplementName: {
    fontSize: 15,
    color: '#4b5563',
  },
  supplementNameChecked: {
    color: '#15803d',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
  },
  checkmark: {
    fontSize: 14,
    color: 'white',
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 96,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  saveButton: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  bottomPadding: {
    height: 32,
  },
  // Уведомление об успехе
  successNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successNotificationEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  successNotificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
  },
  // Сводка сохранённого дня
  savedSummaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  savedSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  savedSummaryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  savedSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803d',
  },
  savedSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  savedStatItem: {
    alignItems: 'center',
  },
  savedStatEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  savedStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  savedStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  editButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Секция дневника
  diarySection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
  },
  diarySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  diarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#14b8a6',
  },
  // Динамика
  dynamicsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  dynamicsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dynamicsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  dynamicItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  dynamicEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  dynamicValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  dynamicLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  dynamicsNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
  // История
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  historyItemToday: {
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
  },
  historyDate: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  historyDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  historyMonth: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'lowercase',
  },
  historyContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  historyIndicators: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  historyIndicator: {
    fontSize: 14,
    color: '#4b5563',
  },
  historyNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  todayBadge: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  emptyHistoryEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyHistoryHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  allEntriesButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  allEntriesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
});
