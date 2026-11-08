/**
 * Supabase configuration detector for Fatin.
 * Distinguishes between full production mode (with Supabase Auth & Database)
 * and local development mode (standalone in-memory rate limiting, no auth/database).
 */

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
    anonKey &&
    url.trim() !== "" &&
    anonKey.trim() !== "" &&
    !url.includes("your-project.supabase.co")
  );
}

export function isSupabaseServerConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return Boolean(
    isSupabaseConfigured() &&
    serviceKey &&
    serviceKey.trim() !== "" &&
    !serviceKey.includes("your-service-role-key")
  );
}
