import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
