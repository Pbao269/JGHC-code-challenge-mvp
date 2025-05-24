import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth:   { persistSession: true, autoRefreshToken: true },
  global: { headers: { "x-application-name": "usf-inventory-app" } },
  db:     { schema: "public" },
});


// LIGHT-WEIGHT CONNECTIVITY CHECK 

export async function testSupabaseConnection(): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env vars missing");
    return false;
  }

  const { error } = await supabase
    .from("locations")
    .select("id", { head: true });

  if (error) {
    console.error("Supabase connection/table check failed:", error.message);
    return false;
  }

  return true;
}
