import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: Supabase credentials not configured. Using mock client.');
  // Create a minimal mock for development
  supabase = {
    from: () => ({
      select: () => ({ data: [], error: null, single: () => ({ data: null, error: { message: 'Mock client' } }) }),
      insert: () => ({ data: [], error: null, select: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }) }),
      update: () => ({ data: [], error: null, eq: () => ({ data: [], error: null, select: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ error: null, eq: () => ({ error: null }) }),
      eq: () => ({ data: [], error: null }),
    }),
  } as unknown as SupabaseClient;
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabase };
export default supabase;

