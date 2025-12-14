-- =============================================
-- HEALTH CLUB - СХЕМА БАЗЫ ДАННЫХ
-- Выполни этот SQL в Supabase SQL Editor
-- =============================================

-- 1. PROFILES (Профили пользователей)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT, -- WhatsApp номер
  avatar_url TEXT,
  height INTEGER, -- рост в см
  weight INTEGER, -- вес в кг
  age INTEGER,
  streak INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  plan_progress INTEGER DEFAULT 0,
  plan_total INTEGER DEFAULT 7,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 HEALTH_INDICATORS (Показатели анализов)
-- =============================================
CREATE TABLE IF NOT EXISTS health_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vitamin_d DECIMAL,
  ferritin DECIMAL,
  iron DECIMAL,
  hemoglobin DECIMAL,
  b12 DECIMAL,
  tsh DECIMAL,
  t4_free DECIMAL,
  glucose DECIMAL,
  cholesterol DECIMAL,
  folate DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE health_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own indicators"
  ON health_indicators FOR ALL
  USING (auth.uid() = user_id);

-- Автоматическое создание профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для новых пользователей
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свой профиль"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Пользователи редактируют свой профиль"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. DIARY_ENTRIES (Записи дневника)
-- =============================================
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  water INTEGER CHECK (water >= 0 AND water <= 12) DEFAULT 0,
  sleep INTEGER CHECK (sleep >= 1 AND sleep <= 5),
  stress INTEGER CHECK (stress >= 1 AND stress <= 5),
  activity INTEGER DEFAULT 0, -- минуты активности
  supplements JSONB DEFAULT '[]'::jsonb, -- массив принятых БАДов
  note TEXT,
  weekly_goal_current INTEGER DEFAULT 0,
  weekly_goal_target INTEGER DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Одна запись на день на пользователя
  UNIQUE(user_id, date)
);

-- Индекс для быстрого поиска по дате
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date 
  ON diary_entries(user_id, date DESC);

-- RLS для diary_entries
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои записи дневника"
  ON diary_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи создают свои записи"
  ON diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи редактируют свои записи"
  ON diary_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют свои записи"
  ON diary_entries FOR DELETE
  USING (auth.uid() = user_id);

-- 3. HEALTH_RECORDS (Анализы и медицинские записи)
-- =============================================
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Данные показателя
  indicator_name TEXT NOT NULL, -- 'Витамин D', 'ТТГ', 'Железо', etc.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL, -- 'нг/мл', 'мМЕ/л', etc.
  reference_min NUMERIC,
  reference_max NUMERIC,
  
  -- Статус: normal, low, high, critical
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'low', 'high', 'critical')),
  
  -- Дата анализа
  test_date DATE DEFAULT CURRENT_DATE,
  
  -- Для загрузки файлов
  file_url TEXT,
  file_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска
CREATE INDEX IF NOT EXISTS idx_health_records_user 
  ON health_records(user_id, date DESC);

-- RLS для health_records
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои записи здоровья"
  ON health_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи создают записи здоровья"
  ON health_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи редактируют записи здоровья"
  ON health_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют записи здоровья"
  ON health_records FOR DELETE
  USING (auth.uid() = user_id);

-- 4. PLATES (Фото тарелок)
-- =============================================
CREATE TABLE IF NOT EXISTS plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  date DATE DEFAULT CURRENT_DATE,
  
  -- Для "лучших тарелок недели"
  is_featured BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_plates_user ON plates(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_plates_featured ON plates(is_featured, created_at DESC);

-- RLS для plates
ALTER TABLE plates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои тарелки"
  ON plates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи видят лучшие тарелки"
  ON plates FOR SELECT
  USING (is_featured = TRUE);

CREATE POLICY "Пользователи создают тарелки"
  ON plates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи редактируют свои тарелки"
  ON plates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют свои тарелки"
  ON plates FOR DELETE
  USING (auth.uid() = user_id);

-- 5. STREAMS (Эфиры)
-- =============================================
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  doctor_name TEXT,
  doctor_specialty TEXT,
  
  -- Время эфира
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  
  -- Статус
  is_live BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Запись
  recording_url TEXT,
  duration_minutes INTEGER,
  views_count INTEGER DEFAULT 0,
  
  -- Превью
  thumbnail_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для расписания
CREATE INDEX IF NOT EXISTS idx_streams_schedule 
  ON streams(scheduled_date, scheduled_time);

-- RLS для streams (все могут видеть)
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все авторизованные видят эфиры"
  ON streams FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. STREAM_QUESTIONS (Вопросы к эфирам)
-- =============================================
CREATE TABLE IF NOT EXISTS stream_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS для вопросов
ALTER TABLE stream_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои вопросы"
  ON stream_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи создают вопросы"
  ON stream_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. RECIPES (Рецепты от участников)
-- =============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL, -- имя автора для отображения
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT,
  cooking_time INTEGER DEFAULT 30, -- минуты
  likes_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS для recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят рецепты"
  ON recipes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Пользователи создают рецепты"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Авторы редактируют свои рецепты"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Авторы удаляют свои рецепты"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- 8. FAMILY_MEMBERS (Члены семьи)
-- =============================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relation TEXT NOT NULL, -- 'child', 'spouse', 'parent', etc.
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS для family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят своих членов семьи"
  ON family_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи добавляют членов семьи"
  ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи редактируют членов семьи"
  ON family_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют членов семьи"
  ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- 9. RECIPE_LIKES (Лайки рецептов)
-- =============================================
CREATE TABLE IF NOT EXISTS recipe_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(recipe_id, user_id)
);

-- RLS для лайков
ALTER TABLE recipe_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят лайки"
  ON recipe_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Пользователи ставят лайки"
  ON recipe_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи убирают лайки"
  ON recipe_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- =============================================

-- Обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_health_records_updated_at
  BEFORE UPDATE ON health_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plates_updated_at
  BEFORE UPDATE ON plates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_streams_updated_at
  BEFORE UPDATE ON streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Функция подсчёта streak
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    IF EXISTS (
      SELECT 1 FROM diary_entries 
      WHERE user_id = p_user_id AND date = check_date
    ) THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- 10. WAITLIST (Лист ожидания интенсивов)
-- =============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, course_id)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свой waitlist"
  ON waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи добавляют в waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Лучшие тарелки недели
-- =============================================
CREATE TABLE IF NOT EXISTS best_plates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  author_name TEXT NOT NULL,
  review TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE best_plates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Best plates доступны всем"
  ON best_plates FOR SELECT
  USING (true);

-- =============================================
-- Результаты опросника здоровья (75 вопросов)
-- =============================================
CREATE TABLE IF NOT EXISTS health_survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 750,
  answers JSONB, -- Ответы на все вопросы
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE health_survey_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои результаты опросника"
  ON health_survey_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи добавляют результаты опросника"
  ON health_survey_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи обновляют результаты опросника"
  ON health_survey_results FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- Отклонения здоровья (выявленные по опроснику)
-- =============================================
CREATE TABLE IF NOT EXISTS health_deviations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  category TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE health_deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои отклонения"
  ON health_deviations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи добавляют отклонения"
  ON health_deviations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи обновляют отклонения"
  ON health_deviations FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- ГОТОВО! 
-- Теперь создай Storage buckets в Supabase Dashboard:
-- 1. avatars - для аватаров пользователей
-- 2. plates - для фото тарелок
-- 3. health-files - для файлов анализов
-- 4. recipes - для фото рецептов
-- =============================================

