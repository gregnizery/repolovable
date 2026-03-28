const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export function getSupabaseFunctionsOrigin() {
  if (!supabaseUrl) return "";

  try {
    const url = new URL(supabaseUrl);
    return `${url.protocol}//${url.hostname.replace(".supabase.co", ".functions.supabase.co")}`;
  } catch {
    return "";
  }
}

export function getCalendarFeedUrl(token?: string | null) {
  if (!token) return null;

  const functionsOrigin = getSupabaseFunctionsOrigin();
  if (!functionsOrigin) return null;

  return `${functionsOrigin}/get-calendar-feed?token=${encodeURIComponent(token)}`;
}
