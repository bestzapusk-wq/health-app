import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

type QuestionType = 'number' | 'textarea' | 'yesno';

interface SurveyQuestion {
  type: QuestionType;
  text: string;
  hint?: string;
  placeholder?: string;
  image?: string;
  result?: string;
}

const surveyQuestions: SurveyQuestion[] = [
  // Текстовые вопросы (без картинок)
  { type: "number", text: "Укажите ваш вес цифрой", hint: "(пример: 62)", placeholder: "62" },
  { type: "number", text: "Укажите ваш возраст цифрой", hint: "(пример: 42)", placeholder: "42" },
  { type: "textarea", text: "Какие хронические заболевания у вас есть?", placeholder: "Опишите кратко ваши хронические состояния" },
  { type: "textarea", text: "Какие БАДы, минералы, лекарства вы принимаете?", placeholder: "Например: Витамин D3 — 4000 МЕ ежедневно" },

  // Симптомы (да/нет с картинками)
  { type: "yesno", text: "Слабость, повышенная утомляемость?", image: "https://static.tildacdn.com/tild6461-6539-4266-b730-343037346539/1.png", result: "Дефицит железа и витаминов группы B, гипотиреоз, недостаток белка и аминокислот, хронический стресс → истощение надпочечников." },
  { type: "yesno", text: "Хроническая усталость?", image: "https://static.tildacdn.com/tild3264-3735-4638-b537-363630623534/5.png", result: "Дефицит витамина D, анемия (железо/B12), низкий кортизол, нарушения сна / апноэ." },
  { type: "yesno", text: "Раздражительность, перепады настроения?", image: "https://static.tildacdn.com/tild6364-3533-4330-b339-396265613936/3.png", result: "Дефицит витаминов группы B, гипогликемия, недостаток магния, гормональный дисбаланс." },
  { type: "yesno", text: "Сухость слизистых (губы, нос, глаза)?", image: "https://static.tildacdn.com/tild3365-6430-4966-a262-636338666432/49.png", result: "Дефицит витамина A, обезвоживание, недостаток Омега-3, синдром Шегрена." },
  { type: "yesno", text: "Темные круги под глазами?", image: "https://static.tildacdn.com/tild6230-6639-4461-a336-366165303865/30.jpeg", result: "Нарушение лимфооттока, дефицит витамина C, аллергический ринит, перегрузка печени." },
  { type: "yesno", text: "Частые простуды, вирусные заболевания?", image: "https://static.tildacdn.com/tild3263-6232-4361-a565-316632363864/59.png", result: "Дефицит витамина D, низкий цинк, стресс, дисбаланс микробиоты кишечника." },
  { type: "yesno", text: "Отеки лица, век, голеней, следы от носков?", image: "https://static.tildacdn.com/tild3562-3031-4465-a264-386530376636/29.jpeg", result: "Гипотиреоз, дефицит йода/селена, венозный застой, низкий альбумин." },
  { type: "yesno", text: "Бледная кожа с зеленоватым/синюшным оттенком?", image: "https://static.tildacdn.com/tild3861-6263-4139-b637-646230613034/33.jpeg", result: "Железодефицитная анемия, дефицит B12, B9, B6, дефицит цинка." },
  { type: "yesno", text: "Желтушность ладоней и стоп?", image: "https://static.tildacdn.com/tild6461-3533-4330-b838-306233383436/34.jpeg", result: "Гипотиреоз, дефицит селена и йода, печеночная дисфункция." },
  { type: "yesno", text: "Тяга к сладкому и мучному?", image: "https://static.tildacdn.com/tild6466-3131-4366-a131-623362303562/52.jpeg", result: "Инсулинорезистентность, дефицит хрома, дисбактериоз, недосып." },
  { type: "yesno", text: "Постоянное чувство голода, даже после еды?", image: "https://static.tildacdn.com/tild3863-3035-4230-b764-346664653036/54.png", result: "Лептинорезистентность, инсулинорезистентность, скачки сахара, тревожность." },
  { type: "yesno", text: "Сниженный аппетит?", image: "https://static.tildacdn.com/tild3262-6265-4566-a336-393937383265/56.png", result: "Гипотиреоз, анемия, гипокислотность желудка, хроническое воспаление." },
  { type: "yesno", text: "Фолликулярный кератоз (гусиная кожа)?", image: "https://static.tildacdn.com/tild3936-6165-4263-a636-376631343533/37.jpeg", result: "Дефицит витамина A, E, цинка, нарушение желчевыделения." },
  { type: "yesno", text: "Родинки, папилломы, бородавки, красные пятна?", image: "https://static.tildacdn.com/tild3633-3664-4266-b738-633330643766/38.jpeg", result: "Инсулинорезистентность, нарушение детоксикации печени, вирусная нагрузка." },
  { type: "yesno", text: "Черный акантоз (темные складки кожи)?", image: "https://static.tildacdn.com/tild6336-3162-4934-a139-323962343435/40.png", result: "Инсулинорезистентность, метаболический синдром, ожирение." },
  { type: "yesno", text: "Ломкость, выпадение, тусклость волос?", image: "https://static.tildacdn.com/tild6462-3138-4166-b431-356138613434/41.jpeg", result: "Дефицит железа, цинка, селена, белка, биотина, гипотиреоз." },
  { type: "yesno", text: "Седина до 40 лет?", image: "https://static.tildacdn.com/tild3066-3862-4133-b830-343461656462/42.jpeg", result: "Дефицит меди, железа, витаминов группы B, стресс." },
  { type: "yesno", text: "Медленное заживление ран?", image: "https://static.tildacdn.com/tild6362-6264-4765-b137-613436383665/43.jpeg", result: "Дефицит витаминов A, C, D, цинка, меди, белка." },
  { type: "yesno", text: "Мышечные боли, судороги?", image: "https://static.tildacdn.com/tild3839-3631-4730-a262-653837373063/44.jpeg", result: "Дефицит магния, кальция, витамина D, обезвоживание." },
  { type: "yesno", text: "Непереносимость холода, мерзлявость?", image: "https://static.tildacdn.com/tild6234-6163-4534-b038-663763323833/45.png", result: "Гипотиреоз, дефицит йода и селена, железодефицит." },
  { type: "yesno", text: "Тошнота, тяжесть после жирной пищи?", image: "https://static.tildacdn.com/tild6438-6433-4961-b465-373938653661/61.png", result: "Застой желчи, гипокислотность желудка, перегрузка печени." },
  { type: "yesno", text: "Бурление, вздутие, тяжесть в животе?", image: "https://static.tildacdn.com/tild3061-3132-4139-b939-623333663563/62.png", result: "СИБР, дисбиоз, гипокислотность, дефицит ферментов." },
  { type: "yesno", text: "Изжога (рефлюкс)?", image: "https://static.tildacdn.com/tild6332-3265-4465-b564-613737336661/63.png", result: "Сниженная кислотность, слабый тонус кардии, стресс." },
  { type: "yesno", text: "Запоры?", image: "https://static.tildacdn.com/tild3262-6539-4238-b539-363132653030/64.png", result: "Нехватка клетчатки и воды, застой желчи, нарушения нервной регуляции." },
  { type: "yesno", text: "Боли в правом или левом подреберье?", image: "https://static.tildacdn.com/tild6166-6237-4537-b133-346331663638/65.jpeg", result: "Правое: застой желчи, воспаление печени/желчного. Левое: поджелудочная, вздутие." },
  { type: "yesno", text: "Стойкий запах в туалете?", image: "https://static.tildacdn.com/tild3061-3330-4966-a634-663562383963/67.png", result: "СИБР, дисбиоз, недостаток ферментов, паразиты." },
  { type: "yesno", text: "Регулярное подкашливание, першение?", image: "https://static.tildacdn.com/tild3437-3035-4635-a533-386436663164/68.jpeg", result: "Гипотиреоз, рефлюкс, хроническое воспаление." },
  { type: "yesno", text: "Потливость днем и ночью?", image: "https://static.tildacdn.com/tild3938-6132-4336-b431-303437333531/69.png", result: "Инсулинорезистентность, нарушения щитовидки, перегрузка лимфы." },
  { type: "yesno", text: "Жировые отложения на животе?", image: "https://static.tildacdn.com/tild6239-6265-4632-a531-656130363431/70.jpeg", result: "Инсулинорезистентность, хроническое воспаление, гормональный дисбаланс." },
  { type: "yesno", text: "Трудности с засыпанием, ночные пробуждения?", image: "https://static.tildacdn.com/tild6564-6535-4036-a339-333961663632/71.jpeg", result: "Дефицит магния, высокий кортизол, дефицит мелатонина." },
  { type: "yesno", text: "Частые пробуждения после 3-х ночи?", image: "https://static.tildacdn.com/tild3261-3262-4765-b466-376233616231/a0f81a97-05f.webp", result: "Проблемы с печенью, низкий сахар, высокий кортизол." },
  { type: "yesno", text: "Слабость и головокружение при вставании?", image: "https://static.tildacdn.com/tild3138-3735-4034-b033-623133376639/7.png", result: "Ортостатическая гипотензия, железодефицит, надпочечниковая дисфункция." },
  { type: "yesno", text: "Апатия, потеря интереса, низкая мотивация?", image: "https://static.tildacdn.com/tild6562-6531-4364-b364-323935383837/9.png", result: "Гипотиреоз, дефицит йода, селена, витаминов группы B, стресс." },
  { type: "yesno", text: "Депрессия, подавленность?", image: "https://static.tildacdn.com/tild3538-6332-4262-b564-383736643266/10.png", result: "Дефицит витамина D, Омега-3, снижение серотонина." },
  { type: "yesno", text: "Сухая, шелушащаяся кожа, трещины?", image: "https://static.tildacdn.com/tild3861-3139-4462-a566-326264376139/16.jpeg", result: "Железодефицит, дефицит Омега-3, гипотиреоз, дефицит A и C." },
  { type: "yesno", text: "Красный воспалённый язык?", image: "https://static.tildacdn.com/tild6637-3338-4131-a466-373934313766/19.jpg", result: "Дефицит витаминов группы B, цинка, железа, кандидоз." },
  { type: "yesno", text: "Белый налёт на языке?", image: "https://static.tildacdn.com/tild6435-3230-4638-b737-386630396462/20.jpeg", result: "Дисбиоз, застой желчи, гипокислотность, избыток сахара." },
  { type: "yesno", text: "Плоский, «географический» язык?", image: "https://static.tildacdn.com/tild3738-3563-4664-a362-343464306264/23.jpg", result: "Дефицит железа, витаминов группы B, анемия, хроническое воспаление ЖКТ." },
  { type: "yesno", text: "Горечь во рту?", image: "https://static.tildacdn.com/tild3362-3930-4135-b063-376433316333/d579712834c914f03601.png", result: "Застой желчи, перегрузка печени, рефлюкс, дисбаланс микробиоты." },
  { type: "yesno", text: "Постоянный насморк или заложенность носа?", image: "https://static.tildacdn.com/tild3034-3564-4638-b362-306665373665/Frontit_simptomy.jpg", result: "Аллергия, хроническое воспаление ЛОР-органов, нарушение лимфооттока." },
  { type: "yesno", text: "Хронические синуситы, гаймориты?", image: "https://static.tildacdn.com/tild3230-3731-4334-b864-626661383132/AA1CGhSg.jpg", result: "Иммунодефицит, дефицит цинка и витамина C, системное воспаление." },
  { type: "yesno", text: "Частое урчание в животе после еды?", image: "https://static.tildacdn.com/tild3133-6436-4732-b764-386438666362/i.webp", result: "СИБР, дисбиоз, дефицит ферментов, быстрые углеводы." },
  { type: "yesno", text: "Плохой запах изо рта?", image: "https://static.tildacdn.com/tild6338-6565-4638-b136-393466633435/i_1.webp", result: "Гипокислотность, дисбиоз кишечника, перегрузка печени, хронический тонзиллит." },
  { type: "yesno", text: "Панические атаки, тревожность?", image: "https://static.tildacdn.com/tild6336-3637-4565-a366-343532386362/i_4.webp", result: "Дефицит витаминов группы B, магния, гормональный дисбаланс, интоксикация." },
  { type: "yesno", text: "Холодные конечности?", image: "https://static.tildacdn.com/tild6632-3834-4963-a164-323238356464/i_6.webp", result: "Гипотиреоз, низкое давление, дефицит железа, слабая микроциркуляция." },
  { type: "yesno", text: "Избыточный вес, несмотря на дефицит калорий?", image: "https://static.tildacdn.com/tild6530-3362-4965-b337-343132653466/scale_1200_1.jpg", result: "Гипотиреоз, инсулинорезистентность, хронический стресс, воспаление тканей." },
  { type: "yesno", text: "Отёчность тела к вечеру?", image: "https://static.tildacdn.com/tild6264-3565-4961-a636-363037646234/i_7.webp", result: "Застой лимфы, слабая работа почек/надпочечников, венозный застой, воспаление." },
  { type: "yesno", text: "Проблемы с концентрацией и памятью?", image: "https://static.tildacdn.com/tild6161-3330-4562-a238-336332653739/i_8.webp", result: "Дефицит B12, B1, B9, железа, цинка, йода, гипоксия мозга, стресс." },
  { type: "yesno", text: "Выпадение ресниц и бровей?", image: "https://static.tildacdn.com/tild3634-6461-4336-a337-303738343938/i_10.webp", result: "Гипотиреоз, железодефицит, аутоиммунные процессы, дефицит A и E." }
];

export default function HealthSurveyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [symptoms, setSymptoms] = useState<{ name: string; result: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = surveyQuestions[currentIndex];
  const progress = ((currentIndex + 1) / surveyQuestions.length) * 100;

  const handleNext = () => {
    if (currentQuestion.type === 'number' || currentQuestion.type === 'textarea') {
      // Сохраняем ответ
      setAnswers(prev => ({ ...prev, [currentIndex]: inputValue }));
      setInputValue('');
    }
    
    if (currentIndex < surveyQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Завершаем опросник
      finishSurvey();
    }
  };

  const handleYesNo = (isYes: boolean) => {
    // Сохраняем ответ
    setAnswers(prev => ({ ...prev, [currentIndex]: isYes ? 'yes' : 'no' }));
    
    // Если "Да" - добавляем симптом
    if (isYes && currentQuestion.result) {
      setSymptoms(prev => [...prev, { 
        name: currentQuestion.text, 
        result: currentQuestion.result! 
      }]);
    }
    
    if (currentIndex < surveyQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Завершаем опросник
      finishSurvey();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Восстанавливаем предыдущий ответ если он был
      const prevAnswer = answers[currentIndex - 1];
      if (prevAnswer && surveyQuestions[currentIndex - 1].type !== 'yesno') {
        setInputValue(prevAnswer);
      } else {
        setInputValue('');
      }
    }
  };

  const finishSurvey = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        router.back();
        return;
      }

      console.log('Saving survey results for user:', user.id);
      console.log('Total symptoms found:', symptoms.length);

      // Подсчитываем score: 100 - (количество симптомов * 2), минимум 0
      const healthScore = Math.max(0, 100 - (symptoms.length * 2));
      const totalQuestions = surveyQuestions.length;

      // 1. Сначала удаляем старые отклонения пользователя
      const { error: deleteError } = await supabase
        .from('health_deviations')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Error deleting old deviations:', deleteError);
        // Продолжаем даже если удаление не удалось
      }

      // 2. Сохраняем результат опросника (upsert)
      const { error: resultError } = await supabase
        .from('health_survey_results')
        .upsert({
          user_id: user.id,
          total_score: healthScore,
          max_score: 100,
          answers: answers,
          completed_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id' 
        });

      if (resultError) {
        console.error('Error saving survey result:', resultError);
        throw new Error('Не удалось сохранить результат опросника: ' + resultError.message);
      }

      console.log('Survey result saved successfully');

      // 3. Сохраняем новые отклонения (симптомы где ответили "Да")
      if (symptoms.length > 0) {
        const deviationsToInsert = symptoms.map(symptom => ({
          user_id: user.id,
          name: symptom.name,
          description: symptom.result,
          severity: getSeverityFromSymptom(symptom.name),
          is_resolved: false,
        }));

        console.log('Inserting deviations:', deviationsToInsert.length);

        const { error: devError } = await supabase
          .from('health_deviations')
          .insert(deviationsToInsert);

        if (devError) {
          console.error('Error saving deviations:', devError);
          // Не прерываем - результат уже сохранён
        } else {
          console.log('Deviations saved successfully');
        }
      }

      setCompleted(true);
    } catch (error) {
      console.error('Error saving survey:', error);
      // Показываем ошибку пользователю
      if (error instanceof Error) {
        alert('Ошибка: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Определяем severity на основе ключевых слов в симптоме
  const getSeverityFromSymptom = (symptomName: string): 'low' | 'medium' | 'high' => {
    const highKeywords = ['депрессия', 'панические', 'хроническая усталость', 'анемия', 'гипотиреоз'];
    const mediumKeywords = ['боли', 'запоры', 'изжога', 'тревожность', 'выпадение'];
    
    const lowerName = symptomName.toLowerCase();
    
    if (highKeywords.some(kw => lowerName.includes(kw))) return 'high';
    if (mediumKeywords.some(kw => lowerName.includes(kw))) return 'medium';
    return 'low';
  };

  const handleFinish = () => {
    router.replace('/(tabs)/health');
  };

  // Экран завершения
  if (completed) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>✅</Text>
          <Text style={styles.completedTitle}>Опросник пройден!</Text>
          <Text style={styles.completedSubtitle}>
            Ваши ответы сохранены. Теперь вы можете увидеть свой индекс здоровья.
          </Text>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <LinearGradient
              colors={['#22c55e', '#0d9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.finishButtonGradient}
            >
              <Text style={styles.finishButtonText}>Посмотреть результаты</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Экран сохранения
  if (saving) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.savingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.savingText}>Сохраняем результаты...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Интегральный опросник</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Вопрос {currentIndex + 1} из {surveyQuestions.length}
        </Text>
      </View>

      {/* Question Card */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          {/* Image (if exists) */}
          {currentQuestion.image && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: currentQuestion.image }} 
                style={styles.questionImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          
          {/* Hint */}
          {currentQuestion.hint && (
            <Text style={styles.questionHint}>{currentQuestion.hint}</Text>
          )}

          {/* Input for number/textarea */}
          {(currentQuestion.type === 'number' || currentQuestion.type === 'textarea') && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  currentQuestion.type === 'textarea' && styles.textareaInput
                ]}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="#9ca3af"
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType={currentQuestion.type === 'number' ? 'numeric' : 'default'}
                multiline={currentQuestion.type === 'textarea'}
                numberOfLines={currentQuestion.type === 'textarea' ? 4 : 1}
                textAlignVertical={currentQuestion.type === 'textarea' ? 'top' : 'center'}
              />
              <TouchableOpacity 
                style={[styles.nextButton, !inputValue.trim() && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={!inputValue.trim()}
              >
                <Text style={styles.nextButtonText}>Далее →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Yes/No buttons */}
          {currentQuestion.type === 'yesno' && (
            <View style={styles.yesNoContainer}>
              <TouchableOpacity 
                style={styles.noButton}
                onPress={() => handleYesNo(false)}
              >
                <Text style={styles.noButtonEmoji}>🟢</Text>
                <Text style={styles.noButtonText}>Нет, не про меня</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.yesButton}
                onPress={() => handleYesNo(true)}
              >
                <Text style={styles.yesButtonEmoji}>🔴</Text>
                <Text style={styles.yesButtonText}>Да, это про меня</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Back button */}
      {currentIndex > 0 && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerPlaceholder: {
    width: 36,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  questionImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  questionHint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  textareaInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  nextButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  noButton: {
    flex: 1,
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  noButtonEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  noButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
  },
  yesButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  yesButtonEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  yesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButtonText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  // Completed screen
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  completedEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  finishButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  finishButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  // Saving screen
  savingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  savingText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

