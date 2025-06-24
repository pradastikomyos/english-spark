
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'teacher');

-- Create enum for difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create teachers table
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table (extending auth.users)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  student_id VARCHAR UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table to track roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  profile_id UUID, -- Will reference either students.id or teachers.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  difficulty difficulty_level DEFAULT 'medium',
  time_limit INTEGER DEFAULT 600, -- seconds
  points_per_question INTEGER DEFAULT 10,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a VARCHAR NOT NULL,
  option_b VARCHAR NOT NULL,
  option_c VARCHAR NOT NULL,
  option_d VARCHAR NOT NULL,
  correct_answer VARCHAR NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  quiz_id UUID REFERENCES quizzes(id),
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER, -- seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  badge_icon VARCHAR,
  requirements JSONB,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_quizzes table for assignments
CREATE TABLE class_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  UNIQUE(class_id, quiz_id)
);

-- Enable Row Level Security
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_quizzes ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create helper function to get user profile id
CREATE OR REPLACE FUNCTION get_user_profile_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT profile_id FROM user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- RLS Policies for teachers
CREATE POLICY "Teachers can view their own data" ON teachers
  FOR ALL USING (id = get_user_profile_id(auth.uid()));

-- RLS Policies for classes
CREATE POLICY "Teachers can manage their classes" ON classes
  FOR ALL USING (teacher_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Students can view their class" ON classes
  FOR SELECT USING (id = (SELECT class_id FROM students WHERE id = get_user_profile_id(auth.uid())));

-- RLS Policies for students
CREATE POLICY "Teachers can manage students in their classes" ON students
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE teacher_id = get_user_profile_id(auth.uid())));

CREATE POLICY "Students can view their own data" ON students
  FOR SELECT USING (id = get_user_profile_id(auth.uid()));

CREATE POLICY "Students can update their own data" ON students
  FOR UPDATE USING (id = get_user_profile_id(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for quizzes
CREATE POLICY "Teachers can manage their quizzes" ON quizzes
  FOR ALL USING (created_by = get_user_profile_id(auth.uid()));

CREATE POLICY "Students can view assigned quizzes" ON quizzes
  FOR SELECT USING (
    id IN (
      SELECT quiz_id FROM class_quizzes 
      WHERE class_id = (SELECT class_id FROM students WHERE id = get_user_profile_id(auth.uid()))
    )
  );

-- RLS Policies for questions
CREATE POLICY "Teachers can manage questions for their quizzes" ON questions
  FOR ALL USING (quiz_id IN (SELECT id FROM quizzes WHERE created_by = get_user_profile_id(auth.uid())));

CREATE POLICY "Students can view questions for assigned quizzes" ON questions
  FOR SELECT USING (
    quiz_id IN (
      SELECT quiz_id FROM class_quizzes 
      WHERE class_id = (SELECT class_id FROM students WHERE id = get_user_profile_id(auth.uid()))
    )
  );

-- RLS Policies for user_progress
CREATE POLICY "Teachers can view progress for their students" ON user_progress
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students 
      WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = get_user_profile_id(auth.uid()))
    )
  );

CREATE POLICY "Students can manage their own progress" ON user_progress
  FOR ALL USING (student_id = get_user_profile_id(auth.uid()));

-- RLS Policies for achievements
CREATE POLICY "Everyone can view achievements" ON achievements FOR SELECT TO authenticated USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Teachers can view achievements for their students" ON user_achievements
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students 
      WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = get_user_profile_id(auth.uid()))
    )
  );

CREATE POLICY "Students can view their own achievements" ON user_achievements
  FOR SELECT USING (student_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Students can earn achievements" ON user_achievements
  FOR INSERT WITH CHECK (student_id = get_user_profile_id(auth.uid()));

-- RLS Policies for class_quizzes
CREATE POLICY "Teachers can manage class quiz assignments" ON class_quizzes
  FOR ALL USING (
    class_id IN (SELECT id FROM classes WHERE teacher_id = get_user_profile_id(auth.uid()))
  );

CREATE POLICY "Students can view their class quiz assignments" ON class_quizzes
  FOR SELECT USING (
    class_id = (SELECT class_id FROM students WHERE id = get_user_profile_id(auth.uid()))
  );

-- Insert default achievements
INSERT INTO achievements (name, description, badge_icon, requirements, points_reward) VALUES
  ('First Quiz', 'Complete your first quiz', '🎯', '{"quizzes_completed": 1}', 50),
  ('Quiz Master', 'Complete 10 quizzes', '🏆', '{"quizzes_completed": 10}', 200),
  ('Perfect Score', 'Get 100% on a quiz', '⭐', '{"perfect_scores": 1}', 100),
  ('Speed Demon', 'Complete a quiz in under 2 minutes', '⚡', '{"fast_completion": 120}', 150),
  ('Streak Keeper', 'Maintain a 7-day streak', '🔥', '{"daily_streak": 7}', 300),
  ('Persistent Learner', 'Login for 30 consecutive days', '📚', '{"login_streak": 30}', 500);

-- Create function to update student level based on points
CREATE OR REPLACE FUNCTION update_student_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = FLOOR(NEW.total_points / 100) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update level when points change
CREATE TRIGGER update_level_on_points_change
  BEFORE UPDATE ON students
  FOR EACH ROW
  WHEN (OLD.total_points IS DISTINCT FROM NEW.total_points)
  EXECUTE FUNCTION update_student_level();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called when a user signs up
  -- The role and profile creation will be handled in the application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
