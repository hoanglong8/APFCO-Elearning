-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  factory TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'trainer', 'director')),
  ai_champion BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  day_number INTEGER,
  order_index INTEGER,
  is_published BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  estimated_minutes INTEGER,
  department_tags TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  material_type TEXT CHECK (material_type IN ('slide', 'pdf', 'video', 'prompt', 'link')),
  file_url TEXT,
  external_url TEXT,
  order_index INTEGER,
  is_downloadable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Practices
CREATE TABLE IF NOT EXISTS workflow_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wf_code TEXT,
  description TEXT,
  prompt_template TEXT,
  sample_input TEXT,
  expected_output TEXT,
  instructions_html TEXT,
  order_index INTEGER
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT DEFAULT 'wf_practice' CHECK (assignment_type IN ('wf_practice', 'use_case', 'plan', 'quiz')),
  max_score INTEGER DEFAULT 100,
  due_date TIMESTAMPTZ,
  department_tags TEXT[],
  is_published BOOLEAN DEFAULT FALSE,
  rubric JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  prompt_used TEXT,
  ai_output TEXT,
  reflection TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
  score INTEGER,
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module Progress
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  UNIQUE(student_id, module_id)
);

-- Practice Logs
CREATE TABLE IF NOT EXISTS practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wf_id UUID REFERENCES workflow_practices(id) ON DELETE CASCADE,
  prompt_input TEXT,
  ai_output TEXT,
  tool_used TEXT,
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action Plans
CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  use_cases JSONB,
  ai_champion_nominated UUID REFERENCES profiles(id),
  committed BOOLEAN DEFAULT FALSE,
  week2_checkin TEXT,
  completed_use_cases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Reports
CREATE TABLE IF NOT EXISTS training_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('individual', 'department', 'overall', 'roi')),
  period_start DATE,
  period_end DATE,
  data JSONB,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer', 'director'))
);

-- Modules policies
CREATE POLICY "Students see published modules" ON modules FOR SELECT USING (
  is_published = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Admins manage modules" ON modules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Materials policies
CREATE POLICY "Students see materials of published modules" ON materials FOR SELECT USING (
  EXISTS (SELECT 1 FROM modules WHERE id = module_id AND (is_published OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))))
);
CREATE POLICY "Admins manage materials" ON materials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Workflow practices policies
CREATE POLICY "All users can view workflow practices" ON workflow_practices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage workflow practices" ON workflow_practices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Assignments policies
CREATE POLICY "Students see published assignments" ON assignments FOR SELECT USING (
  is_published = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Admins manage assignments" ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Submissions policies
CREATE POLICY "Students see own submissions" ON submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students manage own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own non-graded submissions" ON submissions FOR UPDATE USING (
  auth.uid() = student_id AND status IN ('draft', 'submitted')
);
CREATE POLICY "Admins see all submissions" ON submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Module progress policies
CREATE POLICY "Students manage own progress" ON module_progress FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Admins see all progress" ON module_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer', 'director'))
);

-- Practice logs policies
CREATE POLICY "Students manage own practice logs" ON practice_logs FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Admins see all practice logs" ON practice_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Action plans policies
CREATE POLICY "Students manage own action plans" ON action_plans FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Admins see all action plans" ON action_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer', 'director'))
);

-- Training reports policies
CREATE POLICY "Admins manage reports" ON training_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Directors view reports" ON training_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'director')
);
