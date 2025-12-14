import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export type HealthFile = {
  id: string;
  name: string;
  url: string;
  size: string;
  date: string;
  created_at: string;
};

// Получить список файлов пользователя
export async function getHealthFiles(): Promise<HealthFile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.storage
    .from('health-records')
    .list(user.id, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Error fetching health files:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Получаем URLs для каждого файла
  const files: HealthFile[] = await Promise.all(
    data.map(async (file) => {
      const { data: urlData } = supabase.storage
        .from('health-records')
        .getPublicUrl(`${user.id}/${file.name}`);

      return {
        id: file.id || file.name,
        name: file.name.split('_').slice(1).join('_') || file.name, // Remove timestamp prefix
        url: urlData.publicUrl,
        size: formatFileSize(file.metadata?.size || 0),
        date: formatDate(file.created_at || new Date().toISOString()),
        created_at: file.created_at || new Date().toISOString(),
      };
    })
  );

  return files;
}

// Загрузить файл анализа
export async function uploadHealthFile(uri: string, fileName: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Не авторизован' };

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${user.id}/${timestamp}_${cleanFileName}`;

    const { error } = await supabase.storage
      .from('health-records')
      .upload(filePath, blob, {
        contentType: blob.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Ошибка загрузки' };
  }
}

// Выбрать файл для загрузки
export async function pickDocument(): Promise<{ uri: string; name: string } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name || 'document',
    };
  } catch (error) {
    console.error('Document picker error:', error);
    return null;
  }
}

// Удалить файл
export async function deleteHealthFile(fileName: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.storage
    .from('health-records')
    .remove([`${user.id}/${fileName}`]);

  if (error) {
    console.error('Error deleting file:', error);
    return false;
  }

  return true;
}

// Форматирование размера файла
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Форматирование даты
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

