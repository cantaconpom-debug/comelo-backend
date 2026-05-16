import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://rqlgqwsugfysjlerfbfd.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_1xjb8i18_YUC952gmI6Hdw_Cz_uyGsU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
