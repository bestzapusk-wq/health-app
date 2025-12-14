import ProfileAvatar from '@/components/ProfileAvatar';
import { Text, View } from '@/components/Themed';
import {
  BestPlate,
  getBestPlates,
  getMealTypeBadge,
  getPlates,
  getTodayPlates,
  pickImage,
  Plate,
  savePlate,
  takePhoto,
  uploadPlateImage,
} from '@/lib/plates';
import {
  addRecipe,
  formatCookingTime,
  getRecipes,
  getUserLikes,
  pickRecipeImage,
  Recipe,
  toggleLike,
  uploadRecipeImage,
} from '@/lib/recipes';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Завтрак', emoji: '🍳' },
  { value: 'lunch', label: 'Обед', emoji: '🥗' },
  { value: 'dinner', label: 'Ужин', emoji: '🍲' },
  { value: 'snack', label: 'Перекус', emoji: '🍎' },
] as const;

// Демо рецепты убраны - показываем только реальные данные из БД

export default function PlatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Состояния
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [todayPlates, setTodayPlates] = useState<Plate[]>([]);
  
  // Модальное окно загрузки фото
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<typeof MEAL_TYPES[number]['value']>('lunch');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Рецепты
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  
  // Лучшие тарелки недели
  const [bestPlates, setBestPlates] = useState<BestPlate[]>([]);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeCookingTime, setRecipeCookingTime] = useState('30');
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);
  
  // Модалка просмотра рецепта
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  // Модалка просмотра отзыва
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<Plate | null>(null);
  
  // Модалка лучшей тарелки
  const [showBestPlateModal, setShowBestPlateModal] = useState(false);
  const [selectedBestPlate, setSelectedBestPlate] = useState<BestPlate | null>(null);
  
  // Уведомление об успехе
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 3000);
  };

  const openPlateFeedback = (plate: Plate) => {
    if (plate.feedback_status === 'reviewed') {
      setSelectedPlate(plate);
      setShowFeedbackModal(true);
    }
  };

  const openBestPlate = (plate: BestPlate) => {
    setSelectedBestPlate(plate);
    setShowBestPlateModal(true);
  };

  useFocusEffect(
    useCallback(() => {
      loadPlates();
    }, [])
  );

  const loadPlates = async () => {
    setLoading(true);
    try {
      const [allPlates, today, allRecipes, likes, best] = await Promise.all([
        getPlates(10),
        getTodayPlates(),
        getRecipes(10),
        getUserLikes(),
        getBestPlates(),
      ]);
      setPlates(allPlates);
      setTodayPlates(today);
      setRecipes(allRecipes);
      setUserLikes(likes);
      setBestPlates(best);
    } catch (error) {
      console.error('Error loading plates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (recipeId: string) => {
    const result = await toggleLike(recipeId);
    
    // Обновляем локальное состояние
    if (result.liked) {
      setUserLikes([...userLikes, recipeId]);
    } else {
      setUserLikes(userLikes.filter(id => id !== recipeId));
    }
    
    // Обновляем счётчик лайков
    setRecipes(recipes.map(r => 
      r.id === recipeId ? { ...r, likes_count: result.newCount } : r
    ));
  };

  const handlePickRecipeImage = async () => {
    const uri = await pickRecipeImage();
    if (uri) {
      setRecipeImage(uri);
    }
  };

  const handleAddRecipe = async () => {
    if (!recipeTitle.trim()) {
      Alert.alert('Ошибка', 'Введите название рецепта');
      return;
    }

    setSavingRecipe(true);
    try {
      let imageUrl: string | undefined;
      
      // Загружаем фото если есть
      if (recipeImage) {
        const url = await uploadRecipeImage(recipeImage);
        if (url) {
          imageUrl = url;
        }
      }
      
      const result = await addRecipe({
        title: recipeTitle.trim(),
        description: recipeDescription.trim() || undefined,
        imageUrl,
        cookingTime: parseInt(recipeCookingTime) || 30,
      });

      if (result.success) {
        showSuccess('Рецепт опубликован!');
        setShowAddRecipeModal(false);
        setRecipeTitle('');
        setRecipeDescription('');
        setRecipeCookingTime('30');
        setRecipeImage(null);
        loadPlates();
      } else {
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить рецепт');
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleOpenRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setSelectedImage(uri);
    }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setSelectedImage(uri);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Ошибка', 'Выберите фото');
      return;
    }

    setUploading(true);
    try {
      // Загружаем изображение в Storage
      const imageUrl = await uploadPlateImage(selectedImage);
      
      if (!imageUrl) {
        Alert.alert('Ошибка', 'Не удалось загрузить изображение');
        return;
      }

      // Сохраняем тарелку в БД
      const result = await savePlate({
        imageUrl,
        mealType: selectedMealType,
        description: description || undefined,
      });

      if (result.success) {
        showSuccess('Тарелка отправлена на разбор!');
        setShowUploadModal(false);
        setSelectedImage(null);
        setDescription('');
        loadPlates();
      } else {
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить тарелку');
    } finally {
      setUploading(false);
    }
  };

  const getMealEmoji = (type: string) => {
    const meal = MEAL_TYPES.find(m => m.value === type);
    return meal?.emoji || '🍽️';
  };

  const getMealLabel = (type: string) => {
    const meal = MEAL_TYPES.find(m => m.value === type);
    return meal?.label || 'Приём пищи';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)')}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Мои тарелки</Text>
            <Text style={styles.headerSubtitle}>Разборы питания</Text>
          </View>
          <ProfileAvatar size={40} />
        </View>

        {/* Уведомление об успехе */}
        {showSuccessNotification && (
          <View style={styles.successNotification}>
            <Text style={styles.successNotificationText}>✓ {successMessage}</Text>
          </View>
        )}

        {/* Лучшие тарелки недели */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 Лучшие тарелки недели</Text>
          {bestPlates.length === 0 ? (
            <View style={styles.emptyBestPlates}>
              <Text style={styles.emptyBestPlatesText}>Скоро здесь появятся лучшие тарелки!</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bestPlatesScroll}
            >
              {bestPlates.map((plate) => {
                const badge = getMealTypeBadge(plate.meal_type);
                return (
                  <TouchableOpacity 
                    key={plate.id} 
                    style={styles.bestPlateCard}
                    onPress={() => openBestPlate(plate)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bestPlateImageContainer}>
                      {plate.image_url ? (
                        <Image 
                          source={{ uri: plate.image_url }} 
                          style={styles.bestPlateImage}
                          resizeMode="cover"
                          onError={() => console.log('Image load error:', plate.image_url)}
                        />
                      ) : (
                        <View style={styles.bestPlateImagePlaceholder}>
                          <Text style={styles.bestPlateEmoji}>🍽️</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.bestPlateBadge, { backgroundColor: badge.bgColor }]}>
                      <Text style={[styles.bestPlateBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={styles.bestPlateName} numberOfLines={1}>{plate.author_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Отправить тарелку */}
        <TouchableOpacity 
          style={styles.sendButton} 
          activeOpacity={0.9}
          onPress={() => setShowUploadModal(true)}
        >
          <LinearGradient
            colors={['#22c55e', '#0d9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendGradient}
          >
            <View style={styles.sendIcon}>
              <Text style={styles.sendEmoji}>📸</Text>
            </View>
            <View style={styles.sendContent}>
              <Text style={styles.sendTitle}>Отправить тарелку</Text>
              <Text style={styles.sendSubtitle}>Разбор каждые 2 дня</Text>
            </View>
            <View style={styles.sendArrow}>
              <Text style={styles.sendArrowText}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Сегодня */}
        {todayPlates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Сегодня</Text>
            <View style={styles.todayPlatesGrid}>
              {todayPlates.map((plate) => (
                <View key={plate.id} style={styles.todayPlateItem}>
                  {plate.image_url ? (
                    <Image 
                      source={{ uri: plate.image_url }} 
                      style={styles.todayPlateImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.todayPlateImage, styles.platePlaceholder]}>
                      <Text style={styles.platePlaceholderEmoji}>🍽️</Text>
                    </View>
                  )}
                  <View style={styles.todayPlateBadge}>
                    <Text style={styles.todayPlateBadgeText}>{getMealEmoji(plate.meal_type)}</Text>
                  </View>
                </View>
              ))}
              {todayPlates.length < 4 && (
                <TouchableOpacity 
                  style={styles.addPlateButton}
                  onPress={() => setShowUploadModal(true)}
                >
                  <Text style={styles.addPlateButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Мои тарелки */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🍽️ Мои тарелки</Text>
            <Text style={styles.cardCounter}>{plates.length} фото</Text>
          </View>
          
          {/* Подпись о сроках разбора */}
          <View style={styles.reviewNote}>
            <Text style={styles.reviewNoteText}>⏱ Тарелки разбираются в течение 3-х рабочих дней</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#14b8a6" style={{ paddingVertical: 20 }} />
          ) : plates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={styles.emptyText}>Пока нет тарелок</Text>
              <Text style={styles.emptyHint}>Отправьте первое фото еды!</Text>
            </View>
          ) : (
            plates.map((plate) => (
              <TouchableOpacity
                key={plate.id}
                style={[
                  styles.plateItem,
                  plate.feedback_status === 'reviewed' ? styles.plateItemReviewed : styles.plateItemPending,
                ]}
                onPress={() => openPlateFeedback(plate)}
                activeOpacity={plate.feedback_status === 'reviewed' ? 0.7 : 1}
                disabled={plate.feedback_status !== 'reviewed'}
              >
                {plate.image_url ? (
                  <Image 
                    source={{ uri: plate.image_url }} 
                    style={styles.plateImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.plateImage, styles.platePlaceholder]}>
                    <Text style={styles.platePlaceholderEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.plateContent}>
                  <View style={styles.plateHeader}>
                    <Text style={styles.plateMeal}>{getMealLabel(plate.meal_type)}</Text>
                    <View style={[
                      styles.plateStatus,
                      plate.feedback_status === 'reviewed' ? styles.plateStatusReviewed : styles.plateStatusPending,
                    ]}>
                      <Text style={[
                        styles.plateStatusText,
                        plate.feedback_status === 'reviewed' ? styles.plateStatusTextReviewed : styles.plateStatusTextPending,
                      ]}>
                        {plate.feedback_status === 'reviewed' ? 'Разобрано ✓' : 'В очереди'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.plateDate}>{formatDate(plate.created_at)}</Text>
                  {plate.feedback_status === 'reviewed' && (
                    <Text style={styles.tapToView}>Нажмите, чтобы посмотреть разбор →</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Рецепты от участников */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👥 Рецепты от участников</Text>
            <TouchableOpacity 
              style={styles.addRecipeButton}
              onPress={() => setShowAddRecipeModal(true)}
            >
              <Text style={styles.addRecipeButtonText}>+ Добавить</Text>
            </TouchableOpacity>
          </View>

          {recipes.length === 0 ? (
            <View style={styles.emptyRecipes}>
              <Text style={styles.emptyRecipesEmoji}>📖</Text>
              <Text style={styles.emptyRecipesText}>Пока нет рецептов</Text>
              <TouchableOpacity 
                style={styles.addFirstRecipeButton}
                onPress={() => setShowAddRecipeModal(true)}
              >
                <Text style={styles.addFirstRecipeText}>Добавить первый!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recipes.slice(0, 5).map((recipe) => (
              <TouchableOpacity 
                key={recipe.id} 
                style={styles.recipeCard}
                onPress={() => handleOpenRecipe(recipe)}
                activeOpacity={0.8}
              >
                <View style={styles.recipeImagePlaceholder}>
                  {recipe.image_url ? (
                    <Image source={{ uri: recipe.image_url }} style={styles.recipeImage} />
                  ) : (
                    <Text style={styles.recipeImageEmoji}>🍽️</Text>
                  )}
                </View>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeAuthor}>от {recipe.author_name}</Text>
                  <View style={styles.recipeMeta}>
                    <Text style={styles.recipeTime}>⏱ {formatCookingTime(recipe.cooking_time)}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.likeButton,
                    userLikes.includes(recipe.id) && styles.likeButtonActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleLike(recipe.id);
                  }}
                >
                  <Text style={styles.likeButtonText}>
                    {userLikes.includes(recipe.id) ? '❤️' : '🤍'} {recipe.likes_count}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          {recipes.length > 5 && (
            <TouchableOpacity style={styles.showAllRecipesButton}>
              <Text style={styles.showAllRecipesText}>Все рецепты →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Модалка загрузки фото */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Отправить тарелку</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowUploadModal(false);
                  setSelectedImage(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Выбор фото */}
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <View style={styles.photoButtonIcon}>
                    <Text style={styles.photoButtonEmoji}>📷</Text>
                  </View>
                  <Text style={styles.photoButtonText}>Камера</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                  <View style={styles.photoButtonIcon}>
                    <Text style={styles.photoButtonEmoji}>🖼️</Text>
                  </View>
                  <Text style={styles.photoButtonText}>Галерея</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Выбор приёма пищи */}
            <Text style={styles.inputLabel}>Приём пищи</Text>
            <View style={styles.mealTypeContainer}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.value}
                  style={[
                    styles.mealTypeButton,
                    selectedMealType === meal.value && styles.mealTypeButtonActive,
                  ]}
                  onPress={() => setSelectedMealType(meal.value)}
                >
                  <Text style={styles.mealTypeEmoji}>{meal.emoji}</Text>
                  <Text style={[
                    styles.mealTypeLabel,
                    selectedMealType === meal.value && styles.mealTypeLabelActive,
                  ]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Описание */}
            <Text style={styles.inputLabel}>Комментарий (опционально)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Что в тарелке?"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
            />

            {/* Кнопка отправки */}
            <TouchableOpacity 
              style={[styles.submitButton, (!selectedImage || uploading) && styles.submitButtonDisabled]} 
              onPress={handleUpload}
              disabled={!selectedImage || uploading}
            >
              <LinearGradient
                colors={['#22c55e', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>Отправить на разбор</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модалка добавления рецепта */}
      <Modal
        visible={showAddRecipeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Добавить рецепт</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowAddRecipeModal(false);
                  setRecipeImage(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Фото рецепта */}
            <Text style={styles.inputLabel}>Фото блюда</Text>
            {recipeImage ? (
              <View style={styles.recipeImagePreview}>
                <Image source={{ uri: recipeImage }} style={styles.recipeImagePreviewImg} />
                <TouchableOpacity 
                  style={styles.removeRecipeImageButton}
                  onPress={() => setRecipeImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addRecipeImageButton}
                onPress={handlePickRecipeImage}
              >
                <Text style={styles.addRecipeImageEmoji}>📷</Text>
                <Text style={styles.addRecipeImageText}>Добавить фото</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Название блюда</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Например: Греческий салат с киноа"
              placeholderTextColor="#9ca3af"
              value={recipeTitle}
              onChangeText={setRecipeTitle}
            />

            <Text style={styles.inputLabel}>Время приготовления (минут)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="30"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={recipeCookingTime}
              onChangeText={setRecipeCookingTime}
            />

            <Text style={styles.inputLabel}>Рецепт (опционально)</Text>
            <TextInput
              style={styles.textAreaInput}
              placeholder="Опишите ингредиенты и способ приготовления..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={recipeDescription}
              onChangeText={setRecipeDescription}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitRecipeButton, savingRecipe && styles.submitRecipeButtonDisabled]}
              onPress={handleAddRecipe}
              disabled={savingRecipe}
            >
              <LinearGradient
                colors={['#22c55e', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitRecipeGradient}
              >
                {savingRecipe ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitRecipeText}>Опубликовать рецепт</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модалка просмотра рецепта */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.recipeModalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Рецепт</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowRecipeModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRecipe && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Большое фото */}
                <View style={styles.recipeModalImage}>
                  {selectedRecipe.image_url ? (
                    <Image source={{ uri: selectedRecipe.image_url }} style={styles.recipeModalImageImg} />
                  ) : (
                    <View style={styles.recipeModalImagePlaceholder}>
                      <Text style={styles.recipeModalImageEmoji}>🍽️</Text>
                    </View>
                  )}
                </View>

                {/* Название и автор */}
                <Text style={styles.recipeModalTitle}>{selectedRecipe.title}</Text>
                <Text style={styles.recipeModalAuthor}>от {selectedRecipe.author_name}</Text>

                {/* Время */}
                <View style={styles.recipeModalMeta}>
                  <Text style={styles.recipeModalTime}>⏱ {formatCookingTime(selectedRecipe.cooking_time)}</Text>
                  <Text style={styles.recipeModalLikes}>❤️ {selectedRecipe.likes_count} лайков</Text>
                </View>

                {/* Описание/рецепт */}
                {selectedRecipe.description && (
                  <View style={styles.recipeModalDescription}>
                    <Text style={styles.recipeModalDescriptionTitle}>Описание</Text>
                    <Text style={styles.recipeModalDescriptionText}>{selectedRecipe.description}</Text>
                  </View>
                )}

                {/* Кнопка лайка */}
                <TouchableOpacity 
                  style={[
                    styles.recipeModalLikeButton,
                    userLikes.includes(selectedRecipe.id) && styles.recipeModalLikeButtonActive,
                  ]}
                  onPress={() => handleToggleLike(selectedRecipe.id)}
                >
                  <Text style={styles.recipeModalLikeText}>
                    {userLikes.includes(selectedRecipe.id) ? '❤️ Вам нравится' : '🤍 Нравится'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка разбора тарелки */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            {selectedPlate && (
              <>
                <Image 
                  source={{ uri: selectedPlate.image_url }} 
                  style={styles.feedbackModalImage}
                />
                <View style={styles.feedbackModalBody}>
                  <View style={styles.feedbackModalHeader}>
                    <Text style={styles.feedbackModalMeal}>{getMealLabel(selectedPlate.meal_type)}</Text>
                    <Text style={styles.feedbackModalDate}>{formatDate(selectedPlate.created_at)}</Text>
                  </View>
                  
                  <View style={styles.feedbackStatusBadge}>
                    <Text style={styles.feedbackStatusText}>✓ Разобрано</Text>
                  </View>
                  
                  <Text style={styles.feedbackTitle}>Разбор от нутрициолога:</Text>
                  <Text style={styles.feedbackText}>
                    {selectedPlate.feedback || 'Отличный выбор продуктов! Хороший баланс белков, жиров и углеводов. Рекомендую добавить больше зелени для получения дополнительных витаминов.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка лучшей тарелки */}
      <Modal
        visible={showBestPlateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBestPlateModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBestPlateModal(false)}
        >
          <View style={styles.bestPlateModalContent}>
            {selectedBestPlate && (() => {
              const badge = getMealTypeBadge(selectedBestPlate.meal_type);
              return (
                <>
                  <View style={styles.bestPlateModalImage}>
                    {selectedBestPlate.image_url ? (
                      <Image 
                        source={{ uri: selectedBestPlate.image_url }} 
                        style={styles.bestPlateModalPhoto}
                      />
                    ) : (
                      <View style={styles.bestPlateModalPlaceholder}>
                        <Text style={styles.bestPlateModalEmoji}>🍽️</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.bestPlateModalInfo}>
                    <View style={[styles.bestPlateModalMealBadge, { backgroundColor: badge.bgColor }]}>
                      <Text style={[styles.bestPlateModalMealText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={styles.bestPlateModalAuthor}>от {selectedBestPlate.author_name}</Text>
                    <View style={styles.bestPlateModalBadge}>
                      <Text style={styles.bestPlateModalBadgeText}>🏆 Лучшая тарелка недели</Text>
                    </View>
                    {selectedBestPlate.review && (
                      <View style={styles.bestPlateModalReview}>
                        <Text style={styles.bestPlateModalReviewTitle}>Разбор тарелки:</Text>
                        <Text style={styles.bestPlateModalReviewText}>{selectedBestPlate.review}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.bestPlateModalClose}
                    onPress={() => setShowBestPlateModal(false)}
                  >
                    <Text style={styles.bestPlateModalCloseText}>Закрыть</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backIcon: {
    fontSize: 18,
    color: '#4b5563',
  },
  headerCenter: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardCounter: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bestPlatesScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  emptyBestPlates: {
    padding: 24,
    alignItems: 'center',
  },
  emptyBestPlatesText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  bestPlateCard: {
    width: 140,
    marginRight: 12,
  },
  bestPlateImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bestPlateImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestPlateEmoji: {
    fontSize: 40,
  },
  bestPlateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bestPlateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bestPlateName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  sendButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sendIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendEmoji: {
    fontSize: 24,
  },
  sendContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  sendSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  sendArrow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 8,
  },
  sendArrowText: {
    fontSize: 14,
    color: 'white',
  },
  todayPlatesGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  todayPlateItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  todayPlateImage: {
    width: '100%',
    height: '100%',
  },
  todayPlateBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  todayPlateBadgeText: {
    fontSize: 12,
  },
  addPlateButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  addPlateButtonText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  plateItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  plateItemReviewed: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  plateItemPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  plateImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  platePlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platePlaceholderEmoji: {
    fontSize: 24,
  },
  plateContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  plateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  plateMeal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  plateStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  plateStatusReviewed: {
    backgroundColor: '#bbf7d0',
  },
  plateStatusPending: {
    backgroundColor: '#fde68a',
  },
  plateStatusText: {
    fontSize: 12,
  },
  plateStatusTextReviewed: {
    color: '#15803d',
  },
  plateStatusTextPending: {
    color: '#b45309',
  },
  plateDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  plateFeedback: {
    fontSize: 12,
    marginTop: 4,
  },
  plateFeedbackReviewed: {
    color: '#15803d',
  },
  plateFeedbackPending: {
    color: '#b45309',
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6b7280',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  photoButton: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  photoButtonIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#e5e7eb',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoButtonEmoji: {
    fontSize: 24,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 16,
    color: 'white',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeButtonActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#22c55e',
  },
  mealTypeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  mealTypeLabelActive: {
    color: '#059669',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  textAreaInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    minHeight: 100,
  },
  addFirstRecipeButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addFirstRecipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  submitRecipeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitRecipeButtonDisabled: {
    opacity: 0.7,
  },
  submitRecipeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitRecipeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Рецепты
  addRecipeButton: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addRecipeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16a34a',
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  recipeImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  recipeImageEmoji: {
    fontSize: 28,
  },
  recipeContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  recipeAuthor: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  recipeTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  likeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  likeButtonActive: {
    backgroundColor: '#fef2f2',
  },
  likeButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  emptyRecipes: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
  },
  emptyRecipesEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyRecipesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyRecipesHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  showAllRecipesButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showAllRecipesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  // Фото рецепта
  recipeImagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  recipeImagePreviewImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeRecipeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRecipeImageButton: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  addRecipeImageEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  addRecipeImageText: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Модалка просмотра рецепта
  recipeModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  recipeModalImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  recipeModalImageImg: {
    width: '100%',
    height: '100%',
  },
  recipeModalImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeModalImageEmoji: {
    fontSize: 64,
  },
  recipeModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  recipeModalAuthor: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  recipeModalMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  recipeModalTime: {
    fontSize: 14,
    color: '#374151',
  },
  recipeModalLikes: {
    fontSize: 14,
    color: '#374151',
  },
  recipeModalDescription: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recipeModalDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  recipeModalDescriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  recipeModalLikeButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  recipeModalLikeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f87171',
  },
  recipeModalLikeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Уведомление об успехе
  successNotification: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successNotificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
  },
  // Подпись о сроках разбора
  reviewNote: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  reviewNoteText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  // Подсказка нажать для просмотра
  tapToView: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
    marginTop: 4,
  },
  // Лучшие тарелки - крупнее
  bestPlateImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  // Модалка разбора тарелки
  feedbackModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    width: width - 48,
    maxHeight: '80%',
  },
  feedbackModalImage: {
    width: '100%',
    height: 200,
  },
  feedbackModalBody: {
    padding: 20,
  },
  feedbackModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackModalMeal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  feedbackModalDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  feedbackStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  feedbackStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#16a34a',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
  },
  // Модалка лучшей тарелки
  bestPlateModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    width: width - 48,
    alignItems: 'center',
  },
  bestPlateModalImage: {
    width: '100%',
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestPlateModalPhoto: {
    width: '100%',
    height: '100%',
  },
  bestPlateModalEmoji: {
    fontSize: 80,
  },
  bestPlateModalInfo: {
    padding: 20,
    alignItems: 'center',
  },
  bestPlateModalMeal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bestPlateModalAuthor: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  bestPlateModalBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  bestPlateModalBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  bestPlateModalPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestPlateModalMealBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  bestPlateModalMealText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bestPlateModalReview: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  bestPlateModalReviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  bestPlateModalReviewText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  bestPlateModalClose: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  bestPlateModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
