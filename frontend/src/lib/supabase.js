import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Faltan variables de entorno para Supabase Realtime');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
