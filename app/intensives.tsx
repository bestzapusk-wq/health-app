import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

// Данные интенсивов
const MY_PROGRAMS = [
  {
    id: 'active1',
    emoji: '🫁',
    title: 'Желчный пузырь',
    status: 'active',
    progress: 65,
    day: 9,
    totalDays: 14,
    colors: ['#f97316', '#f59e0b'],
  },
  {
    id: 'completed1',
    emoji: '🦋',
    title: 'Щитовидная железа',
    status: 'completed',
    progress: 100,
    completedDate: '28 ноября',
    bgColor: '#ede9fe',
    barColor: '#8b5cf6',
  },
  {
    id: 'completed2',
    emoji: '💧',
    title: 'Водный баланс: Основы',
    status: 'completed',
    progress: 100,
    completedDate: '15 октября',
    bgColor: '#dbeafe',
    barColor: '#3b82f6',
  },
];

const AVAILABLE_INTENSIVES = [
  {
    id: 'gallbladder',
    emoji: '🫁',
    badge: '🔥 НОВЫЙ',
    badgeOpen: 'ОТКРЫТ',
    title: 'Желчный пузырь: Перезагрузка',
    subtitle: 'Избавьтесь от тяжести после еды, вздутия и горечи во рту за 14 дней',
    description: 'Желчный пузырь — ключ к хорошему пищеварению. Если он работает неправильно, вы чувствуете тяжесть, вздутие, тошноту и постоянную усталость.',
    results: [
      'Уйдёт тяжесть и боль после еды',
      'Исчезнет горечь во рту по утрам',
      'Нормализуется стул',
      'Вернётся лёгкость и энергия',
    ],
    includes: [
      '14 дней плотной работы',
      '5 видео-уроков от гастроэнтеролога',
      'Протокол питания и добавок',
      'Чат с куратором и врачом',
    ],
    participants: 234,
    startDate: 'Сразу после оплаты',
    price: '29 700',
    oldPrice: '45 000',
    isOpen: true,
    colors: ['#f97316', '#f59e0b'],
  },
  {
    id: 'thyroid',
    emoji: '🦋',
    badge: '🔒 Скоро',
    title: 'Щитовидная железа: Гармония гормонов',
    subtitle: 'Верните энергию, стабильный вес и хорошее настроение',
    description: 'Щитовидная железа управляет всем: энергией, весом, настроением, кожей и волосами.',
    results: [
      'Стабильная энергия весь день',
      'Вес начнёт снижаться',
      'Улучшится настроение и сон',
      'Перестанут выпадать волосы',
    ],
    includes: [
      '21 день интенсивной работы',
      '8 видео-уроков от эндокринолога',
      'Индивидуальный протокол',
      'Закрытый чат с врачом',
    ],
    participants: 156,
    spotsLeft: 12,
    startDate: '15 января 2025',
    price: '29 700',
    oldPrice: '49 000',
    isOpen: false,
    bgColor: '#ede9fe',
  },
  {
    id: 'gut',
    emoji: '🫃',
    badge: '🔒 Скоро',
    title: 'Здоровый кишечник = Сильный иммунитет',
    subtitle: 'Победите вздутие, СИБР и наладьте пищеварение навсегда',
    description: '80% иммунитета находится в кишечнике. Вздутие, газы, нерегулярный стул — сигналы что пора действовать.',
    results: [
      'Уйдёт вздутие и газообразование',
      'Нормализуется стул',
      'Укрепится иммунитет',
      'Улучшится состояние кожи',
    ],
    includes: [
      '21 день работы с микробиомом',
      '7 видео-уроков',
      'Протокол восстановления',
      'Чат поддержки',
    ],
    participants: 89,
    startDate: 'Февраль 2025',
    price: '34 700',
    oldPrice: '55 000',
    isOpen: false,
    bgColor: '#dcfce7',
  },
  {
    id: 'antiage',
    emoji: '🧬',
    badge: '🔒 Скоро',
    title: 'Биология возраста: Anti-age протокол',
    subtitle: 'Замедлите старение и верните молодость изнутри',
    description: 'Узнайте свой биологический возраст по анализам и получите персональный план омоложения.',
    results: [
      'Узнаете свой биологический возраст',
      'Получите anti-age протокол',
      'Улучшится качество кожи',
      'Повысится уровень энергии',
    ],
    includes: [
      '14 дней интенсива',
      '6 видео-уроков',
      'Персональный anti-age протокол',
      'Разбор анализов',
    ],
    participants: 67,
    startDate: 'Март 2025',
    price: '39 700',
    oldPrice: '65 000',
    isOpen: false,
    bgColor: '#ffe4e6',
  },
];

export default function IntensivesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedIntensive, setSelectedIntensive] = useState<typeof AVAILABLE_INTENSIVES[0] | null>(null);
  const [waitlistIds, setWaitlistIds] = useState<string[]>([]);
  const [showWaitlistSuccess, setShowWaitlistSuccess] = useState(false);

  // Загрузить записи waitlist при старте
  useEffect(() => {
    loadWaitlist();
  }, []);

  const loadWaitlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('waitlist')
      .select('course_id')
      .eq('user_id', user.id);

    if (data) {
      setWaitlistIds(data.map(w => w.course_id));
    }
  };

  const openIntensiveModal = (intensive: typeof AVAILABLE_INTENSIVES[0]) => {
    setSelectedIntensive(intensive);
    setShowModal(true);
  };

  const getDiscount = (price: string, oldPrice: string) => {
    const p = parseInt(price.replace(/\s/g, ''));
    const op = parseInt(oldPrice.replace(/\s/g, ''));
    return Math.round((1 - p / op) * 100);
  };

  // Покупка через WhatsApp
  const handlePurchase = (title: string) => {
    const message = encodeURIComponent(`Хочу попасть на интенсив "${title}"`);
    Linking.openURL(`https://wa.me/77472370208?text=${message}`);
  };

  // Записаться в лист ожидания
  const handleWaitlist = async (courseId: string, courseName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Ошибка', 'Войдите в аккаунт');
      return;
    }

    // Check if already in waitlist
    if (waitlistIds.includes(courseId)) {
      return;
    }

    const { error } = await supabase
      .from('waitlist')
      .insert({
        user_id: user.id,
        course_id: courseId,
        course_name: courseName,
      });

    if (error) {
      console.error('Waitlist error:', error);
      Alert.alert('Ошибка', 'Не удалось записаться');
      return;
    }

    setWaitlistIds(prev => [...prev, courseId]);
    setShowWaitlistSuccess(true);
    setTimeout(() => setShowWaitlistSuccess(false), 3000);
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Интенсивы</Text>
            <Text style={styles.headerSubtitle}>Глубокое погружение в тему</Text>
          </View>
        </View>

        {/* Мои программы */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📚 Мои программы</Text>
          
          {MY_PROGRAMS.map((program) => (
            <TouchableOpacity 
              key={program.id} 
              style={[
                styles.programItem,
                program.status === 'active' && styles.programItemActive,
              ]}
              activeOpacity={0.8}
            >
              {program.status === 'active' ? (
                <LinearGradient
                  colors={program.colors as [string, string]}
                  style={styles.programIcon}
                >
                  <Text style={styles.programEmoji}>{program.emoji}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.programIcon, { backgroundColor: program.bgColor }]}>
                  <Text style={styles.programEmoji}>{program.emoji}</Text>
                </View>
              )}
              
              <View style={styles.programContent}>
                <View style={styles.programHeader}>
                  <Text style={styles.programTitle}>{program.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    program.status === 'active' ? styles.statusActive : styles.statusCompleted,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      program.status === 'active' ? styles.statusTextActive : styles.statusTextCompleted,
                    ]}>
                      {program.status === 'active' ? 'Активен' : 'Пройден'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${program.progress}%`,
                          backgroundColor: program.status === 'active' ? '#f97316' : program.barColor,
                        },
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{program.progress}%</Text>
                </View>
                
                <Text style={styles.programMeta}>
                  {program.status === 'active' 
                    ? `День ${program.day} из ${program.totalDays}`
                    : `Завершён ${program.completedDate}`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Разделитель */}
        <View style={styles.divider}>
          <Text style={styles.sectionTitle}>🎯 Доступные интенсивы</Text>
        </View>

        {/* Открытый интенсив */}
        {AVAILABLE_INTENSIVES.filter(i => i.isOpen).map((intensive) => (
          <TouchableOpacity
            key={intensive.id}
            style={styles.openIntensiveWrapper}
            onPress={() => openIntensiveModal(intensive)}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={intensive.colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.openIntensive}
            >
              <View style={styles.openBadges}>
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>{intensive.badge}</Text>
                </View>
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>{intensive.badgeOpen}</Text>
                </View>
              </View>
              
              <View style={styles.openContent}>
                <View style={styles.openIconBox}>
                  <Text style={styles.openEmoji}>{intensive.emoji}</Text>
                </View>
                <View style={styles.openTextContainer}>
                  <Text style={styles.openTitle}>{intensive.title}</Text>
                  <Text style={styles.openSubtitle}>{intensive.subtitle}</Text>
                </View>
              </View>
              
              <View style={styles.openFooter}>
                <Text style={styles.openParticipants}>👥 {intensive.participants} участников</Text>
                <View style={styles.openButtonSmall}>
                  <Text style={styles.openButtonText}>Подробнее →</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Закрытые интенсивы */}
        {AVAILABLE_INTENSIVES.filter(i => !i.isOpen).map((intensive) => (
          <TouchableOpacity
            key={intensive.id}
            style={styles.closedIntensive}
            onPress={() => openIntensiveModal(intensive)}
            activeOpacity={0.9}
          >
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>{intensive.badge}</Text>
            </View>
            
            <View style={styles.closedContent}>
              <View style={[styles.closedIconBox, { backgroundColor: intensive.bgColor }]}>
                <Text style={styles.closedEmoji}>{intensive.emoji}</Text>
              </View>
              <View style={styles.closedTextContainer}>
                <Text style={styles.closedTitle}>{intensive.title}</Text>
                <Text style={styles.closedSubtitle}>{intensive.subtitle}</Text>
              </View>
            </View>
            
            <View style={styles.closedFooter}>
              <Text style={styles.closedMeta}>👥 {intensive.participants} в ожидании</Text>
              <Text style={styles.closedMeta}>📅 {intensive.startDate}</Text>
            </View>
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* Модалка деталей интенсива */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedIntensive && (
                <>
                  {/* Заголовок */}
                  <View style={styles.modalHeader}>
                    {selectedIntensive.isOpen ? (
                      <LinearGradient
                        colors={selectedIntensive.colors as [string, string]}
                        style={styles.modalIconBox}
                      >
                        <Text style={styles.modalEmoji}>{selectedIntensive.emoji}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.modalIconBox, { backgroundColor: selectedIntensive.bgColor }]}>
                        <Text style={styles.modalEmoji}>{selectedIntensive.emoji}</Text>
                      </View>
                    )}
                    
                    <View style={[
                      styles.modalBadge,
                      selectedIntensive.isOpen ? styles.modalBadgeOpen : styles.modalBadgeClosed,
                    ]}>
                      <Text style={[
                        styles.modalBadgeText,
                        selectedIntensive.isOpen ? styles.modalBadgeTextOpen : styles.modalBadgeTextClosed,
                      ]}>
                        {selectedIntensive.isOpen ? '🔥 ОТКРЫТ' : '🔒 СКОРО'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.modalTitle}>{selectedIntensive.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedIntensive.subtitle}</Text>
                  <Text style={styles.modalDescription}>{selectedIntensive.description}</Text>
                  
                  {/* Видео плейсхолдер */}
                  <View style={styles.videoPlaceholder}>
                    <View style={styles.playButton}>
                      <Text style={styles.playIcon}>▶️</Text>
                    </View>
                    <Text style={styles.videoText}>Посмотрите о чём интенсив</Text>
                    <Text style={styles.videoTime}>2:45</Text>
                  </View>
                  
                  {/* Результаты */}
                  <View style={styles.resultsBox}>
                    <Text style={styles.boxTitle}>🎯 Что получите:</Text>
                    {selectedIntensive.results.map((result, index) => (
                      <View key={index} style={styles.resultItem}>
                        <Text style={styles.resultCheck}>✓</Text>
                        <Text style={styles.resultText}>{result}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Что входит */}
                  <View style={styles.includesBox}>
                    <Text style={styles.boxTitle}>📦 Что входит:</Text>
                    {selectedIntensive.includes.map((item, index) => (
                      <View key={index} style={styles.includeItem}>
                        <Text style={styles.includeDot}>•</Text>
                        <Text style={styles.includeText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Инфо */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoText}>📅 {selectedIntensive.startDate}</Text>
                    <Text style={styles.infoText}>
                      👥 {selectedIntensive.participants} {selectedIntensive.isOpen ? 'участников' : 'в ожидании'}
                    </Text>
                  </View>
                  
                  {selectedIntensive.spotsLeft && (
                    <Text style={styles.spotsLeft}>🔥 Осталось {selectedIntensive.spotsLeft} мест</Text>
                  )}
                  
                  {/* Цена */}
                  <View style={styles.priceBox}>
                    <Text style={styles.oldPrice}>{selectedIntensive.oldPrice} ₸</Text>
                    <Text style={styles.price}>{selectedIntensive.price} ₸</Text>
                    <Text style={styles.discount}>
                      Скидка {getDiscount(selectedIntensive.price, selectedIntensive.oldPrice)}%
                    </Text>
                  </View>
                  
                  {/* Кнопка */}
                  <TouchableOpacity 
                    style={[
                      styles.actionButton,
                      !selectedIntensive.isOpen && waitlistIds.includes(selectedIntensive.id) && styles.actionButtonDisabled,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (selectedIntensive.isOpen) {
                        handlePurchase(selectedIntensive.title);
                      } else if (!waitlistIds.includes(selectedIntensive.id)) {
                        handleWaitlist(selectedIntensive.id, selectedIntensive.title);
                      }
                    }}
                  >
                    {selectedIntensive.isOpen ? (
                      <LinearGradient
                        colors={['#f97316', '#f59e0b']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                      >
                        <Text style={styles.actionButtonText}>Попасть на интенсив →</Text>
                      </LinearGradient>
                    ) : waitlistIds.includes(selectedIntensive.id) ? (
                      <View style={styles.actionButtonSuccess}>
                        <Text style={styles.actionButtonTextSuccess}>Вы в списке ✓</Text>
                      </View>
                    ) : (
                      <View style={styles.actionButtonGray}>
                        <Text style={styles.actionButtonTextGray}>Записаться в лист ожидания</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  {!selectedIntensive.isOpen && !waitlistIds.includes(selectedIntensive.id) && (
                    <Text style={styles.waitlistNote}>Сообщим когда откроется запись</Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Waitlist Success Modal */}
      <Modal
        visible={showWaitlistSuccess}
        animationType="fade"
        transparent
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Отлично!</Text>
            <Text style={styles.successText}>Мы уведомим вас когда откроется запись</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  programItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  programItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programEmoji: {
    fontSize: 24,
  },
  programContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  programTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusCompleted: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextCompleted: {
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  programMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  divider: {
    marginHorizontal: 16,
    paddingTop: 8,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  openIntensiveWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  openIntensive: {
    padding: 20,
  },
  openBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  openBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  openContent: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  openIconBox: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openEmoji: {
    fontSize: 36,
  },
  openTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  openTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  openSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  openFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  openParticipants: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  openButtonSmall: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  closedIntensive: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    position: 'relative',
    overflow: 'hidden',
  },
  closedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
  },
  closedBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  closedContent: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
    paddingRight: 60,
    backgroundColor: 'transparent',
  },
  closedIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedEmoji: {
    fontSize: 28,
  },
  closedTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closedTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  closedSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  closedFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'transparent',
  },
  closedMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
  },
  modalHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  modalIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalEmoji: {
    fontSize: 44,
  },
  modalBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  modalBadgeOpen: {
    backgroundColor: '#f97316',
  },
  modalBadgeClosed: {
    backgroundColor: '#9ca3af',
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBadgeTextOpen: {
    color: 'white',
  },
  modalBadgeTextClosed: {
    color: 'white',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  videoPlaceholder: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playIcon: {
    fontSize: 28,
    marginLeft: 4,
  },
  videoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  videoTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  resultsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  resultCheck: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  includesBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  includeItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  includeDot: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: 'bold',
  },
  includeText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  spotsLeft: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
    marginBottom: 16,
  },
  priceBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  oldPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  discount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actionButtonDisabled: {},
  actionButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionButtonGray: {
    backgroundColor: '#d1d5db',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 20,
  },
  actionButtonSuccess: {
    backgroundColor: '#dcfce7',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  actionButtonTextSuccess: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  actionButtonTextGray: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  waitlistNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
});

