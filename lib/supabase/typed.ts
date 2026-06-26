import { createClient as createServerClientBase } from "./server";
import type {
  Profile, Module, Material, WorkflowPractice,
  Assignment, Submission, ModuleProgress, PracticeLog, ActionPlan,
} from "@/types/database.types";

// Typed wrappers that cast Supabase query results to correct types.
// This is needed because @supabase/ssr v0.12 doesn't fully propagate the Database generic.

export async function createTypedClient() {
  const supabase = await createServerClientBase();
  return {
    auth: supabase.auth,
    storage: supabase.storage,
    profiles: () => supabase.from("profiles") as any,
    modules: () => supabase.from("modules") as any,
    materials: () => supabase.from("materials") as any,
    workflow_practices: () => supabase.from("workflow_practices") as any,
    assignments: () => supabase.from("assignments") as any,
    submissions: () => supabase.from("submissions") as any,
    module_progress: () => supabase.from("module_progress") as any,
    practice_logs: () => supabase.from("practice_logs") as any,
    action_plans: () => supabase.from("action_plans") as any,
    training_reports: () => supabase.from("training_reports") as any,
    raw: supabase,
  };
}
