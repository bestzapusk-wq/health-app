import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  ActivityIndicator,
  View as RNView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHomeStats, getGreetingName } from '@/lib/profile';
import ProfileAvatar from '@/components/ProfileAvatar';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2; // 16px padding * 2 + 16px gap

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('друг');
  const [stats, setStats] = useState({
    streak: 0,
    healthScore: 0,
    planProgress: '0/7',
    points: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [name, homeStats] = await Promise.all([
        getGreetingName(),
        getHomeStats(),
      ]);
      setUserName(name);
      setStats(homeStats);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/77472370208?text=Привет!');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Привет, {userName} 👋</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <ProfileAvatar size={44} />
          </View>
        </View>

        {/* 4 Big Buttons Grid - Row 1 */}
        <RNView style={styles.gridRow}>
          {/* Дневник */}
          <TouchableOpacity 
            style={styles.cardWrapper}
            onPress={() => router.push('/diary')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#14b8a6', '#0891b2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <View style={styles.iconBox}>
                <Text style={styles.cardEmoji}>📝</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Дневник</Text>
                <Text style={styles.cardSubtitle}>Заполнить за сегодня</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Моё здоровье */}
          <TouchableOpacity 
            style={styles.cardWrapper}
            onPress={() => router.push('/health')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8b5cf6', '#9333ea']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <View style={styles.iconBox}>
                <Text style={styles.cardEmoji}>💚</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Моё здоровье</Text>
                <Text style={styles.cardSubtitle}>Анализы и план</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </RNView>

        {/* 4 Big Buttons Grid - Row 2 */}
        <RNView style={styles.gridRow}>
          {/* Эфиры */}
          <TouchableOpacity 
            style={[styles.cardWrapper, styles.whiteCard]}
            onPress={() => router.push('/streams')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBoxColored, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.cardEmoji}>📺</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleDark}>Эфиры</Text>
              <Text style={styles.cardSubtitleDark}>Расписание и записи</Text>
            </View>
          </TouchableOpacity>

          {/* Тарелки */}
          <TouchableOpacity 
            style={[styles.cardWrapper, styles.whiteCard]}
            onPress={() => router.push('/plates')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBoxColored, { backgroundColor: '#ffe4e6' }]}>
              <Text style={styles.cardEmoji}>🍽️</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleDark}>Тарелки</Text>
              <Text style={styles.cardSubtitleDark}>Фото еды</Text>
            </View>
          </TouchableOpacity>
        </RNView>

        {/* Мои интенсивы - полная ширина */}
        <TouchableOpacity 
          style={styles.intensivesButton}
          onPress={() => router.push('/intensives')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#f97316', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.intensivesGradient}
          >
            <View style={styles.intensivesIconBox}>
              <Text style={styles.intensivesEmoji}>🎓</Text>
            </View>
            <View style={styles.intensivesTextContainer}>
              <Text style={styles.intensivesTitle}>Мои интенсивы</Text>
              <Text style={styles.intensivesSubtitle}>Курсы и материалы</Text>
            </View>
            <Text style={styles.intensivesArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValueOrange}>🏆 {loading ? '—' : stats.points}</Text>
            <Text style={styles.statLabel}>очки</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValueTeal}>{loading ? '—' : `${stats.healthScore}%`}</Text>
            <Text style={styles.statLabel}>ЗОЖ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValueViolet}>{loading ? '—' : stats.planProgress}</Text>
            <Text style={styles.statLabel}>план</Text>
          </View>
        </View>

        {/* Chat Bar */}
        <TouchableOpacity 
          style={styles.chatBarButton}
          onPress={openWhatsApp}
          activeOpacity={0.9}
        >
          <View style={[styles.chatIcon, styles.whatsappIcon]}>
            <Text style={styles.chatEmoji}>📱</Text>
          </View>
          <View style={styles.chatContent}>
            <Text style={styles.chatTitle}>Чат клуба Alimi</Text>
            <Text style={styles.chatSubtitle}>Общайтесь в WhatsApp</Text>
          </View>
          <Text style={styles.chatArrow}>→</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f97316',
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    flex: 1,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientCard: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  intensivesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  intensivesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  intensivesIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  intensivesEmoji: {
    fontSize: 26,
  },
  intensivesContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  intensivesTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  intensivesSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  intensivesArrow: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  whiteCard: {
    backgroundColor: 'white',
    padding: 20,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  iconBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxColored: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTextContainer: {
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cardTitleDark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardSubtitleDark: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  statValueOrange: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  statValueTeal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d9488',
  },
  statValueViolet: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  chatBarButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  chatIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappIcon: {
    backgroundColor: '#25D366',
  },
  chatEmoji: {
    fontSize: 24,
  },
  chatContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  chatSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  chatArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  // Интенсивы
  intensivesButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  intensivesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  intensivesIconBox: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensivesEmoji: {
    fontSize: 26,
  },
  intensivesTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  intensivesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  intensivesSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  intensivesArrow: {
    fontSize: 22,
    color: 'white',
  },
});
