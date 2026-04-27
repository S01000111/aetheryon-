import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const claveAnonimaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Solo inicializar si las claves son válidas para evitar romper el sitio
const esValido = urlSupabase && urlSupabase.startsWith('http') && claveAnonimaSupabase && claveAnonimaSupabase !== 'TU_CLAVE_ANONIMA_AQUI';

export const supabase = esValido ? createClient(urlSupabase, claveAnonimaSupabase) : null;
