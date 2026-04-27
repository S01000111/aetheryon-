import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const claveAnonimaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

const esValido = !!(urlSupabase && claveAnonimaSupabase);

export const supabase = esValido ? createClient(urlSupabase, claveAnonimaSupabase) : null;
