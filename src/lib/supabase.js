import { createClient } from '@supabase/supabase-js'

// La "anon key" es pública a propósito: va en cualquier página que use
// Supabase. Lo que protege los datos son las políticas RLS de la base
// (ver supabase/migraciones/001_mesa.sql), no esconder esta llave.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://dktpjdljsmofqmmvcpkr.supabase.co'
const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdHBqZGxqc21vZnFtbXZjcGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NTU2NDUsImV4cCI6MjEwMjQzMTY0NX0.KmvSady9O9D9wcPdlEYYX9stJ4mQKf1EBVLXjgOxcRI'

export const supabase = createClient(URL, ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
