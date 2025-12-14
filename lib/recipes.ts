import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export type Recipe = {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  description: string | null;
  image_url: string | null;
  ingredients: string[] | null; // JSONB в БД
  instructions: string | null;
  cooking_time: number; // минуты
  likes_count: number;
  created_at: string;
  updated_at: string;
};

export type RecipeLike = {
  id: string;
  user_id: string;
  recipe_id: string;
};

// Получить все рецепты
export async function getRecipes(limit: number = 20): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('likes_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }

  return data || [];
}

// Получить лайки пользователя
export async function getUserLikes(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('recipe_likes')
    .select('recipe_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user likes:', error);
    return [];
  }

  return (data || []).map(l => l.recipe_id);
}

// Лайкнуть/убрать лайк
export async function toggleLike(recipeId: string): Promise<{ liked: boolean; newCount: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { liked: false, newCount: 0 };

    // Проверяем есть ли лайк
    const { data: existingLike, error: selectError } = await supabase
      .from('recipe_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .maybeSingle(); // Используем maybeSingle вместо single чтобы избежать ошибки когда записи нет
    
    if (selectError) {
      console.error('Error checking like:', selectError);
      return { liked: false, newCount: 0 };
    }

    if (existingLike) {
      // Убираем лайк
      await supabase
        .from('recipe_likes')
        .delete()
        .eq('id', existingLike.id);

      // Уменьшаем счётчик
      const { data: recipe } = await supabase
        .from('recipes')
        .select('likes_count')
        .eq('id', recipeId)
        .single();

      const newCount = Math.max((recipe?.likes_count || 1) - 1, 0);
      await supabase
        .from('recipes')
        .update({ likes_count: newCount })
        .eq('id', recipeId);

      return { liked: false, newCount };
    } else {
      // Добавляем лайк
      const { error: insertError } = await supabase
        .from('recipe_likes')
        .insert({
          user_id: user.id,
          recipe_id: recipeId,
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return { liked: false, newCount: 0 };
      }

      // Увеличиваем счётчик
      const { data: recipe } = await supabase
        .from('recipes')
        .select('likes_count')
        .eq('id', recipeId)
        .single();

      const newCount = (recipe?.likes_count || 0) + 1;
      await supabase
        .from('recipes')
        .update({ likes_count: newCount })
        .eq('id', recipeId);

      return { liked: true, newCount };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return { liked: false, newCount: 0 };
  }
}

// Добавить рецепт
export async function addRecipe(recipe: {
  title: string;
  description?: string;
  imageUrl?: string;
  cookingTime: number;
}): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  // Получаем имя пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      author_name: profile?.full_name || 'Участник',
      title: recipe.title,
      description: recipe.description,
      image_url: recipe.imageUrl,
      cooking_time: recipe.cookingTime,
      likes_count: 0,
    });

  if (error) {
    console.error('Error adding recipe:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Форматирование времени
export function formatCookingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ч`;
  }
  return `${hours} ч ${mins} мин`;
}

// Выбрать фото рецепта
export async function pickRecipeImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

// Загрузить фото рецепта в Storage
export async function uploadRecipeImage(uri: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Конвертируем URI в blob
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `${Date.now()}.jpg`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recipes')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('recipes')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading recipe image:', error);
    return null;
  }
}

