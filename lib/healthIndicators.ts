import { supabase } from './supabase';

export type HealthIndicators = {
  id: string;
  user_id: string;
  vitamin_d: number | null;
  ferritin: number | null;
  iron: number | null;
  hemoglobin: number | null;
  b12: number | null;
  tsh: number | null;
  t4_free: number | null;
  glucose: number | null;
  cholesterol: number | null;
  folate: number | null;
  created_at: string;
  updated_at: string;
};

export type IndicatorConfig = {
  key: keyof Omit<HealthIndicators, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  name: string;
  unit: string;
  min: number;
  max: number;
  optimalMin: number;
  optimalMax: number;
};

export const INDICATORS_CONFIG: IndicatorConfig[] = [
  { key: 'vitamin_d', name: 'Витамин D', unit: 'нг/мл', min: 0, max: 150, optimalMin: 40, optimalMax: 80 },
  { key: 'ferritin', name: 'Ферритин', unit: 'нг/мл', min: 0, max: 500, optimalMin: 40, optimalMax: 150 },
  { key: 'iron', name: 'Железо', unit: 'мкмоль/л', min: 0, max: 35, optimalMin: 12, optimalMax: 30 },
  { key: 'hemoglobin', name: 'Гемоглобин', unit: 'г/л', min: 0, max: 200, optimalMin: 120, optimalMax: 160 },
  { key: 'b12', name: 'Витамин B12', unit: 'пг/мл', min: 0, max: 1500, optimalMin: 400, optimalMax: 900 },
  { key: 'tsh', name: 'ТТГ', unit: 'мМЕ/л', min: 0, max: 10, optimalMin: 0.5, optimalMax: 2.5 },
  { key: 't4_free', name: 'Т4 свободный', unit: 'пмоль/л', min: 0, max: 30, optimalMin: 12, optimalMax: 22 },
  { key: 'glucose', name: 'Глюкоза', unit: 'ммоль/л', min: 0, max: 15, optimalMin: 4.0, optimalMax: 5.5 },
  { key: 'cholesterol', name: 'Холестерин', unit: 'ммоль/л', min: 0, max: 10, optimalMin: 3.5, optimalMax: 5.2 },
  { key: 'folate', name: 'Фолиевая кислота', unit: 'нг/мл', min: 0, max: 50, optimalMin: 10, optimalMax: 30 },
];

// Получить показатели пользователя
export async function getHealthIndicators(): Promise<HealthIndicators | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('health_indicators')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.log('No health indicators found');
    return null;
  }

  return data;
}

// Сохранить показатели
export async function saveHealthIndicators(indicators: Partial<HealthIndicators>): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Не авторизован' };

  // Check if record exists
  const { data: existing } = await supabase
    .from('health_indicators')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('health_indicators')
      .update({
        ...indicators,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating health indicators:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Create new
    const { error } = await supabase
      .from('health_indicators')
      .insert({
        user_id: user.id,
        ...indicators,
      });

    if (error) {
      console.error('Error saving health indicators:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

// Получить статус показателя
export function getIndicatorStatus(value: number | null, config: IndicatorConfig): 'optimal' | 'warning' | 'danger' | 'none' {
  if (value === null || value === undefined) return 'none';
  
  if (value >= config.optimalMin && value <= config.optimalMax) {
    return 'optimal';
  } else if (value < config.min * 0.5 || value > config.max * 0.9) {
    return 'danger';
  } else {
    return 'warning';
  }
}

// Подсчёт health score на основе показателей
export function calculateHealthScore(indicators: HealthIndicators | null): number {
  if (!indicators) return 0;

  let score = 0;
  let count = 0;

  INDICATORS_CONFIG.forEach(config => {
    const value = indicators[config.key] as number | null;
    if (value !== null && value !== undefined) {
      count++;
      const status = getIndicatorStatus(value, config);
      if (status === 'optimal') score += 10;
      else if (status === 'warning') score += 5;
      // danger = 0
    }
  });

  if (count === 0) return 0;
  return Math.round((score / (count * 10)) * 100);
}

// Форматирование значения для отображения
export function formatIndicatorValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  return `${value} ${unit}`;
}

