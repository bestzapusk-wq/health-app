import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Switch,
  Text as RNText,
  View as RNView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getProfile, 
  updateProfile, 
  getPlanTasks, 
  uploadAvatar,
  Profile,
  PlanTask,
} from '@/lib/profile';
import { pickImage } from '@/lib/plates';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planTasks, setPlanTasks] = useState<PlanTask[]>([]);
  
  // Редактирование профиля
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Анимации
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, tasks] = await Promise.all([
        getProfile(),
        getPlanTasks(),
      ]);
      setProfile(profileData);
      setPlanTasks(tasks);
      
      if (profileData) {
        setFullName(profileData.full_name || '');
        setHeight(profileData.height?.toString() || '');
        setWeight(profileData.weight?.toString() || '');
        setAge(profileData.age?.toString() || '');
        setNotificationsEnabled(profileData.notifications_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        full_name: fullName,
        height: height ? parseInt(height) : null,
        weight: weight ? parseInt(weight) : null,
        age: age ? parseInt(age) : null,
      });
      
      if (result.success) {
        setProfile(prev => prev ? {
          ...prev,
          full_name: fullName,
          height: height ? parseInt(height) : null,
          weight: weight ? parseInt(weight) : null,
          age: age ? parseInt(age) : null,
        } : null);
        setIsEditing(false);
        Alert.alert('✅ Сохранено', 'Профиль обновлён');
        loadData(); // Reload to update plan tasks
      } else {
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const uri = await pickImage();
    if (uri) {
      setUploadingAvatar(true);
      try {
        const result = await uploadAvatar(uri);
        if (result.url) {
          setProfile(prev => prev ? { ...prev, avatar_url: result.url } : null);
          Alert.alert('✅', 'Фото обновлено');
        } else {
          Alert.alert('Ошибка', result.error || 'Не удалось загрузить');
        }
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить фото');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    const result = await updateProfile({ notifications_enabled: value } as Partial<Profile>);
    if (!result.success) {
      setNotificationsEnabled(!value); // Revert on error
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  const handleLogout = async () => {
    // Для web используем confirm, для native - Alert
    const confirmLogout = () => {
      if (typeof window !== 'undefined' && window.confirm) {
        return window.confirm('Вы уверены, что хотите выйти?');
      }
      return true;
    };

    // На web используем confirm
    if (typeof window !== 'undefined' && window.confirm) {
      if (confirmLogout()) {
        await signOut();
        router.replace('/(auth)/login');
      }
    } else {
      // На native используем Alert
      Alert.alert(
        'Выход',
        'Вы уверены, что хотите выйти?',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Выйти', 
            style: 'destructive', 
            onPress: async () => {
              await signOut();
              router.replace('/(auth)/login');
            }
          },
        ]
      );
    }
  };

  const completedTasks = planTasks.filter(t => t.completed).length;
  const totalProgress = planTasks.length > 0 ? (completedTasks / planTasks.length) * 100 : 0;
  
  // Check if profile is incomplete
  const isProfileIncomplete = !profile?.full_name || !profile?.age || !profile?.height || !profile?.weight;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#0d9488', '#14b8a6', '#2dd4bf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Профиль</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editLink}>Изменить</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          {/* Avatar */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="white" size="large" />
              </View>
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.full_name || 'Пользователь'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🔥 {profile?.streak || 0}</Text>
              <Text style={styles.statLabel}>дней подряд</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🏆 {profile?.points || 0}</Text>
              <Text style={styles.statLabel}>очков</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>💚 {profile?.health_score || 0}%</Text>
              <Text style={styles.statLabel}>здоровье</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Баннер заполнения профиля или кнопка редактирования */}
        {!isEditing && (
          isProfileIncomplete ? (
            <TouchableOpacity 
              style={styles.profileBanner}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.profileBannerGradient}
              >
                <RNText style={styles.profileBannerEmoji}>👋</RNText>
                <RNView style={styles.profileBannerContent}>
                  <RNText style={styles.profileBannerTitle}>Заполните профиль</RNText>
                  <RNText style={styles.profileBannerText}>Для персональных рекомендаций</RNText>
                </RNView>
                <RNView style={styles.profileBannerButton}>
                  <RNText style={styles.profileBannerButtonText}>Заполнить</RNText>
                </RNView>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editProfileButtonText}>✏️ Внести изменения</Text>
            </TouchableOpacity>
          )
        )}

        {/* Личные данные */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👤 Личные данные</Text>
          </View>

          <View style={styles.fieldsGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Имя</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ваше имя"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.full_name || 'Не указано'}</Text>
              )}
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Возраст</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.age ? `${profile.age} лет` : '—'}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldsGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Рост (см)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.height ? `${profile.height} см` : '—'}</Text>
              )}
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Вес (кг)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="65"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.weight ? `${profile.weight} кг` : '—'}</Text>
              )}
            </View>
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name || '');
                  setHeight(profile?.height?.toString() || '');
                  setWeight(profile?.weight?.toString() || '');
                  setAge(profile?.age?.toString() || '');
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Быстрый старт на платформе */}
        <View style={styles.planCard}>
          <LinearGradient
            colors={['#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.planHeader}
          >
            <View style={styles.planHeaderContent}>
              <View style={styles.planHeaderLeft}>
                <Text style={styles.planTitle}>🚀 Быстрый старт</Text>
                <Text style={styles.planSubtitle}>
                  {completedTasks === planTasks.length 
                    ? '🎁 Подарок разблокирован!' 
                    : `${completedTasks}/${planTasks.length} шагов выполнено`}
                </Text>
              </View>
              <View style={styles.planProgress}>
                <Text style={styles.planProgressText}>{Math.round(totalProgress)}%</Text>
              </View>
            </View>
            <View style={styles.planProgressBar}>
              <View style={[styles.planProgressFill, { width: `${totalProgress}%` }]} />
            </View>
          </LinearGradient>

          <View style={styles.tasksContainer}>
            {planTasks.map((task, index) => (
              <Animated.View
                key={task.id}
                style={[
                  styles.taskItem,
                  task.completed && styles.taskItemCompleted,
                ]}
              >
                <View style={[
                  styles.taskIcon,
                  task.completed && styles.taskIconCompleted,
                ]}>
                  <Text style={styles.taskEmoji}>{task.completed ? '✅' : task.emoji}</Text>
                </View>
                <View style={styles.taskContent}>
                  <Text style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}>
                    {task.title}
                  </Text>
                  <View style={styles.taskProgressRow}>
                    <View style={styles.taskProgressBar}>
                      <View 
                        style={[
                          styles.taskProgressFill,
                          { width: `${(task.current / task.target) * 100}%` },
                          task.completed && styles.taskProgressFillCompleted,
                        ]} 
                      />
                    </View>
                    <Text style={styles.taskProgressText}>
                      {task.current}/{task.target}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Достижения */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 Достижения</Text>
          <View style={styles.achievementsGrid}>
            <View style={styles.achievementItem}>
              <LinearGradient
                colors={['#fef3c7', '#fde68a']}
                style={styles.achievementIcon}
              >
                <Text style={styles.achievementEmoji}>🌟</Text>
              </LinearGradient>
              <Text style={styles.achievementLabel}>Первый день</Text>
              <Text style={styles.achievementDate}>Получено</Text>
            </View>
            <View style={styles.achievementItem}>
              <LinearGradient
                colors={['#dcfce7', '#bbf7d0']}
                style={styles.achievementIcon}
              >
                <Text style={styles.achievementEmoji}>💧</Text>
              </LinearGradient>
              <Text style={styles.achievementLabel}>Водный баланс</Text>
              <Text style={styles.achievementDate}>Получено</Text>
            </View>
            <View style={styles.achievementItem}>
              <LinearGradient
                colors={['#e0e7ff', '#c7d2fe']}
                style={styles.achievementIcon}
              >
                <Text style={styles.achievementEmoji}>📝</Text>
              </LinearGradient>
              <Text style={styles.achievementLabel}>7 дней подряд</Text>
              <Text style={styles.achievementDate}>Получено</Text>
            </View>
            <View style={[styles.achievementItem, styles.achievementLocked]}>
              <View style={styles.achievementIconLocked}>
                <Text style={styles.achievementEmoji}>🔒</Text>
              </View>
              <Text style={styles.achievementLabel}>30 дней</Text>
              <Text style={styles.achievementDate}>Заблокировано</Text>
            </View>
          </View>
        </View>

        {/* Настройки */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚙️ Настройки</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>🔔</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Получать уведомления</Text>
              <Text style={styles.settingHint}>Напоминания, эфиры, советы</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={notificationsEnabled ? '#22c55e' : '#9ca3af'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>🔒</Text>
            </View>
            <Text style={styles.settingLabel}>Сменить пароль</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>❓</Text>
            </View>
            <Text style={styles.settingLabel}>Помощь</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Версия 1.0.0</Text>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: 'white',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  editLink: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  placeholder: {
    width: 60,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarLoading: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarBadgeText: {
    fontSize: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  card: {
    margin: 16,
    marginTop: -16,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  fieldsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  fieldHalf: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  // План
  planCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  planHeader: {
    padding: 20,
  },
  planHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  planHeaderLeft: {
    backgroundColor: 'transparent',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  planSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  planProgress: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planProgressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  planProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  planProgressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  tasksContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  taskItemCompleted: {
    backgroundColor: '#f0fdf4',
  },
  taskIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskIconCompleted: {
    backgroundColor: '#dcfce7',
  },
  taskEmoji: {
    fontSize: 22,
  },
  taskContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  taskTitleCompleted: {
    color: '#15803d',
  },
  taskProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  taskProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  taskProgressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  taskProgressFillCompleted: {
    backgroundColor: '#22c55e',
  },
  taskProgressText: {
    fontSize: 12,
    color: '#9ca3af',
    minWidth: 36,
  },
  // Достижения
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: 'transparent',
  },
  achievementItem: {
    width: (width - 80) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementIconLocked: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementEmoji: {
    fontSize: 28,
  },
  achievementLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  achievementDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  // Настройки
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingEmoji: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  settingHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  settingArrow: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Logout
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 20,
  },
  // Баннер заполнения профиля
  profileBanner: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  profileBannerEmoji: {
    fontSize: 28,
  },
  profileBannerContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  profileBannerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  profileBannerButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  profileBannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  editProfileButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editProfileButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
