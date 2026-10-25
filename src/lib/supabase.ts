import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export function isPublicKey(value: string) {
  if (!value || value.includes("your-")) return false;
  if (value.startsWith("sb_secret_")) return false;
  if (value.startsWith("sb_publishable_")) return true;
  try {
    return (
      JSON.parse(
        atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ).role === "anon"
    );
  } catch {
    return false;
  }
}
export const configured =
  !!url && /^https:\/\/[\w-]+\.supabase\.co$/.test(url) && isPublicKey(key);
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
export function client() {
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  return supabase;
}
export async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client().functions.invoke(name, { body });
  if (error) {
    let code = error.message;
    try {
      const json = await error.context?.json();
      code = json?.error ?? code;
    } catch {
      /* offline or gateway error */
    }
    throw new Error(code);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
