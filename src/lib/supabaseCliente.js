import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const claveAnonimaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico privado (solo para consola de desarrollador)
if (!urlSupabase) console.error('Error: VITE_SUPABASE_URL no detectada en Cloudflare.');
if (!claveAnonimaSupabase) console.error('Error: VITE_SUPABASE_ANON_KEY no detectada en Cloudflare.');

const esValido = !!(urlSupabase && claveAnonimaSupabase);

export const supabase = esValido ? createClient(urlSupabase, claveAnonimaSupabase) : null;
