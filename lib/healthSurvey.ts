import { supabase } from './supabase';

export type HealthSurveyResult = {
  id: string;
  user_id: string;
  total_score: number;
  max_score: number;
  answers: Record<string, number> | null;
  completed_at: string;
  created_at: string;
};

export type HealthDeviation = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high';
  category: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_comment: string | null;
  created_at: string;
};

// Получить результат опросника пользователя
export async function getSurveyResult(): Promise<HealthSurveyResult | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('health_survey_results')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // Если нет записи - это нормально, пользователь ещё не проходил опросник
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching survey result:', error);
    return null;
  }

  return data;
}

// Вычислить индекс здоровья из результата опросника
export function calculateHealthIndex(result: HealthSurveyResult | null): number | null {
  if (!result) return null;
  return Math.round((result.total_score / result.max_score) * 100);
}

// Получить активные отклонения (не устранённые)
export async function getActiveDeviations(): Promise<HealthDeviation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('health_deviations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_resolved', false)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deviations:', error);
    return [];
  }

  return data || [];
}

// Получить устранённые отклонения
export async function getResolvedDeviations(): Promise<HealthDeviation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('health_deviations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_resolved', true)
    .order('resolved_at', { ascending: false });

  if (error) {
    console.error('Error fetching resolved deviations:', error);
    return [];
  }

  return data || [];
}

// Отметить отклонение как устранённое
export async function resolveDeviation(
  deviationId: string, 
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('health_deviations')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_comment: comment || null,
    })
    .eq('id', deviationId);

  if (error) {
    console.error('Error resolving deviation:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Вспомогательная функция для цвета бейджа severity
export function getSeverityBadge(severity: string): { label: string; color: string; bgColor: string } {
  switch (severity) {
    case 'low':
      return { label: 'Низкий', color: '#854d0e', bgColor: '#fef9c3' };
    case 'medium':
      return { label: 'Средний', color: '#c2410c', bgColor: '#ffedd5' };
    case 'high':
      return { label: 'Высокий', color: '#991b1b', bgColor: '#fee2e2' };
    default:
      return { label: 'Неизвестно', color: '#374151', bgColor: '#f3f4f6' };
  }
}

