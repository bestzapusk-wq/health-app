import { supabase } from './supabase';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  height: number | null; // рост в см
  weight: number | null; // вес в кг
  age: number | null;
  streak: number;
  points: number;
  health_score: number;
  plan_progress: number;
  plan_total: number;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanTask = {
  id: string;
  title: string;
  emoji: string;
  current: number;
  target: number;
  completed: boolean;
};

// Получить профиль текущего пользователя (создаёт автоматически если нет)
export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Пробуем получить профиль
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Если профиль не найден — создаём
  if (error && error.code === 'PGRST116') {
    console.log('Profile not found, creating...');
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь',
        streak: 0,
        points: 0,
        health_score: 0,
        plan_progress: 0,
        plan_total: 7,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return null;
    }

    return {
      ...newProfile,
      email: user.email || '',
    };
  }

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return {
    ...data,
    email: user.email || '',
  };
}

// Обновить профиль
export async function updateProfile(updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
  if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.height !== undefined) updateData.height = updates.height;
  if (updates.weight !== undefined) updateData.weight = updates.weight;
  if (updates.age !== undefined) updateData.age = updates.age;
  if (updates.notifications_enabled !== undefined) updateData.notifications_enabled = updates.notifications_enabled;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Обновить health score
export async function updateHealthScore(score: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ health_score: score })
    .eq('id', user.id);
}

// Добавить очки
export async function addPoints(pointsToAdd: number): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;

  // Получаем текущие очки
  const { data: profile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();

  const newPoints = (profile?.points || 0) + pointsToAdd;

  await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', user.id);

  return newPoints;
}

// Обновить прогресс плана
export async function updatePlanProgress(progress: number, total: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase
    .from('profiles')
    .update({
      plan_progress: progress,
      plan_total: total,
    })
    .eq('id', user.id);
}

// Расчёт реального индекса ЗОЖ
export async function calculateRealHealthScore(profile: Profile | null): Promise<number> {
  if (!profile) return 0;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let score = 50; // Базовый балл

  // +10 если заполнены анализы
  const { count: indicatorsCount } = await supabase
    .from('health_indicators')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (indicatorsCount && indicatorsCount > 0) score += 10;

  // +10 если streak > 7 дней
  if ((profile.streak || 0) >= 7) score += 10;

  // +10 если заполнен дневник сегодня
  const today = new Date().toISOString().split('T')[0];
  const { count: diaryToday } = await supabase
    .from('diary_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('date', today);
  if (diaryToday && diaryToday > 0) score += 10;

  // +10 если внесены БАДы сегодня
  const { data: diaryEntry } = await supabase
    .from('diary_entries')
    .select('supplements')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();
  if (diaryEntry?.supplements && diaryEntry.supplements.length > 0) score += 10;

  // +10 если профиль заполнен полностью
  if (profile.full_name && profile.age && profile.height && profile.weight) score += 10;

  return Math.min(score, 100);
}

// Получить статистику для главной
export async function getHomeStats(): Promise<{
  streak: number;
  healthScore: number;
  planProgress: string;
  points: number;
}> {
  const profile = await getProfile();
  
  if (!profile) {
    return {
      streak: 0,
      healthScore: 50,
      planProgress: '0/7',
      points: 0,
    };
  }

  const healthScore = await calculateRealHealthScore(profile);

  return {
    streak: profile.streak || 0,
    healthScore,
    planProgress: `${profile.plan_progress || 0}/${profile.plan_total || 7}`,
    points: profile.points || 0,
  };
}

// Получить имя для приветствия
export async function getGreetingName(): Promise<string> {
  const profile = await getProfile();
  
  if (!profile?.full_name) {
    return 'друг';
  }

  // Возвращаем первое слово имени
  return profile.full_name.split(' ')[0];
}

// Получить план на 14 дней с прогрессом
export async function getPlanTasks(): Promise<PlanTask[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getDefaultPlanTasks();

  const profile = await getProfile();
  
  // Получаем данные для расчёта прогресса
  const [diaryCount, analysesCount, streamsCount, platesStars] = await Promise.all([
    getDiaryCount(user.id),
    getAnalysesCount(user.id),
    getStreamsCount(user.id),
    getPlatesStars(user.id),
  ]);

  const questionnaireCount = await getQuestionnaireCount(user.id);
  const profileFilled = !!(profile?.full_name && profile?.height && profile?.weight && profile?.age);
  const notificationsOn = profile?.notifications_enabled ?? false;

  return [
    {
      id: '1',
      title: 'Заполнить профиль',
      emoji: '👤',
      current: profileFilled ? 1 : 0,
      target: 1,
      completed: profileFilled,
    },
    {
      id: '2',
      title: 'Пройти вводный модуль',
      emoji: '📚',
      current: questionnaireCount >= 1 ? 1 : 0,
      target: 1,
      completed: questionnaireCount >= 1,
    },
    {
      id: '3',
      title: 'Внести свои анализы',
      emoji: '🔬',
      current: Math.min(analysesCount, 1),
      target: 1,
      completed: analysesCount >= 1,
    },
    {
      id: '4',
      title: 'Заполнить первый дневник здоровья',
      emoji: '📝',
      current: Math.min(diaryCount, 1),
      target: 1,
      completed: diaryCount >= 1,
    },
    {
      id: '5',
      title: 'Включить напоминания',
      emoji: '🔔',
      current: notificationsOn ? 1 : 0,
      target: 1,
      completed: notificationsOn,
    },
    {
      id: '6',
      title: 'Отправить фото тарелки',
      emoji: '🍽️',
      current: Math.min(platesStars, 1),
      target: 1,
      completed: platesStars >= 1,
    },
    {
      id: '7',
      title: 'Посетить первый эфир',
      emoji: '📺',
      current: Math.min(streamsCount, 1),
      target: 1,
      completed: streamsCount >= 1,
    },
  ];
}

// Хелперы для получения прогресса
async function getDiaryCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('diary_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

async function getAnalysesCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('health_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

async function getQuestionnaireCount(userId: string): Promise<number> {
  // TODO: implement when questionnaires table is ready
  return 1; // default: 1 completed
}

async function getStreamsCount(userId: string): Promise<number> {
  // TODO: implement stream attendance tracking
  return 0;
}

async function getPlatesStars(userId: string): Promise<number> {
  const { count } = await supabase
    .from('plates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  // Each plate = 1 star
  return count || 0;
}

function getDefaultPlanTasks(): PlanTask[] {
  return [
    { id: '1', title: 'Заполнить профиль', emoji: '👤', current: 0, target: 1, completed: false },
    { id: '2', title: 'Пройти вводный модуль', emoji: '📚', current: 0, target: 1, completed: false },
    { id: '3', title: 'Внести свои анализы', emoji: '🔬', current: 0, target: 1, completed: false },
    { id: '4', title: 'Заполнить первый дневник здоровья', emoji: '📝', current: 0, target: 1, completed: false },
    { id: '5', title: 'Включить напоминания', emoji: '🔔', current: 0, target: 1, completed: false },
    { id: '6', title: 'Отправить фото тарелки', emoji: '🍽️', current: 0, target: 1, completed: false },
    { id: '7', title: 'Посетить первый эфир', emoji: '📺', current: 0, target: 1, completed: false },
  ];
}

// Загрузка аватара
export async function uploadAvatar(uri: string): Promise<{ url: string | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Не авторизован' };

  try {
    // Fetch URI as blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Путь без prefix "avatars/" т.к. уже в bucket avatars
    const fileName = `${user.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Обновляем профиль
    const updateResult = await updateProfile({ avatar_url: data.publicUrl } as Partial<Profile>);
    
    if (!updateResult.success) {
      console.error('Error updating profile with avatar URL');
    }

    return { url: data.publicUrl };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { url: null, error: 'Ошибка загрузки' };
  }
}

