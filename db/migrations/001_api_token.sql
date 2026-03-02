-- ══════════════════════════════════════════════════════════════════
-- Migración 001: API Token por usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- Añadir columna api_token a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS api_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Generar token para perfiles que ya existen sin él
UPDATE public.profiles
  SET api_token = gen_random_uuid()
  WHERE api_token IS NULL;

-- Índice para búsquedas rápidas por token (el middleware lo usará en cada request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_api_token
  ON public.profiles (api_token);

-- La policy RLS actual (profiles_self) ya cubre este campo.
-- El backend usa service_role y bypassa RLS al buscar por token.
