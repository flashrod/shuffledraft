import { createBrowserClient, createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser (client component) Supabase client with anonymous auth. */
export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Server Supabase client (Server Components / Route Handlers). */
export async function createServerSupabaseClient() {
  return createServerClient(supabaseUrl as any, supabaseAnonKey as any, {
    cookies: { getAll: () => [] } as any,
  });
}

/** Sign in anonymously (no sign-up needed). Returns the auth user id. */
export async function signInAnonymously(supabase: ReturnType<typeof createBrowserSupabaseClient>) {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user?.id;
}
