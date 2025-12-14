import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export type Plate = {
  id: string;
  user_id: string;
  image_url: string; // в БД это photo_url
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string | null;
  feedback: string | null;
  feedback_status: 'pending' | 'reviewed'; // в БД это status
  rating: number | null;
  is_featured: boolean;
  likes_count: number;
  date: string;
  created_at: string;
};

export type BestPlate = {
  id: string;
  image_url: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  author_name: string;
  review: string | null;
  is_active: boolean;
  created_at: string;
};

// Выбрать изображение из галереи
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

// Сделать фото камерой
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

// Загрузить изображение в Storage
export async function uploadPlateImage(uri: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Конвертируем URI в blob
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `${Date.now()}.jpg`;
    const filePath = `${user.id}/${fileName}`;

    // Загружаем в Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('plates')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Получаем публичный URL
    const { data } = supabase.storage
      .from('plates')
      .getPublicUrl(filePath);

    console.log('Uploaded plate image, public URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// Сохранить тарелку
export async function savePlate(data: {
  imageUrl: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
}): Promise<{ success: boolean; error?: string; plate?: Plate }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  console.log('Saving plate with imageUrl:', data.imageUrl);
  
  const { data: plateData, error } = await supabase
    .from('plates')
    .insert({
      user_id: user.id,
      photo_url: data.imageUrl,
      meal_type: data.mealType,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving plate:', error);
    return { success: false, error: error.message };
  }
  
  console.log('Saved plate:', plateData);

  // Преобразуем в наш тип
  const plate: Plate = {
    ...plateData,
    image_url: plateData.photo_url,
    feedback_status: plateData.status,
  };

  return { success: true, plate };
}

// Получить все тарелки пользователя
export async function getPlates(limit: number = 20): Promise<Plate[]> {
  const { data, error } = await supabase
    .from('plates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching plates:', error);
    return [];
  }

  // Преобразуем поля из БД в наш тип
  const plates = (data || []).map(p => ({
    ...p,
    image_url: p.photo_url,
    feedback_status: p.status,
  }));
  
  console.log('Loaded plates:', plates.map(p => ({ id: p.id, image_url: p.image_url })));
  
  return plates;
}

// Получить тарелки за сегодня
export async function getTodayPlates(): Promise<Plate[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('plates')
    .select('*')
    .eq('date', today)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching today plates:', error);
    return [];
  }

  return (data || []).map(p => ({
    ...p,
    image_url: p.photo_url,
    feedback_status: p.status,
  }));
}

// Удалить тарелку
export async function deletePlate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('plates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting plate:', error);
    return false;
  }

  return true;
}

// Получить статистику
export async function getPlatesStats(): Promise<{
  totalPlates: number;
  reviewedPlates: number;
  pendingPlates: number;
}> {
  const { data, error } = await supabase
    .from('plates')
    .select('status');

  if (error || !data) {
    return { totalPlates: 0, reviewedPlates: 0, pendingPlates: 0 };
  }

  return {
    totalPlates: data.length,
    reviewedPlates: data.filter(p => p.status === 'reviewed').length,
    pendingPlates: data.filter(p => p.status === 'pending').length,
  };
}

// Получить лучшие тарелки недели
export async function getBestPlates(): Promise<BestPlate[]> {
  const { data, error } = await supabase
    .from('best_plates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching best plates:', error);
    return [];
  }

  return data || [];
}

// Вспомогательные функции для бейджей приёмов пищи
export function getMealTypeBadge(mealType: string): { label: string; color: string; bgColor: string } {
  switch (mealType) {
    case 'breakfast':
      return { label: 'Завтрак', color: '#166534', bgColor: '#dcfce7' };
    case 'lunch':
      return { label: 'Обед', color: '#c2410c', bgColor: '#ffedd5' };
    case 'dinner':
      return { label: 'Ужин', color: '#6b21a8', bgColor: '#f3e8ff' };
    case 'snack':
      return { label: 'Перекус', color: '#be185d', bgColor: '#fce7f3' };
    default:
      return { label: 'Другое', color: '#374151', bgColor: '#f3f4f6' };
  }
}

