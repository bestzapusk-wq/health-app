import { supabase } from './supabase';

export type DiaryEntry = {
  id?: string;
  user_id?: string;
  date: string;
  mood: number | null;
  water: number;
  sleep: number | null;
  stress: number | null;
  activity: number;
  supplements: string[];
  note: string;
  weekly_goal_current: number;
  weekly_goal_target: number;
  created_at?: string;
  updated_at?: string;
};

// Получить запись за сегодня
export async function getTodayEntry(): Promise<DiaryEntry | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching today entry:', error);
    return null;
  }

  return data;
}

// Получить запись за конкретную дату
export async function getEntryByDate(date: string): Promise<DiaryEntry | null> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching entry:', error);
    return null;
  }

  return data;
}

// Сохранить или обновить запись
export async function saveDiaryEntry(entry: Partial<DiaryEntry>): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  const today = entry.date || new Date().toISOString().split('T')[0];

  const entryData = {
    user_id: user.id,
    date: today,
    mood: entry.mood,
    water: entry.water ?? 0,
    sleep: entry.sleep,
    stress: entry.stress,
    activity: entry.activity ?? 0,
    supplements: entry.supplements ?? [],
    note: entry.note ?? '',
    weekly_goal_current: entry.weekly_goal_current ?? 0,
    weekly_goal_target: entry.weekly_goal_target ?? 10000,
  };

  const { error } = await supabase
    .from('diary_entries')
    .upsert(entryData, {
      onConflict: 'user_id,date',
    });

  if (error) {
    console.error('Error saving diary entry:', error);
    return { success: false, error: error.message };
  }

  // Обновляем streak в профиле
  await updateStreak(user.id);

  return { success: true };
}

// Получить историю записей
export async function getDiaryHistory(limit: number = 30): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching diary history:', error);
    return [];
  }

  return data || [];
}

// Подсчёт streak
async function updateStreak(userId: string) {
  const { data: entries } = await supabase
    .from('diary_entries')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(100);

  if (!entries || entries.length === 0) return;

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (entryDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  // Обновляем streak в профиле
  await supabase
    .from('profiles')
    .update({ streak })
    .eq('id', userId);
}

// Получить статистику за месяц
export async function getMonthlyStats(): Promise<{
  avgMood: number;
  avgWater: number;
  avgSleep: number;
  avgStress: number;
  avgActivity: number;
  totalDays: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('diary_entries')
    .select('mood, water, sleep, stress, activity')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

  if (error || !data || data.length === 0) {
    return {
      avgMood: 0,
      avgWater: 0,
      avgSleep: 0,
      avgStress: 0,
      avgActivity: 0,
      totalDays: 0,
    };
  }

  const totalDays = data.length;
  const sum = data.reduce(
    (acc, entry) => ({
      mood: acc.mood + (entry.mood || 0),
      water: acc.water + (entry.water || 0),
      sleep: acc.sleep + (entry.sleep || 0),
      stress: acc.stress + (entry.stress || 0),
      activity: acc.activity + (entry.activity || 0),
    }),
    { mood: 0, water: 0, sleep: 0, stress: 0, activity: 0 }
  );

  return {
    avgMood: Math.round((sum.mood / totalDays) * 10) / 10,
    avgWater: Math.round((sum.water / totalDays) * 10) / 10,
    avgSleep: Math.round((sum.sleep / totalDays) * 10) / 10,
    avgStress: Math.round((sum.stress / totalDays) * 10) / 10,
    avgActivity: Math.round(sum.activity / totalDays),
    totalDays,
  };
}

// Получить прогресс за последние 7 дней (для плашки с подарком)
export async function getWeekProgress(): Promise<boolean[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [false, false, false, false, false, false, false];

  // Получаем даты последних 7 дней
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log('Week progress dates:', dates);

  const { data, error } = await supabase
    .from('diary_entries')
    .select('date')
    .eq('user_id', user.id)
    .in('date', dates);

  if (error) {
    console.error('Error fetching week progress:', error);
    return [false, false, false, false, false, false, false];
  }

  console.log('Found diary entries:', data);

  // Нормализуем даты из базы (могут приходить в разных форматах)
  const filledDates = new Set((data || []).map(e => {
    // Преобразуем дату в формат YYYY-MM-DD
    const dateStr = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
    return dateStr;
  }));
  
  console.log('Filled dates set:', Array.from(filledDates));
  
  const result = dates.map(d => filledDates.has(d));
  console.log('Week progress result:', result);
  
  return result;
}

// Подсчёт качества дня (0-10 баллов)
export function calculateDayScore(entry: DiaryEntry): number {
  let score = 0;
  
  // Настроение: Хорошо (3) +2, Нормально (2) +1, Плохо (1) 0
  if (entry.mood === 3) score += 2;
  else if (entry.mood === 2) score += 1;
  
  // Вода: 8+ стаканов +2, 5-7 +1, меньше 0
  if (entry.water >= 8) score += 2;
  else if (entry.water >= 5) score += 1;
  
  // Сон: 7-9 часов (4-5) +2, 5-6 часов (3) +1, меньше 0
  if (entry.sleep && entry.sleep >= 4) score += 2;
  else if (entry.sleep && entry.sleep >= 3) score += 1;
  
  // БАДы: все приняты (3+) +2, частично (1-2) +1, нет 0
  const supplementsCount = entry.supplements?.length || 0;
  if (supplementsCount >= 3) score += 2;
  else if (supplementsCount >= 1) score += 1;
  
  // Стресс: низкий (1-2) +2, средний (3) +1, высокий (4-5) 0
  if (entry.stress && entry.stress <= 2) score += 2;
  else if (entry.stress && entry.stress <= 3) score += 1;
  
  return score;
}

// Получить категорию качества дня
export function getDayQuality(score: number): 'good' | 'normal' | 'bad' {
  if (score >= 7) return 'good';
  if (score >= 4) return 'normal';
  return 'bad';
}

// Получить динамику за неделю с оценками
export async function getWeekDynamics(): Promise<{ date: string; score: number; dayName: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date();
  const dates: string[] = [];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', user.id)
    .in('date', dates);

  if (error) {
    console.error('Error fetching week dynamics:', error);
    return [];
  }

  const entriesMap = new Map((data || []).map(e => [e.date, e]));
  
  return dates.map(date => {
    const entry = entriesMap.get(date);
    const d = new Date(date);
    return {
      date,
      score: entry ? calculateDayScore(entry) : 0,
      dayName: dayNames[d.getDay()],
    };
  });
}

// Получить оценку ЗОЖ за последние 7 дней
export async function getZozhScore(): Promise<{ score: number | null; daysCount: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { score: null, daysCount: 0 };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('diary_entries')
    .select('mood, water_glasses, sleep_hours, supplements_taken, stress_level')
    .eq('user_id', user.id)
    .gte('date', dateStr)
    .order('date', { ascending: false });

  if (error || !data || data.length === 0) {
    return { score: null, daysCount: 0 };
  }

  let totalPoints = 0;

  data.forEach(entry => {
    // Настроение: good=2, normal=1, bad=0
    if (entry.mood === 'good') totalPoints += 2;
    else if (entry.mood === 'normal') totalPoints += 1;

    // Вода (water_glasses, 1 стакан = 250мл, 8 стаканов = 2000мл)
    const waterMl = (entry.water_glasses || 0) * 250;
    if (waterMl >= 2000) totalPoints += 2;
    else if (waterMl >= 1000) totalPoints += 1;

    // Сон: 7-9 = 2, 5-6.9 = 1, <5 или >9 = 0
    const sleep = entry.sleep_hours || 0;
    if (sleep >= 7 && sleep <= 9) totalPoints += 2;
    else if (sleep >= 5) totalPoints += 1;

    // БАДы: true=2, false=0
    if (entry.supplements_taken) totalPoints += 2;

    // Стресс: low=2, medium=1, high=0
    if (entry.stress_level === 'low') totalPoints += 2;
    else if (entry.stress_level === 'medium') totalPoints += 1;
  });

  const maxPoints = data.length * 10;
  const score = Math.round((totalPoints / maxPoints) * 100);

  return { score, daysCount: data.length };
}

