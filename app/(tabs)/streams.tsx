import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileAvatar from '@/components/ProfileAvatar';
import { sendStreamQuestion, getUpcomingStreams, getRecordedStreams, Stream } from '@/lib/streams';

const { width } = Dimensions.get('window');

// Расписание эфиров: ПН, СР, ПТ в 19:30
const BROADCAST_DAYS = [1, 3, 5]; // 1 = ПН, 3 = СР, 5 = ПТ
const BROADCAST_HOUR = 19;
const BROADCAST_MINUTE = 30;

// Демо-данные (используются если таблица streams пустая)
const DEMO_BROADCASTS = [
  {
    id: 'demo-1',
    title: 'Эндокринолог: Щитовидная железа',
    doctor_name: 'Др. Алия Касымова',
    doctor_specialty: 'Эндокринолог',
    description: 'Разберём симптомы гипо- и гипертиреоза, какие анализы сдавать, как читать результаты и когда нужно лечение.',
    scheduled_date: '',
    scheduled_time: '19:30',
    is_live: false,
    is_completed: false,
    recording_url: null,
    duration_minutes: null,
    views_count: 0,
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    dayOfWeek: 1, // ПН
    doctorPhoto: '👩‍⚕️',
  },
  {
    id: 'demo-2',
    title: 'Гастроэнтеролог: Здоровье ЖКТ',
    doctor_name: 'Др. Марат Ибрагимов',
    doctor_specialty: 'Гастроэнтеролог',
    description: 'Поговорим о проблемах с пищеварением: вздутие, изжога, запоры. Когда идти к врачу и какие анализы сдать.',
    scheduled_date: '',
    scheduled_time: '19:30',
    is_live: false,
    is_completed: false,
    recording_url: null,
    duration_minutes: null,
    views_count: 0,
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    dayOfWeek: 3, // СР
    doctorPhoto: '👨‍⚕️',
  },
  {
    id: 'demo-3',
    title: 'Нутрициолог: Разбор тарелок',
    doctor_name: 'Анна Петрова',
    doctor_specialty: 'Нутрициолог',
    description: 'Разбор ваших тарелок из чата. Учимся составлять сбалансированный рацион, считать БЖУ и выбирать продукты.',
    scheduled_date: '',
    scheduled_time: '19:30',
    is_live: false,
    is_completed: false,
    recording_url: null,
    duration_minutes: null,
    views_count: 0,
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    dayOfWeek: 5, // ПТ
    doctorPhoto: '👩‍🍳',
  },
];

type BroadcastItem = typeof DEMO_BROADCASTS[0];

const RECORDINGS = [
  {
    id: 1,
    title: 'Эндокринолог: Инсулинорезистентность',
    doctor: 'Др. Алия Касымова',
    doctorPhoto: '👩‍⚕️',
    date: '13 декабря',
    duration: '58 мин',
    views: 234,
    description: 'Разобрали что такое инсулинорезистентность, почему она возникает и как с ней бороться. Обсудили анализы HOMA-IR, инсулин натощак.',
    videoUrl: 'https://example.com/video1',
    files: [
      { name: 'Презентация.pdf', url: 'https://example.com/file1.pdf' },
      { name: 'Чек-лист анализов.pdf', url: 'https://example.com/file2.pdf' },
    ],
  },
  {
    id: 2,
    title: 'Дерматолог: Здоровье кожи',
    doctor: 'Др. Елена Ким',
    doctorPhoto: '👩‍⚕️',
    date: '11 декабря',
    duration: '45 мин',
    views: 189,
    description: 'Обсудили акне, розацеа и экзему. Какие витамины нужны для кожи, связь кишечника и кожи.',
    videoUrl: 'https://example.com/video2',
    files: [],
  },
  {
    id: 3,
    title: 'Педиатр: Иммунитет детей',
    doctor: 'Др. Сауле Аманова',
    doctorPhoto: '👩‍⚕️',
    date: '9 декабря',
    duration: '52 мин',
    views: 312,
    description: 'Как укрепить иммунитет ребёнка, когда давать витамины, нужны ли иммуномодуляторы.',
    videoUrl: 'https://example.com/video3',
    files: [
      { name: 'Схема витаминов.pdf', url: 'https://example.com/file3.pdf' },
    ],
  },
];

// Генерируем календарь текущей недели
function generateCalendar() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days = [];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      day: dayNames[i],
      date: date.getDate(),
      fullDate: date,
      hasBroadcast: BROADCAST_DAYS.includes(i + 1),
    });
  }

  return days;
}

// Получить ближайший эфир
function getNextBroadcast(broadcasts: BroadcastItem[] = DEMO_BROADCASTS): { broadcast: BroadcastItem; date: Date } {
  const now = new Date();
  
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + daysAhead);
    const dayOfWeek = checkDate.getDay();
    const mondayBased = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    if (BROADCAST_DAYS.includes(mondayBased)) {
      const broadcastTime = new Date(checkDate);
      broadcastTime.setHours(BROADCAST_HOUR, BROADCAST_MINUTE, 0, 0);
      
      if (broadcastTime > now) {
        const broadcast = broadcasts.find(b => b.dayOfWeek === mondayBased) || broadcasts[0];
        return { broadcast, date: broadcastTime };
      }
    }
  }
  
  // Fallback: следующий ПН
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  nextMonday.setHours(BROADCAST_HOUR, BROADCAST_MINUTE, 0, 0);
  return { broadcast: broadcasts[0], date: nextMonday };
}

// Форматирование даты для эфира
function formatBroadcastDate(date: Date): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${BROADCAST_HOUR}:${String(BROADCAST_MINUTE).padStart(2, '0')}`;
}

export default function StreamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recordings'>('upcoming');
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [calendar, setCalendar] = useState(generateCalendar());
  
  // Эфиры из БД
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(DEMO_BROADCASTS);
  const [loadingStreams, setLoadingStreams] = useState(true);
  
  // Ближайший эфир и таймер
  const [nextBroadcast, setNextBroadcast] = useState(getNextBroadcast(DEMO_BROADCASTS));
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  
  // Напоминания
  const [reminders, setReminders] = useState<string[]>([]);
  
  // Модалки
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastItem | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<typeof RECORDINGS[0] | null>(null);
  
  const [question, setQuestion] = useState('');
  const [questionSent, setQuestionSent] = useState(false);
  
  // Загрузка эфиров из БД
  useEffect(() => {
    loadStreams();
  }, []);
  
  const loadStreams = async () => {
    setLoadingStreams(true);
    try {
      const [upcoming, recorded] = await Promise.all([
        getUpcomingStreams(),
        getRecordedStreams(),
      ]);
      
      if (upcoming.length > 0) {
        // Преобразуем в формат BroadcastItem
        const converted: BroadcastItem[] = upcoming.map((s, i) => ({
          id: s.id,
          title: s.title,
          doctor_name: s.doctor_name || 'Врач',
          doctor_specialty: s.doctor_specialty || '',
          description: s.description || '',
          scheduled_date: s.scheduled_date,
          scheduled_time: s.scheduled_time,
          is_live: s.is_live,
          is_completed: s.is_completed,
          recording_url: s.recording_url,
          duration_minutes: s.duration_minutes,
          views_count: s.views_count,
          thumbnail_url: s.thumbnail_url,
          created_at: s.created_at,
          dayOfWeek: new Date(s.scheduled_date).getDay() || 1,
          doctorPhoto: '👨‍⚕️',
        }));
        setBroadcasts(converted);
        setNextBroadcast(getNextBroadcast(converted));
      }
    } catch (error) {
      console.error('Error loading streams:', error);
    } finally {
      setLoadingStreams(false);
    }
  };

  // Загружаем напоминания из AsyncStorage
  useEffect(() => {
    loadReminders();
  }, []);

  // Таймер обратного отсчёта
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = nextBroadcast.date.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        // Пересчитываем следующий эфир
        setNextBroadcast(getNextBroadcast());
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, mins, secs });
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [nextBroadcast]);

  const loadReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem('stream_reminders');
      if (saved) {
        setReminders(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const toggleReminder = async (broadcastId: string) => {
    try {
      let newReminders: string[];
      if (reminders.includes(broadcastId)) {
        newReminders = reminders.filter(id => id !== broadcastId);
      } else {
        newReminders = [...reminders, broadcastId];
      }
      setReminders(newReminders);
      await AsyncStorage.setItem('stream_reminders', JSON.stringify(newReminders));
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  };

  const handleSendQuestion = async () => {
    if (question.trim()) {
      // Передаём ID эфира (если это реальный UUID, иначе null)
      const streamId = nextBroadcast?.broadcast?.id;
      const isRealUuid = streamId && !streamId.startsWith('demo-');
      
      const result = await sendStreamQuestion(
        isRealUuid ? streamId : null, 
        question.trim()
      );
      
      if (!result.success) {
        console.error('Failed to send question:', result.error);
        alert('Ошибка: ' + result.error);
        return;
      }

      setQuestionSent(true);
      setTimeout(() => {
        setShowQuestionModal(false);
        setQuestion('');
        setQuestionSent(false);
      }, 2000);
    }
  };

  const openBroadcastModal = (broadcast: BroadcastItem) => {
    setSelectedBroadcast(broadcast);
    setShowBroadcastModal(true);
  };

  const openRecordingModal = (recording: typeof RECORDINGS[0]) => {
    setSelectedRecording(recording);
    setShowRecordingModal(true);
  };

  const getBroadcastDate = (dayOfWeek: number): string => {
    const today = new Date();
    const todayDay = today.getDay();
    const mondayBased = todayDay === 0 ? 7 : todayDay;
    
    let daysUntil = dayOfWeek - mondayBased;
    if (daysUntil <= 0) daysUntil += 7;
    
    const broadcastDate = new Date(today);
    broadcastDate.setDate(today.getDate() + daysUntil);
    
    return formatBroadcastDate(broadcastDate);
  };

  const isReminderSet = reminders.includes(nextBroadcast.broadcast.id);

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
            <Text style={styles.headerTitle}>Эфиры</Text>
            <Text style={styles.headerSubtitle}>Прямые эфиры с врачами</Text>
          </View>
          <ProfileAvatar size={40} />
        </View>

        {/* Мини-календарь */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonth}>
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navIcon}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navIcon}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.calendarDays}>
            {calendar.map((d) => (
              <TouchableOpacity
                key={d.date}
                style={[
                  styles.calendarDay,
                  selectedDate === d.date && styles.calendarDaySelected,
                ]}
                onPress={() => setSelectedDate(d.date)}
              >
                <Text style={[
                  styles.dayName,
                  selectedDate === d.date && styles.dayNameSelected,
                ]}>
                  {d.day}
                </Text>
                <Text style={[
                  styles.dayDate,
                  selectedDate === d.date && styles.dayDateSelected,
                ]}>
                  {d.date}
                </Text>
                {d.hasBroadcast && (
                  <View style={[
                    styles.broadcastDot,
                    selectedDate === d.date && styles.broadcastDotSelected,
                  ]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ближайший эфир */}
        <View style={styles.nextBroadcastWrapper}>
          <LinearGradient
            colors={['#8b5cf6', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextBroadcast}
          >
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>БЛИЖАЙШИЙ</Text>
            </View>
            <Text style={styles.nextTitle}>{nextBroadcast.broadcast.title}</Text>
            <Text style={styles.nextDoctor}>{nextBroadcast.broadcast.doctor_name}</Text>
            <Text style={styles.nextDescription}>
              {nextBroadcast.broadcast.description}
            </Text>

            {/* Countdown - всегда дни:часы:минуты */}
            <View style={styles.countdown}>
              <Text style={styles.countdownLabel}>До начала эфира</Text>
              <View style={styles.countdownTimer}>
                <View style={styles.countdownItem}>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>{timeLeft.days}</Text>
                  </View>
                  <Text style={styles.countdownUnit}>дней</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownItem}>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>
                      {String(timeLeft.hours).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.countdownUnit}>часов</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownItem}>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>
                      {String(timeLeft.mins).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.countdownUnit}>минут</Text>
                </View>
              </View>
            </View>

            <View style={styles.nextFooter}>
              <View style={styles.nextDate}>
                <Text style={styles.nextDateIcon}>📅</Text>
                <Text style={styles.nextDateText}>{formatBroadcastDate(nextBroadcast.date)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.reminderButton, isReminderSet && styles.reminderButtonActive]}
                onPress={() => toggleReminder(nextBroadcast.broadcast.id)}
              >
                <Text style={styles.reminderIcon}>{isReminderSet ? '🔔' : '🔕'}</Text>
                <Text style={[styles.reminderText, isReminderSet && styles.reminderTextActive]}>
                  {isReminderSet ? 'Напомню' : 'Напомнить'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Кнопка задать вопрос - яркая и заметная */}
        <TouchableOpacity
          style={styles.questionButtonWrapper}
          onPress={() => setShowQuestionModal(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#f59e0b', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.questionButton}
          >
            <View style={styles.questionIcon}>
              <Text style={styles.questionEmoji}>✋</Text>
            </View>
            <View style={styles.questionContent}>
              <Text style={styles.questionTitle}>Задать вопрос врачу</Text>
              <Text style={styles.questionSubtitle}>Разберём на ближайшем эфире</Text>
            </View>
            <View style={styles.questionArrow}>
              <Text style={styles.questionArrowText}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Табы */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Расписание
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recordings' && styles.tabActive]}
            onPress={() => setActiveTab('recordings')}
          >
            <Text style={[styles.tabText, activeTab === 'recordings' && styles.tabTextActive]}>
              Записи
            </Text>
          </TouchableOpacity>
        </View>

        {/* Список */}
        {activeTab === 'upcoming' ? (
          <View style={styles.list}>
            {broadcasts.map((broadcast) => (
              <TouchableOpacity
                key={broadcast.id}
                style={[styles.listItem, broadcast.id === nextBroadcast.broadcast.id && styles.listItemHighlight]}
                onPress={() => openBroadcastModal(broadcast)}
              >
                <View style={styles.listItemIcon}>
                  <Text style={styles.listItemEmoji}>{broadcast.doctorPhoto}</Text>
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{broadcast.title}</Text>
                  <Text style={styles.listItemDoctor}>{broadcast.doctor_name}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemMetaText}>📅 {getBroadcastDate(broadcast.dayOfWeek)}</Text>
                  </View>
                </View>
                {reminders.includes(broadcast.id) && (
                  <View style={styles.reminderBadge}>
                    <Text style={styles.reminderBadgeText}>🔔</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {RECORDINGS.map((rec) => (
              <TouchableOpacity 
                key={rec.id} 
                style={styles.listItem}
                onPress={() => openRecordingModal(rec)}
              >
                <View style={styles.recordingThumb}>
                  <Text style={styles.playIcon}>▶️</Text>
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{rec.title}</Text>
                  <Text style={styles.listItemDoctor}>{rec.doctor}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemMetaText}>⏱ {rec.duration}</Text>
                    <Text style={styles.listItemMetaText}>👁 {rec.views}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.showAllButton}>
              <Text style={styles.showAllText}>Показать все записи →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Модалка вопроса */}
      <Modal
        visible={showQuestionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowQuestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            {!questionSent ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Задать вопрос</Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setShowQuestionModal(false)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInfo}>
                <Text style={styles.modalInfoTitle}>
                  <Text style={styles.modalInfoLabel}>К эфиру: </Text>
                  {nextBroadcast.broadcast.title}
                </Text>
                <Text style={styles.modalInfoSub}>
                  {nextBroadcast.broadcast.doctor_name} · {formatBroadcastDate(nextBroadcast.date)}
                </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Опишите вашу ситуацию или задайте вопрос врачу..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={5}
                  value={question}
                  onChangeText={setQuestion}
                  textAlignVertical="top"
                />

                <Text style={styles.modalHint}>
                  💡 Укажите возраст, симптомы и результаты анализов если есть
                </Text>

                <TouchableOpacity style={styles.modalButton} onPress={handleSendQuestion}>
                  <LinearGradient
                    colors={['#8b5cf6', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Отправить вопрос</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.modalSuccess}>
                <View style={styles.successIcon}>
                  <Text style={styles.successEmoji}>✅</Text>
                </View>
                <Text style={styles.successTitle}>Вопрос отправлен!</Text>
                <Text style={styles.successText}>Врач разберёт его на эфире</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка эфира */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Детали эфира</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowBroadcastModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBroadcast && (
              <>
                <View style={styles.doctorCard}>
                  <View style={styles.doctorPhoto}>
                    <Text style={styles.doctorPhotoEmoji}>{selectedBroadcast.doctorPhoto}</Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{selectedBroadcast.doctor_name}</Text>
                    <Text style={styles.broadcastTitle}>{selectedBroadcast.title}</Text>
                  </View>
                </View>

                <Text style={styles.broadcastDescription}>{selectedBroadcast.description}</Text>

                <View style={styles.broadcastDateTime}>
                  <Text style={styles.broadcastDateTimeIcon}>📅</Text>
                  <Text style={styles.broadcastDateTimeText}>
                    {getBroadcastDate(selectedBroadcast.dayOfWeek)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.reminderButtonLarge,
                    reminders.includes(selectedBroadcast.id) && styles.reminderButtonLargeActive,
                  ]}
                  onPress={() => toggleReminder(selectedBroadcast.id)}
                >
                  <Text style={styles.reminderButtonLargeIcon}>
                    {reminders.includes(selectedBroadcast.id) ? '🔔' : '🔕'}
                  </Text>
                  <Text style={[
                    styles.reminderButtonLargeText,
                    reminders.includes(selectedBroadcast.id) && styles.reminderButtonLargeTextActive,
                  ]}>
                    {reminders.includes(selectedBroadcast.id) ? 'Напоминание установлено' : 'Напомнить о начале'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка записи */}
      <Modal
        visible={showRecordingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRecordingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Запись эфира</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowRecordingModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRecording && (
              <>
                {/* Видео плеер */}
                <TouchableOpacity style={styles.videoPlayer}>
                  <View style={styles.videoPlayButton}>
                    <Text style={styles.videoPlayIcon}>▶️</Text>
                  </View>
                  <Text style={styles.videoDuration}>{selectedRecording.duration}</Text>
                </TouchableOpacity>

                <Text style={styles.recordingTitle}>{selectedRecording.title}</Text>
                <Text style={styles.recordingDoctor}>{selectedRecording.doctor} · {selectedRecording.date}</Text>
                
                <Text style={styles.recordingDescription}>{selectedRecording.description}</Text>

                {selectedRecording.files.length > 0 && (
                  <View style={styles.filesSection}>
                    <Text style={styles.filesSectionTitle}>📎 Прикреплённые файлы</Text>
                    {selectedRecording.files.map((file, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.fileItem}
                        onPress={() => Linking.openURL(file.url)}
                      >
                        <View style={styles.fileIcon}>
                          <Text style={styles.fileIconText}>📄</Text>
                        </View>
                        <Text style={styles.fileName}>{file.name}</Text>
                        <Text style={styles.fileDownload}>↓</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.recordingStats}>
                  <Text style={styles.recordingStatsText}>👁 {selectedRecording.views} просмотров</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ff',
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
  calendarCard: {
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  navButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 14,
    color: '#4b5563',
  },
  calendarDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  calendarDay: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  calendarDaySelected: {
    backgroundColor: '#8b5cf6',
  },
  dayName: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dayNameSelected: {
    color: '#c4b5fd',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  dayDateSelected: {
    color: 'white',
  },
  broadcastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
    marginTop: 4,
  },
  broadcastDotSelected: {
    backgroundColor: 'white',
  },
  nextBroadcastWrapper: {
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
  nextBroadcast: {
    padding: 20,
  },
  nextBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  nextDoctor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  nextDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  countdown: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  countdownTimer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  countdownItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  countdownBox: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  countdownUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  countdownSeparator: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 18,
  },
  nextFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  nextDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  nextDateIcon: {
    fontSize: 14,
  },
  nextDateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  reminderButtonActive: {
    backgroundColor: 'white',
  },
  reminderIcon: {
    fontSize: 14,
  },
  reminderText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  reminderTextActive: {
    color: '#8b5cf6',
  },
  reminderBadge: {
    backgroundColor: '#ede9fe',
    padding: 8,
    borderRadius: 8,
  },
  reminderBadgeText: {
    fontSize: 14,
  },
  questionButtonWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  questionButton: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  questionEmoji: {
    fontSize: 28,
  },
  questionContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  questionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  questionArrow: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  questionArrowText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listItemHighlight: {
    borderColor: '#ddd6fe',
  },
  listItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemEmoji: {
    fontSize: 24,
  },
  listItemContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  listItemDoctor: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  listItemMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  listItemMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  recordingThumb: {
    width: 64,
    height: 48,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 20,
  },
  showAllButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 18,
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
  modalInfo: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoTitle: {
    fontSize: 14,
    color: '#7c3aed',
  },
  modalInfoLabel: {
    fontWeight: '500',
  },
  modalInfoSub: {
    fontSize: 12,
    color: '#a78bfa',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#374151',
    minHeight: 128,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalSuccess: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#dcfce7',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Модалка эфира
  doctorCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  doctorPhoto: {
    width: 64,
    height: 64,
    backgroundColor: '#ede9fe',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorPhotoEmoji: {
    fontSize: 32,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  broadcastTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  broadcastDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  broadcastDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  broadcastDateTimeIcon: {
    fontSize: 16,
  },
  broadcastDateTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c3aed',
  },
  reminderButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
  },
  reminderButtonLargeActive: {
    backgroundColor: '#ede9fe',
  },
  reminderButtonLargeIcon: {
    fontSize: 18,
  },
  reminderButtonLargeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  reminderButtonLargeTextActive: {
    color: '#7c3aed',
  },
  // Модалка записи
  videoPlayer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  videoPlayButton: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    fontSize: 28,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: 'white',
    fontSize: 12,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  recordingDoctor: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  recordingDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  filesSection: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  filesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    padding: 12,
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
  },
  fileIconText: {
    fontSize: 18,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  fileDownload: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  recordingStats: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordingStatsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
