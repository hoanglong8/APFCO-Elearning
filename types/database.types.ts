export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id">>;
      };
      modules: {
        Row: Module;
        Insert: Omit<Module, "id" | "created_at">;
        Update: Partial<Omit<Module, "id">>;
      };
      materials: {
        Row: Material;
        Insert: Omit<Material, "id" | "created_at">;
        Update: Partial<Omit<Material, "id">>;
      };
      workflow_practices: {
        Row: WorkflowPractice;
        Insert: Omit<WorkflowPractice, "id">;
        Update: Partial<Omit<WorkflowPractice, "id">>;
      };
      assignments: {
        Row: Assignment;
        Insert: Omit<Assignment, "id" | "created_at">;
        Update: Partial<Omit<Assignment, "id">>;
      };
      submissions: {
        Row: Submission;
        Insert: Omit<Submission, "id" | "created_at">;
        Update: Partial<Omit<Submission, "id">>;
      };
      module_progress: {
        Row: ModuleProgress;
        Insert: Omit<ModuleProgress, "id">;
        Update: Partial<Omit<ModuleProgress, "id">>;
      };
      practice_logs: {
        Row: PracticeLog;
        Insert: Omit<PracticeLog, "id" | "created_at">;
        Update: Partial<Omit<PracticeLog, "id">>;
      };
      action_plans: {
        Row: ActionPlan;
        Insert: Omit<ActionPlan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ActionPlan, "id">>;
      };
      training_reports: {
        Row: TrainingReport;
        Insert: Omit<TrainingReport, "id" | "created_at">;
        Update: Partial<Omit<TrainingReport, "id">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  factory: string | null;
  role: "student" | "admin" | "trainer" | "director";
  ai_champion: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Module = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  day_number: number | null;
  order_index: number | null;
  is_published: boolean;
  thumbnail_url: string | null;
  estimated_minutes: number | null;
  department_tags: string[] | null;
  created_by: string | null;
  created_at: string;
};

export type Material = {
  id: string;
  module_id: string;
  title: string;
  material_type: "slide" | "pdf" | "video" | "prompt" | "link";
  file_url: string | null;
  external_url: string | null;
  order_index: number | null;
  is_downloadable: boolean;
  created_at: string;
};

export type WorkflowPractice = {
  id: string;
  module_id: string | null;
  title: string;
  wf_code: string | null;
  description: string | null;
  prompt_template: string | null;
  sample_input: string | null;
  expected_output: string | null;
  instructions_html: string | null;
  order_index: number | null;
};

export type Assignment = {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  assignment_type: "wf_practice" | "use_case" | "plan" | "quiz";
  max_score: number;
  due_date: string | null;
  department_tags: string[] | null;
  is_published: boolean;
  rubric: RubricItem[] | null;
  quiz_questions: QuizQuestion[] | null;
  attachments: AssignmentAttachment[] | null;
  created_by: string | null;
  created_at: string;
};

export type AssignmentAttachment = {
  url: string;
  name: string;
};

export type RubricItem = {
  criterion: string;
  max_score: number;
  description: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  file_url: string | null;
  prompt_used: string | null;
  ai_output: string | null;
  reflection: string | null;
  status: "draft" | "submitted" | "graded" | "returned";
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  is_late: boolean;
  submitted_at: string | null;
  quiz_answers: number[] | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type ModuleProgress = {
  id: string;
  student_id: string;
  module_id: string;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
  time_spent_minutes: number;
};

export type PracticeLog = {
  id: string;
  student_id: string;
  wf_id: string;
  prompt_input: string | null;
  ai_output: string | null;
  tool_used: string | null;
  self_rating: number | null;
  notes: string | null;
  created_at: string;
};

export type ActionPlan = {
  id: string;
  student_id: string;
  use_cases: UseCase[] | null;
  ai_champion_nominated: string | null;
  committed: boolean;
  week2_checkin: string | null;
  completed_use_cases: number;
  created_at: string;
  updated_at: string;
};

export type UseCase = {
  title: string;
  tool: string;
  frequency: string;
  expected_outcome: string;
  status: "planned" | "in_progress" | "done";
};

export type TrainingReport = {
  id: string;
  title: string;
  report_type: "individual" | "department" | "overall" | "roi";
  period_start: string | null;
  period_end: string | null;
  data: Json;
  generated_by: string | null;
  created_at: string;
};
