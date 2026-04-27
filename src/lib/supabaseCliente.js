import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const claveAnonimaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log de depuración: Lista las variables de entorno detectadas que empiezan por VITE_
console.log('Variables VITE detectadas:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

const esValido = !!(urlSupabase && claveAnonimaSupabase);

export const supabase = esValido ? createClient(urlSupabase, claveAnonimaSupabase) : null;
