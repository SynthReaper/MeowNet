import { createServerClient } from '@/lib/supabase/server';

/**
 * Dynamically queries a system setting from the database, falling back to a default value if not found.
 */
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('system_settings' as never)
      .select('value')
      .eq('key', key)
      .maybeSingle() as unknown as { data: { value: T } | null; error: any };

    if (error || !data) return defaultValue;
    return data.value;
  } catch {
    return defaultValue;
  }
}
