import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getKeyIndicators,
  getImprovements,
  getFamilyMembers,
  addFamilyMember,
  getIndicatorIcon,
  getStatusType,
  getStatusText,
  HealthRecord,
  FamilyMember,
} from '@/lib/health';
import {
  getHealthIndicators,
  saveHealthIndicators,
  INDICATORS_CONFIG,
  HealthIndicators,
} from '@/lib/healthIndicators';
import { getWeekDynamics, getZozhScore } from '@/lib/diary';
import { getHealthFiles, uploadHealthFile, pickDocument, HealthFile } from '@/lib/healthFiles';
import {
  getSurveyResult,
  getActiveDeviations,
  getResolvedDeviations,
  resolveDeviation,
  getSeverityBadge,
  HealthSurveyResult,
  HealthDeviation,
} from '@/lib/healthSurvey';
import ProfileAvatar from '@/components/ProfileAvatar';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

type TabType = 'overview' | 'analyses' | 'plan';

const MONTHLY_STATS = [
  { label: 'Вода', value: '6.2', unit: 'ст/день', trend: 'up', isWarning: false },
  { label: 'Сон', value: '2.8', unit: 'из 5', trend: 'down', isWarning: true },
  { label: 'Стресс', value: '4.1', unit: 'из 5', trend: 'up', isWarning: true },
  { label: 'Активность', value: '68', unit: '%', trend: 'up', isWarning: false },
];

const QUESTIONNAIRES = [
  { id: 1, icon: '🎯', title: 'Трекер образа жизни', desc: 'Оценка питания, сна и стресса', completed: true },
  { id: 2, icon: '🦋', title: 'Симптомы щитовидной', desc: '15 вопросов · 3 мин', completed: false },
  { id: 3, icon: '🫃', title: 'Здоровье ЖКТ', desc: '20 вопросов · 5 мин', completed: false },
];

const IMPROVEMENTS = [
  { name: 'Ферритин', oldValue: '12', newValue: '45', status: '↑ Норма' },
  { name: 'Гемоглобин', oldValue: '105', newValue: '128', status: '↑ Норма' },
  { name: 'B12', oldValue: '180', newValue: '450', status: '↑ Норма' },
];

const KEY_INDICATORS = [
  { icon: '☀️', name: 'Витамин D', value: '18 нг/мл', status: 'Низкий', statusType: 'danger' },
  { icon: '🦋', name: 'ТТГ', value: '4.8 мМЕ/л', status: 'Внимание', statusType: 'warning' },
  { icon: '🧲', name: 'Железо', value: '8 мкмоль/л', status: 'Низкий', statusType: 'danger' },
  { icon: '💪', name: 'Ферритин', value: '45 нг/мл', status: 'Норма', statusType: 'success' },
  { icon: '🩸', name: 'Гемоглобин', value: '128 г/л', status: 'Норма', statusType: 'success' },
];

const PLAN_STEPS = [
  { id: 1, title: 'Пройти вводный модуль', completed: true },
  { id: 2, title: 'Заполнить дневник здоровья', completed: true },
  { id: 3, title: 'Изучить анализатор анализов', completed: true },
  { id: 4, title: 'Посетить первый эфир', completed: false, isCurrent: true },
  { id: 5, title: 'Задать вопрос в чате', completed: false },
  { id: 6, title: 'Отправить фото тарелки', completed: false },
  { id: 7, title: 'Пройти модуль Образ жизни', completed: false },
];

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Данные из БД
  const [loading, setLoading] = useState(true);
  const [keyIndicators, setKeyIndicators] = useState<HealthRecord[]>([]);
  const [improvements, setImprovements] = useState<{ name: string; oldValue: string; newValue: string; status: string }[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  
  // Модалка добавления члена семьи
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  
  // Модалка ввода анализов
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [indicators, setIndicators] = useState<Partial<HealthIndicators>>({});
  const [savingIndicators, setSavingIndicators] = useState(false);
  
  // Динамика за неделю
  const [weekDynamics, setWeekDynamics] = useState<{ date: string; score: number; dayName: string }[]>([]);
  
  // Файлы анализов
  const [healthFiles, setHealthFiles] = useState<HealthFile[]>([]);
  const [showAllFilesModal, setShowAllFilesModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Опросник здоровья
  const [surveyResult, setSurveyResult] = useState<HealthSurveyResult | null>(null);
  const [zozhScore, setZozhScore] = useState<number | null>(null);
  const [zozhDaysCount, setZozhDaysCount] = useState(0);
  const [activeDeviations, setActiveDeviations] = useState<HealthDeviation[]>([]);
  const [resolvedDeviations, setResolvedDeviations] = useState<HealthDeviation[]>([]);
  const [showDeviationsModal, setShowDeviationsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<HealthDeviation | null>(null);
  const [resolveComment, setResolveComment] = useState('');
  const [resolvingDeviation, setResolvingDeviation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [])
  );

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const [keyInd, impr, family, healthInd, dynamics, survey, activeDev, resolvedDev, zozh] = await Promise.all([
        getKeyIndicators(),
        getImprovements(),
        getFamilyMembers(),
        getHealthIndicators(),
        getWeekDynamics(),
        getSurveyResult(),
        getActiveDeviations(),
        getResolvedDeviations(),
        getZozhScore(),
      ]);
      
      setKeyIndicators(keyInd);
      setImprovements(impr);
      setFamilyMembers(family);
      setWeekDynamics(dynamics);
      setSurveyResult(survey);
      setActiveDeviations(activeDev);
      setResolvedDeviations(resolvedDev);
      setZozhScore(zozh.score);
      setZozhDaysCount(zozh.daysCount);
      
      // Загружаем сохранённые показатели в форму
      if (healthInd) {
        setIndicators(healthInd);
      }
      
      // Health score берём из результата опросника
      if (survey) {
        setHealthScore(survey.total_score);
      } else {
        // Если опросник не пройден - показываем 0
        setHealthScore(0);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Сохранить анализы
  const handleSaveIndicators = async () => {
    setSavingIndicators(true);
    try {
      const result = await saveHealthIndicators(indicators);
      if (result.success) {
        setShowIndicatorsModal(false);
        Alert.alert('✅ Сохранено', 'Показатели обновлены');
        loadHealthData();
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось сохранить');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSavingIndicators(false);
    }
  };
  
  // WhatsApp для записи на анализы
  const handleBookAnalyses = () => {
    Linking.openURL('https://wa.me/77472370208?text=Хочу%20сдать%20у%20вас%20анализы');
  };

  const handleAddFamilyMember = async () => {
    if (!newMemberName.trim() || !newMemberRelation.trim()) {
      Alert.alert('Ошибка', 'Заполните имя и родство');
      return;
    }

    setSavingMember(true);
    try {
      const result = await addFamilyMember({
        name: newMemberName.trim(),
        relation: newMemberRelation.trim(),
      });

      if (result.success) {
        setShowAddFamilyModal(false);
        setNewMemberName('');
        setNewMemberRelation('');
        loadHealthData();
      } else {
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить');
    } finally {
      setSavingMember(false);
    }
  };

  // Обработчик отметки отклонения как устранённого
  const handleResolveDeviation = async () => {
    if (!selectedDeviation) return;
    
    setResolvingDeviation(true);
    try {
      const result = await resolveDeviation(selectedDeviation.id, resolveComment.trim() || undefined);
      if (result.success) {
        // Обновляем списки
        setActiveDeviations(prev => prev.filter(d => d.id !== selectedDeviation.id));
        setResolvedDeviations(prev => [{ ...selectedDeviation, is_resolved: true, resolved_at: new Date().toISOString(), resolved_comment: resolveComment }, ...prev]);
        setShowResolveModal(false);
        setSelectedDeviation(null);
        setResolveComment('');
      }
    } catch (error) {
      console.error('Error resolving deviation:', error);
    } finally {
      setResolvingDeviation(false);
    }
  };

  const openResolveModal = (deviation: HealthDeviation) => {
    setSelectedDeviation(deviation);
    setResolveComment('');
    setShowResolveModal(true);
  };

  // Получить цвет для оценки ЗОЖ
  const getZozhColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // зелёный
    if (score >= 50) return '#f59e0b'; // оранжевый
    return '#ef4444'; // красный
  };

  const renderHealthScore = () => (
    <View style={styles.healthCardsRow}>
      {/* Карточка Индекса здоровья */}
      <View style={styles.healthCardWrapper}>
        <LinearGradient
          colors={surveyResult ? ['#10b981', '#0d9488'] : ['#9ca3af', '#6b7280']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthCard}
        >
          <Text style={styles.healthCardLabel}>Индекс здоровья</Text>
          <View style={styles.healthCardValue}>
            {surveyResult ? (
              <>
                <Text style={styles.healthCardNumber}>{healthScore}</Text>
                <Text style={styles.healthCardMax}>/100</Text>
              </>
            ) : (
              <Text style={styles.healthCardNumber}>???</Text>
            )}
            <Text style={styles.healthCardHeart}>💚</Text>
          </View>
          
          {surveyResult ? (
            <TouchableOpacity 
              style={styles.healthCardButton}
              onPress={() => setShowDeviationsModal(true)}
            >
              <Text style={styles.healthCardButtonText}>Отклонения →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.healthCardButton}
              onPress={() => router.push('/health-survey')}
            >
              <Text style={styles.healthCardButtonText}>Пройти опросник</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Карточка Оценка ЗОЖ */}
      <View style={styles.healthCardWrapper}>
        <LinearGradient
          colors={zozhScore !== null ? ['#8b5cf6', '#6366f1'] : ['#9ca3af', '#6b7280']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthCard}
        >
          <Text style={styles.healthCardLabel}>Оценка ЗОЖ</Text>
          <View style={styles.healthCardValue}>
            {zozhScore !== null ? (
              <Text style={[
                styles.healthCardNumber,
                { color: getZozhColor(zozhScore) === '#22c55e' ? 'white' : 
                         getZozhColor(zozhScore) === '#f59e0b' ? '#fef3c7' : '#fecaca' }
              ]}>
                {zozhScore}%
              </Text>
            ) : (
              <Text style={styles.healthCardNumber}>—</Text>
            )}
            <Text style={styles.healthCardHeart}>🏃</Text>
          </View>
          
          {zozhScore !== null ? (
            <Text style={styles.healthCardSubtext}>за {zozhDaysCount} {zozhDaysCount === 1 ? 'день' : zozhDaysCount < 5 ? 'дня' : 'дней'}</Text>
          ) : (
            <TouchableOpacity 
              style={styles.healthCardButton}
              onPress={() => router.push('/(tabs)/diary')}
            >
              <Text style={styles.healthCardButtonText}>Открыть дневник</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {(['overview', 'analyses', 'plan'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'overview' ? 'Обзор' : tab === 'analyses' ? 'Анализы' : 'План'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => (
    <>
      {/* Статистика за месяц */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Статистика за месяц</Text>
        <View style={styles.statsGrid}>
          {MONTHLY_STATS.map((stat, index) => (
            <View
              key={index}
              style={[styles.statBox, stat.isWarning && styles.statBoxWarning]}
            >
              <View style={styles.statHeader}>
                <Text style={[styles.statLabel, stat.isWarning && styles.statLabelWarning]}>
                  {stat.label}
                </Text>
                <Text style={[styles.statTrend, stat.isWarning && styles.statTrendWarning]}>
                  {stat.trend === 'up' ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, stat.isWarning && styles.statValueWarning]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statUnit, stat.isWarning && styles.statUnitWarning]}>
                  {stat.unit}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* График самочувствия по дням */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Динамика за неделю</Text>
        <Text style={styles.chartHint}>Оценка дня (0-10 баллов)</Text>
        <View style={styles.weeklyChart}>
          {weekDynamics.length > 0 ? weekDynamics.map((day, index) => {
            const heightPercent = (day.score / 10) * 100;
            const today = new Date().toISOString().split('T')[0];
            const isToday = day.date === today;
            return (
              <View key={day.date} style={styles.chartBarContainer}>
                <Text style={styles.chartScoreLabel}>{day.score > 0 ? day.score : ''}</Text>
                <View style={styles.chartBarWrapper}>
                  <View 
                    style={[
                      styles.chartBar, 
                      { height: `${heightPercent}%` },
                      day.score >= 7 && styles.chartBarGood,
                      day.score >= 4 && day.score < 7 && styles.chartBarMedium,
                      day.score < 4 && day.score > 0 && styles.chartBarLow,
                      day.score === 0 && styles.chartBarEmpty,
                    ]} 
                  />
                </View>
                <Text style={[styles.chartDayLabel, isToday && styles.chartDayLabelToday]}>{day.dayName}</Text>
              </View>
            );
          }) : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
            <View key={day} style={styles.chartBarContainer}>
              <View style={styles.chartBarWrapper}>
                <View style={[styles.chartBar, { height: '0%' }, styles.chartBarEmpty]} />
              </View>
              <Text style={styles.chartDayLabel}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>7-10</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>4-6</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>0-3</Text>
          </View>
        </View>
      </View>

      {/* Ключевые показатели */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔬 Ключевые показатели</Text>
          <TouchableOpacity onPress={() => setActiveTab('analyses')}>
            <Text style={styles.seeAllLink}>Все →</Text>
          </TouchableOpacity>
        </View>
        {keyIndicators.length > 0 ? (
          keyIndicators.slice(0, 5).map((indicator, index) => {
            const statusType = getStatusType(indicator.status);
            return (
              <View
                key={index}
                style={[
                  styles.indicatorItem,
                  statusType === 'danger' && styles.indicatorDanger,
                  statusType === 'warning' && styles.indicatorWarning,
                ]}
              >
                <Text style={styles.indicatorIcon}>{getIndicatorIcon(indicator.indicator_name)}</Text>
                <View style={styles.indicatorContent}>
                  <Text style={styles.indicatorName}>{indicator.indicator_name}</Text>
                  <Text style={styles.indicatorValue}>{indicator.value} {indicator.unit}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  statusType === 'danger' && styles.statusBadgeDanger,
                  statusType === 'warning' && styles.statusBadgeWarning,
                  statusType === 'success' && styles.statusBadgeSuccess,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    statusType === 'danger' && styles.statusBadgeDangerText,
                    statusType === 'warning' && styles.statusBadgeWarningText,
                    statusType === 'success' && styles.statusBadgeSuccessText,
                  ]}>
                    {getStatusText(indicator.status)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          KEY_INDICATORS.map((indicator, index) => (
            <View
              key={index}
              style={[
                styles.indicatorItem,
                indicator.statusType === 'danger' && styles.indicatorDanger,
                indicator.statusType === 'warning' && styles.indicatorWarning,
              ]}
            >
              <Text style={styles.indicatorIcon}>{indicator.icon}</Text>
              <View style={styles.indicatorContent}>
                <Text style={styles.indicatorName}>{indicator.name}</Text>
                <Text style={styles.indicatorValue}>{indicator.value}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                indicator.statusType === 'danger' && styles.statusBadgeDanger,
                indicator.statusType === 'warning' && styles.statusBadgeWarning,
                indicator.statusType === 'success' && styles.statusBadgeSuccess,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  indicator.statusType === 'danger' && styles.statusBadgeDangerText,
                  indicator.statusType === 'warning' && styles.statusBadgeWarningText,
                  indicator.statusType === 'success' && styles.statusBadgeSuccessText,
                ]}>
                  {indicator.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderAnalysesTab = () => (
    <>
      {/* Внести свои анализы */}
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => setShowIndicatorsModal(true)}
      >
        <View style={styles.uploadIcon}>
          <Text style={styles.uploadEmoji}>🔬</Text>
        </View>
        <View style={styles.uploadContent}>
          <Text style={styles.uploadTitle}>Внести свои анализы</Text>
          <Text style={styles.uploadSubtitle}>10 ключевых показателей</Text>
        </View>
        <View style={styles.uploadPlus}>
          <Text style={styles.uploadPlusText}>+</Text>
        </View>
      </TouchableOpacity>
      
      {/* Загрузить анализ */}
      <TouchableOpacity style={styles.uploadButtonSecondary}>
        <View style={styles.uploadIcon}>
          <Text style={styles.uploadEmoji}>📤</Text>
        </View>
        <View style={styles.uploadContent}>
          <Text style={styles.uploadTitle}>Загрузить файл анализа</Text>
          <Text style={styles.uploadSubtitle}>PDF, фото или скан</Text>
        </View>
        <View style={styles.uploadPlus}>
          <Text style={styles.uploadPlusText}>+</Text>
        </View>
      </TouchableOpacity>

      {/* Пройти опросник */}
      <TouchableOpacity style={styles.questionnaireButton}>
        <View style={styles.questionnaireButtonIcon}>
          <Text style={styles.uploadEmoji}>📋</Text>
        </View>
        <View style={styles.uploadContent}>
          <Text style={styles.uploadTitle}>Пройти интегральный опросник</Text>
          <Text style={styles.uploadSubtitle}>Оценка состояния здоровья</Text>
        </View>
        <View style={styles.questionnaireArrow}>
          <Text style={styles.questionnaireArrowText}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Мои файлы */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📁 Мои файлы</Text>
          <Text style={styles.cardCounter}>{healthFiles.length} файлов</Text>
        </View>
        {healthFiles.length === 0 ? (
          <View style={styles.emptyFiles}>
            <Text style={styles.emptyFilesText}>Вы ещё не загрузили файлы</Text>
            <TouchableOpacity style={styles.uploadFirstButton}>
              <Text style={styles.uploadFirstText}>Загрузить первый анализ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          healthFiles.slice(0, 3).map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <View style={styles.fileIcon}>
                <Text style={styles.fileEmoji}>📄</Text>
              </View>
              <View style={styles.fileContent}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileMeta}>{new Date(file.created_at).toLocaleDateString('ru-RU')}</Text>
              </View>
            </View>
          ))
        )}
        {healthFiles.length > 0 && (
          <TouchableOpacity style={styles.allFilesButton} onPress={() => setShowAllFilesModal(true)}>
            <Text style={styles.allFilesText}>Все файлы →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Члены семьи */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyScroll}>
        <View style={styles.familyContainer}>
          <TouchableOpacity style={styles.familyButtonActive}>
            <Text style={styles.familyButtonActiveText}>Мои</Text>
          </TouchableOpacity>
          {familyMembers.map((member) => (
            <TouchableOpacity key={member.id} style={styles.familyButton}>
              <Text style={styles.familyButtonText}>{member.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={styles.familyButtonAdd}
            onPress={() => setShowAddFamilyModal(true)}
          >
            <Text style={styles.familyButtonAddText}>+ Добавить члена семьи</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Обязательный перечень */}
      <TouchableOpacity style={styles.card}>
        <View style={styles.actionRow}>
          <View style={styles.actionIcon}>
            <Text style={styles.actionEmoji}>📋</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Обязательный перечень анализов</Text>
            <Text style={styles.actionSubtitle}>Скачать PDF с полным списком</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>↓</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Записаться через WhatsApp */}
      <TouchableOpacity style={styles.bookButton} onPress={handleBookAnalyses}>
        <LinearGradient
          colors={['#25D366', '#128C7E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bookGradient}
        >
          <View style={styles.bookIcon}>
            <Text style={styles.bookEmoji}>💬</Text>
          </View>
          <View style={styles.bookContent}>
            <Text style={styles.bookTitle}>Записаться на анализы</Text>
            <Text style={styles.bookSubtitle}>Напишите нам в WhatsApp</Text>
          </View>
          <View style={styles.bookArrow}>
            <Text style={styles.bookArrowText}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderPlanTab = () => (
    <>
      {/* Прогресс */}
      <View style={styles.progressWrapper}>
        <LinearGradient
          colors={['#8b5cf6', '#9333ea']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>7-дневный план</Text>
              <Text style={styles.progressValue}>3 из 7</Text>
            </View>
            <View style={styles.progressIcon}>
              <Text style={styles.progressEmoji}>🚀</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '43%' }]} />
          </View>
          <Text style={styles.progressNote}>Ещё 4 шага до годового плана</Text>
        </LinearGradient>
      </View>

      {/* Шаги */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ваши шаги</Text>
        {PLAN_STEPS.map((step) => (
          <View
            key={step.id}
            style={[styles.stepItem, step.completed && styles.stepItemCompleted]}
          >
            <View style={[styles.stepNumber, step.completed && styles.stepNumberCompleted]}>
              <Text style={[styles.stepNumberText, step.completed && styles.stepNumberTextCompleted]}>
                {step.completed ? '✓' : step.id}
              </Text>
            </View>
            <Text style={[styles.stepTitle, step.completed && styles.stepTitleCompleted]}>
              {step.title}
            </Text>
            {step.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Текущий</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Годовой план */}
      <View style={styles.lockedCard}>
        <View style={styles.lockedIcon}>
          <Text style={styles.lockedEmoji}>🔒</Text>
        </View>
        <View style={styles.lockedContent}>
          <Text style={styles.lockedTitle}>Годовой план</Text>
          <Text style={styles.lockedSubtitle}>Выполните 7 шагов чтобы открыть</Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)')}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Моё здоровье</Text>
            <Text style={styles.headerSubtitle}>Анализы, план и статистика</Text>
          </View>
          <ProfileAvatar size={40} />
        </View>

        {renderHealthScore()}
        {renderTabs()}

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analyses' && renderAnalysesTab()}
        {activeTab === 'plan' && renderPlanTab()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Модалка добавления члена семьи */}
      <Modal
        visible={showAddFamilyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Добавить члена семьи</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowAddFamilyModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Имя</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Например: Алия"
              placeholderTextColor="#9ca3af"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />

            <Text style={styles.inputLabel}>Родство</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Например: Дочь, Сын, Мама"
              placeholderTextColor="#9ca3af"
              value={newMemberRelation}
              onChangeText={setNewMemberRelation}
            />

            <TouchableOpacity
              style={[styles.saveButton, savingMember && styles.saveButtonDisabled]}
              onPress={handleAddFamilyMember}
              disabled={savingMember}
            >
              <LinearGradient
                colors={['#10b981', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                {savingMember ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveText}>Добавить</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Модалка ввода анализов */}
      <Modal
        visible={showIndicatorsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowIndicatorsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Внести анализы</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowIndicatorsModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.indicatorsScroll} showsVerticalScrollIndicator={false}>
              {INDICATORS_CONFIG.map((config) => (
                <View key={config.key} style={styles.indicatorInputRow}>
                  <View style={styles.indicatorInputLabel}>
                    <Text style={styles.indicatorInputName}>{config.name}</Text>
                    <Text style={styles.indicatorInputUnit}>{config.unit}</Text>
                  </View>
                  <TextInput
                    style={styles.indicatorInput}
                    placeholder="—"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={indicators[config.key]?.toString() || ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text);
                      setIndicators(prev => ({
                        ...prev,
                        [config.key]: isNaN(num) ? null : num,
                      }));
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, savingIndicators && styles.saveButtonDisabled]}
              onPress={handleSaveIndicators}
              disabled={savingIndicators}
            >
              <LinearGradient
                colors={['#10b981', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                {savingIndicators ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveText}>Сохранить анализы</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модалка отклонений */}
      <Modal
        visible={showDeviationsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeviationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deviationsModalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Мои отклонения</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowDeviationsModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeDeviations.length === 0 && resolvedDeviations.length === 0 ? (
                <View style={styles.emptyDeviations}>
                  <Text style={styles.emptyDeviationsEmoji}>🎉</Text>
                  <Text style={styles.emptyDeviationsText}>Отклонений не обнаружено!</Text>
                </View>
              ) : (
                <>
                  {/* Активные отклонения */}
                  {activeDeviations.length > 0 && (
                    <View style={styles.deviationsSection}>
                      <Text style={styles.deviationsSectionTitle}>⚠️ Требуют внимания</Text>
                      {activeDeviations.map((deviation) => {
                        const badge = getSeverityBadge(deviation.severity);
                        return (
                          <View key={deviation.id} style={styles.deviationItem}>
                            <View style={styles.deviationContent}>
                              <Text style={styles.deviationName}>{deviation.name}</Text>
                              <View style={[styles.severityBadge, { backgroundColor: badge.bgColor }]}>
                                <Text style={[styles.severityBadgeText, { color: badge.color }]}>{badge.label}</Text>
                              </View>
                            </View>
                            <TouchableOpacity 
                              style={styles.resolveButton}
                              onPress={() => openResolveModal(deviation)}
                            >
                              <Text style={styles.resolveButtonText}>❌</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Устранённые отклонения */}
                  {resolvedDeviations.length > 0 && (
                    <View style={styles.deviationsSection}>
                      <Text style={styles.deviationsSectionTitle}>✅ Устранённые</Text>
                      {resolvedDeviations.map((deviation) => (
                        <View key={deviation.id} style={[styles.deviationItem, styles.deviationItemResolved]}>
                          <View style={styles.deviationContent}>
                            <Text style={[styles.deviationName, styles.deviationNameResolved]}>{deviation.name}</Text>
                            {deviation.resolved_comment && (
                              <Text style={styles.deviationComment}>{deviation.resolved_comment}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модалка подтверждения устранения */}
      <Modal
        visible={showResolveModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resolveModalContent}>
            <Text style={styles.resolveModalTitle}>
              У вас ушло «{selectedDeviation?.name}»?
            </Text>
            
            <TextInput
              style={styles.resolveInput}
              placeholder="Расскажите подробнее (опционально)"
              placeholderTextColor="#9ca3af"
              value={resolveComment}
              onChangeText={setResolveComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.resolveButtons}>
              <TouchableOpacity 
                style={styles.resolveCancelButton}
                onPress={() => setShowResolveModal(false)}
              >
                <Text style={styles.resolveCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.resolveConfirmButton}
                onPress={handleResolveDeviation}
                disabled={resolvingDeviation}
              >
                {resolvingDeviation ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.resolveConfirmText}>Да, ушло</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf2f8',
  },
  scrollView: {
    flex: 1,
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Две карточки рядом
  healthCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  healthCardWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthCard: {
    padding: 16,
    minHeight: 140,
  },
  healthCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  healthCardValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  healthCardNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  healthCardMax: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
  },
  healthCardHeart: {
    fontSize: 24,
    marginLeft: 'auto',
  },
  healthCardSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 'auto',
  },
  healthCardButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 'auto',
  },
  healthCardButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  // Старые стили (для совместимости)
  healthScoreWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  healthScore: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthScoreContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  healthScoreLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  healthScoreValue: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'transparent',
  },
  healthScoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  healthScoreMax: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  healthScoreTrend: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  healthScoreCircle: {
    width: 96,
    height: 96,
    position: 'relative',
    display: 'none',
  },
  healthScoreHeart: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  healthScoreHeartEmoji: {
    fontSize: 70,
  },
  healthScoreHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  surveyButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  surveyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  deviationsButton: {
    marginTop: 8,
  },
  deviationsButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  // Модалка отклонений
  deviationsModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  emptyDeviations: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDeviationsEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyDeviationsText: {
    fontSize: 16,
    color: '#6b7280',
  },
  deviationsSection: {
    marginBottom: 24,
  },
  deviationsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  deviationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  deviationItemResolved: {
    backgroundColor: '#f0fdf4',
  },
  deviationContent: {
    flex: 1,
    gap: 6,
  },
  deviationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 20,
  },
  deviationNameResolved: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  deviationComment: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resolveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  resolveButtonText: {
    fontSize: 16,
  },
  // Модалка подтверждения устранения
  resolveModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    width: width - 48,
  },
  resolveModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  resolveInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
    marginBottom: 16,
  },
  resolveButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resolveCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  resolveCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  resolveConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  resolveConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  healthScoreEmoji: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'none',
  },
  healthScoreEmojiText: {
    fontSize: 32,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#1f2937',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
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
  cardSuccess: {
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  cardWarning: {
    borderWidth: 2,
    borderColor: '#fde68a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  cardCounter: {
    fontSize: 12,
    color: '#9ca3af',
  },
  seeAllLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  statBox: {
    width: (width - 80) / 2,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
  },
  statBoxWarning: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statLabelWarning: {
    color: '#dc2626',
  },
  statTrend: {
    fontSize: 12,
    color: '#22c55e',
  },
  statTrendWarning: {
    color: '#dc2626',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statValueWarning: {
    color: '#b91c1c',
  },
  statUnit: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  statUnitWarning: {
    color: '#f87171',
  },
  questionnaireItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  questionnaireItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  questionnaireIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireIconCompleted: {
    backgroundColor: '#dcfce7',
  },
  questionnaireEmoji: {
    fontSize: 20,
  },
  questionnaireContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  questionnaireTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  questionnaireTitleCompleted: {
    color: '#15803d',
  },
  questionnaireDesc: {
    fontSize: 12,
    color: '#9ca3af',
  },
  checkMark: {
    fontSize: 16,
    color: '#22c55e',
  },
  arrow: {
    fontSize: 16,
    color: '#d1d5db',
  },
  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  improvementIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  improvementEmoji: {
    fontSize: 20,
  },
  improvementTitleContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  improvementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  improvementSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  improvementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginBottom: 8,
  },
  improvementItemDanger: {
    backgroundColor: '#fef2f2',
  },
  improvementItemWarning: {
    backgroundColor: '#fffbeb',
  },
  improvementName: {
    fontSize: 14,
    color: '#374151',
  },
  improvementValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  oldValue: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  newValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
  },
  newValueDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  newValueWarning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  unitText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeDanger: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeWarning: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 12,
  },
  statusBadgeSuccessText: {
    fontSize: 12,
    color: '#15803d',
  },
  statusBadgeDangerText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  statusBadgeWarningText: {
    fontSize: 12,
    color: '#b45309',
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  indicatorDanger: {
    backgroundColor: '#fef2f2',
  },
  indicatorWarning: {
    backgroundColor: '#fffbeb',
  },
  indicatorIcon: {
    fontSize: 20,
  },
  indicatorContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  indicatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  indicatorValue: {
    fontSize: 12,
    color: '#9ca3af',
  },
  uploadButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#a7f3d0',
  },
  uploadIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmoji: {
    fontSize: 24,
  },
  uploadContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  uploadPlus: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  uploadPlusText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  // Кнопка опросника
  questionnaireButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed',
  },
  questionnaireButtonIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireArrow: {
    width: 32,
    height: 32,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireArrowText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  // График по дням
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    backgroundColor: 'transparent',
  },
  chartBarWrapper: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  chartBar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  chartBarGood: {
    backgroundColor: '#22c55e',
  },
  chartBarMedium: {
    backgroundColor: '#f59e0b',
  },
  chartBarLow: {
    backgroundColor: '#ef4444',
  },
  chartBarEmpty: {
    backgroundColor: '#e5e7eb',
    height: 4,
  },
  chartDayLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
  },
  chartDayLabelToday: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  fileIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fileEmoji: {
    fontSize: 18,
  },
  fileContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  fileMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  allFilesButton: {
    marginTop: 4,
    alignItems: 'center',
  },
  allFilesText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyFiles: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyFilesText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  uploadFirstButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadFirstText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  familyScroll: {
    marginBottom: 16,
  },
  familyContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  familyButtonActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 20,
  },
  familyButtonActiveText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  familyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  familyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  familyButtonAdd: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  familyButtonAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionBadge: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  actionBadgeText: {
    fontSize: 14,
    color: 'white',
  },
  bookButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookEmoji: {
    fontSize: 24,
  },
  bookContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  bookSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  bookArrow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 8,
  },
  bookArrowText: {
    fontSize: 14,
    color: 'white',
  },
  progressWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  progressCard: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  progressInfo: {
    backgroundColor: 'transparent',
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressEmoji: {
    fontSize: 32,
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
  progressNote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  stepItemCompleted: {
    backgroundColor: '#f0fdf4',
  },
  stepNumber: {
    width: 32,
    height: 32,
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberCompleted: {
    backgroundColor: '#22c55e',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  stepNumberTextCompleted: {
    color: 'white',
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  stepTitleCompleted: {
    color: '#15803d',
  },
  currentBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#7c3aed',
  },
  lockedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lockedIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedEmoji: {
    fontSize: 24,
  },
  lockedContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6b7280',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Дополнительные стили
  chartHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  chartScoreLabel: {
    fontSize: 11,
    color: '#6b7280',
    height: 16,
    textAlign: 'center',
  },
  uploadButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalContentLarge: {
    maxHeight: '80%',
  },
  indicatorsScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  indicatorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  indicatorInputLabel: {
    flex: 1,
  },
  indicatorInputName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  indicatorInputUnit: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  indicatorInput: {
    width: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
