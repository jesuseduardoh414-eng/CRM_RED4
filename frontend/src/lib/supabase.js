import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Solo inicializamos si las variables existen para evitar que la app explote
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn('Realtime desactivado: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY en las variables de entorno.');
}
