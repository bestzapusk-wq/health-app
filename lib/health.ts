import { supabase } from './supabase';

export type HealthRecord = {
  id: string;
  user_id: string;
  indicator_name: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  status: 'normal' | 'low' | 'high' | 'critical';
  test_date: string;
  created_at: string;
};

export type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  birth_date: string | null;
  created_at: string;
};

// Получить все записи анализов пользователя
export async function getHealthRecords(): Promise<HealthRecord[]> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .order('test_date', { ascending: false });

  if (error) {
    console.error('Error fetching health records:', error);
    return [];
  }

  return data || [];
}

// Получить последние значения ключевых показателей
export async function getKeyIndicators(): Promise<HealthRecord[]> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .order('test_date', { ascending: false });

  if (error) {
    console.error('Error fetching key indicators:', error);
    return [];
  }

  // Группируем по indicator_name и берём последнее значение
  const latestByIndicator = new Map<string, HealthRecord>();
  for (const record of data || []) {
    if (!latestByIndicator.has(record.indicator_name)) {
      latestByIndicator.set(record.indicator_name, record);
    }
  }

  return Array.from(latestByIndicator.values());
}

// Добавить запись анализа
export async function addHealthRecord(record: {
  indicatorName: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  testDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  // Определяем статус
  let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
  if (record.referenceMin !== undefined && record.value < record.referenceMin) {
    status = record.value < record.referenceMin * 0.7 ? 'critical' : 'low';
  }
  if (record.referenceMax !== undefined && record.value > record.referenceMax) {
    status = record.value > record.referenceMax * 1.3 ? 'critical' : 'high';
  }

  const { error } = await supabase
    .from('health_records')
    .insert({
      user_id: user.id,
      indicator_name: record.indicatorName,
      value: record.value,
      unit: record.unit,
      reference_min: record.referenceMin,
      reference_max: record.referenceMax,
      status,
      test_date: record.testDate,
    });

  if (error) {
    console.error('Error adding health record:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Получить членов семьи
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching family members:', error);
    return [];
  }

  return data || [];
}

// Добавить члена семьи
export async function addFamilyMember(member: {
  name: string;
  relation: string;
  birthDate?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  const { error } = await supabase
    .from('family_members')
    .insert({
      user_id: user.id,
      name: member.name,
      relation: member.relation,
      birth_date: member.birthDate,
    });

  if (error) {
    console.error('Error adding family member:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Вычислить health score из записей
export async function calculateHealthScore(): Promise<number> {
  const records = await getKeyIndicators();
  
  if (records.length === 0) return 0;

  const normalCount = records.filter(r => r.status === 'normal').length;
  const score = Math.round((normalCount / records.length) * 100);
  
  return score;
}

// Получить улучшения (показатели которые улучшились)
export async function getImprovements(): Promise<{
  name: string;
  oldValue: string;
  newValue: string;
  status: string;
}[]> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .order('test_date', { ascending: false });

  if (error || !data) return [];

  // Группируем по indicator_name
  const byIndicator = new Map<string, HealthRecord[]>();
  for (const record of data) {
    const existing = byIndicator.get(record.indicator_name) || [];
    existing.push(record);
    byIndicator.set(record.indicator_name, existing);
  }

  const improvements: { name: string; oldValue: string; newValue: string; status: string }[] = [];

  for (const [name, records] of byIndicator) {
    if (records.length >= 2) {
      const latest = records[0];
      const previous = records[1];
      
      // Проверяем улучшение: из low/high в normal
      if (previous.status !== 'normal' && latest.status === 'normal') {
        improvements.push({
          name,
          oldValue: previous.value.toString(),
          newValue: latest.value.toString(),
          status: '↑ Норма',
        });
      }
    }
  }

  return improvements;
}

// Получить статус показателя для иконки
export function getIndicatorIcon(name: string): string {
  const icons: Record<string, string> = {
    'Витамин D': '☀️',
    'ТТГ': '🦋',
    'Железо': '🧲',
    'Ферритин': '💪',
    'Гемоглобин': '🩸',
    'B12': '💊',
    'Холестерин': '❤️',
    'Глюкоза': '🍬',
  };
  return icons[name] || '📊';
}

// Получить тип статуса для стилей
export function getStatusType(status: string): 'danger' | 'warning' | 'success' {
  if (status === 'critical' || status === 'low' || status === 'high') {
    return status === 'critical' ? 'danger' : 'warning';
  }
  return 'success';
}

// Получить текст статуса на русском
export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    'normal': 'Норма',
    'low': 'Низкий',
    'high': 'Высокий',
    'critical': 'Критический',
  };
  return texts[status] || status;
}

