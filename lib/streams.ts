import { supabase } from './supabase';

export type Stream = {
  id: string;
  title: string;
  description: string | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  scheduled_date: string;
  scheduled_time: string;
  is_live: boolean;
  is_completed: boolean;
  recording_url: string | null;
  duration_minutes: number | null;
  views_count: number;
  thumbnail_url: string | null;
  created_at: string;
};

export type StreamQuestion = {
  id: string;
  stream_id: string;
  user_id: string;
  question: string;
  is_answered: boolean;
  created_at: string;
};

// Получить предстоящие эфиры
export async function getUpcomingStreams(): Promise<Stream[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .gte('scheduled_date', today)
    .eq('is_completed', false)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming streams:', error);
    return [];
  }

  return data || [];
}

// Получить записи эфиров
export async function getRecordedStreams(): Promise<Stream[]> {
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('is_completed', true)
    .not('recording_url', 'is', null)
    .order('scheduled_date', { ascending: false });

  if (error) {
    console.error('Error fetching recorded streams:', error);
    return [];
  }

  return data || [];
}

// Получить следующий эфир
export async function getNextStream(): Promise<Stream | null> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0];
  
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .gte('scheduled_date', today)
    .eq('is_completed', false)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching next stream:', error);
    return null;
  }

  return data;
}

// Отправить вопрос к эфиру
export async function sendStreamQuestion(
  streamId: string | null,
  question: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  // Формируем данные для вставки
  const insertData: {
    user_id: string;
    question: string;
    stream_id?: string;
  } = {
    user_id: user.id,
    question,
  };

  // Добавляем stream_id только если он передан (реальный UUID из таблицы streams)
  if (streamId) {
    insertData.stream_id = streamId;
  }

  const { error } = await supabase
    .from('stream_questions')
    .insert(insertData);

  if (error) {
    console.error('Error sending question:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Получить вопросы пользователя
export async function getUserQuestions(): Promise<StreamQuestion[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('stream_questions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user questions:', error);
    return [];
  }

  return data || [];
}

// Увеличить счётчик просмотров
export async function incrementViewCount(streamId: string): Promise<void> {
  const { data: stream } = await supabase
    .from('streams')
    .select('views_count')
    .eq('id', streamId)
    .single();

  if (stream) {
    await supabase
      .from('streams')
      .update({ views_count: (stream.views_count || 0) + 1 })
      .eq('id', streamId);
  }
}

// Отметить посещение эфира (для статистики)
export async function markStreamAttendance(streamId: string): Promise<void> {
  // Можно создать отдельную таблицу stream_attendance
  // или использовать localStorage для отслеживания
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Пока просто логируем
  console.log(`User ${user.id} attended stream ${streamId}`);
}

