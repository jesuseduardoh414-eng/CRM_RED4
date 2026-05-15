import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] No se pudo inicializar el cliente Realtime. Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_KEY en el entorno.');
}

// Solo inicializamos si las variables existen para evitar que la app explote
let supabaseInstance = null;
if (supabaseUrl && supabaseKey && supabaseKey.startsWith('eyJ')) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error('Supabase init error', e);
  }
} else {
  console.error('[Supabase] Key inválida o faltante. Debe empezar con "eyJ".');
}

export const supabase = supabaseInstance;

if (!supabase) {
  console.warn('Realtime desactivado: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY en las variables de entorno.');
}
