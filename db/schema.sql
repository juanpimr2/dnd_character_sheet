-- ══════════════════════════════════════════════════════════════════
-- D&D Character Sheet Manager — Database Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════


-- ── 1. Perfiles de usuario ────────────────────────────────────────
--    Extiende auth.users de Supabase con datos de la app
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT        UNIQUE NOT NULL,

  -- Plan de suscripción (para monetización futura)
  plan                 TEXT        NOT NULL DEFAULT 'free'
                                   CHECK (plan IN ('free', 'player', 'dm', 'table')),
  max_characters       INT         NOT NULL DEFAULT 2,

  -- Stripe (se rellena cuando el usuario paga)
  stripe_customer_id   TEXT,
  subscription_status  TEXT        NOT NULL DEFAULT 'inactive',
  subscription_ends_at TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.profiles.plan IS
  'free=2 personajes | player=ilimitados | dm=vista DM | table=grupo completo';


-- ── 2. Personajes ─────────────────────────────────────────────────
--    El JSON completo del personaje vive en `data` (JSONB).
--    `name` se duplica al nivel superior para listados rápidos.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.characters (
  id         TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'Sin nombre',
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, owner_id)
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_chars_owner
  ON public.characters (owner_id);
CREATE INDEX IF NOT EXISTS idx_chars_owner_updated
  ON public.characters (owner_id, updated_at DESC);


-- ── 3. Row Level Security ─────────────────────────────────────────
--    La BBDD misma bloquea accesos cruzados entre usuarios.
--    El backend usa service_role (bypassa RLS para operaciones admin).
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario solo ve y edita su propio perfil
CREATE POLICY "profiles_self"
  ON public.profiles FOR ALL
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Characters: cada usuario solo accede a sus propios personajes
CREATE POLICY "characters_owner"
  ON public.characters FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());


-- ── 4. Trigger: crear perfil automáticamente al registrarse ───────
--    Se ejecuta después de INSERT en auth.users
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_uname  TEXT;
  final_uname TEXT;
  counter     INT := 0;
BEGIN
  -- Derivar username del email: "juan.perez@gmail.com" → "juan_perez"
  base_uname  := LOWER(SPLIT_PART(NEW.email, '@', 1));
  base_uname  := REGEXP_REPLACE(base_uname, '[^a-z0-9_]', '_', 'g');
  final_uname := base_uname;

  -- Resolver conflictos: si "juan" existe, probar "juan_1", "juan_2"…
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_uname) LOOP
    counter     := counter + 1;
    final_uname := base_uname || '_' || counter;
  END LOOP;

  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, final_uname);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 5. Trigger: updated_at automático ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════
-- NOTAS DE DESPLIEGUE
-- ══════════════════════════════════════════════════════════════════
--
-- Variables de entorno necesarias:
--
--   FRONTEND (.env):
--     VITE_SUPABASE_URL      = https://xxxx.supabase.co
--     VITE_SUPABASE_ANON_KEY = eyJ...
--
--   BACKEND (.env):
--     SUPABASE_URL              = https://xxxx.supabase.co
--     SUPABASE_SERVICE_ROLE_KEY = eyJ...  ← NUNCA exponer en frontend
--     PORT                      = 3000
--     ALLOWED_ORIGIN            = https://tu-frontend.onrender.com
--
-- Límites del plan FREE de Supabase:
--   - 500 MB PostgreSQL
--   - 50.000 usuarios activos/mes
--   - 1 GB Storage
--
-- ATENCIÓN: los retratos (base64 en data JSONB) pueden ser >1MB por fila.
--   Si hay problemas, migrar portraits a Supabase Storage.
-- ══════════════════════════════════════════════════════════════════
