-- ══════════════════════════════════════════════════════════════════
-- Migración 002: Sistema de tiendas afiliadas + monetización
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Tabla de tiendas afiliadas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  city             TEXT        NOT NULL,
  owner_email      TEXT        NOT NULL,
  referral_code    TEXT        UNIQUE NOT NULL,  -- código en el QR
  commission_rate  NUMERIC(4,2) NOT NULL DEFAULT 0.20, -- 20% por defecto
  active           BOOLEAN     NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_referral_code
  ON public.stores (referral_code);

CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Vincular perfiles a tiendas ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_id       UUID REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS store_linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_store_id
  ON public.profiles (store_id);

-- ── 3. Monetización: compra única ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS purchased              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchased_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extra_characters       INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent  TEXT;

-- Actualizar max_characters según plan/compra (calculado en app, no en BD)
-- free → 2 | purchased → 10 | purchased + extra_characters → 10 + extra_characters

-- ── 4. Vista: registros por tienda por día (para pagos de comisiones) ─
CREATE OR REPLACE VIEW public.store_daily_registrations AS
SELECT
  s.id              AS store_id,
  s.name            AS store_name,
  s.city            AS store_city,
  s.owner_email     AS store_owner_email,
  s.commission_rate,
  DATE(p.store_linked_at) AS registration_date,
  COUNT(p.id)       AS registrations
FROM public.stores s
LEFT JOIN public.profiles p
  ON p.store_id = s.id
  AND p.store_linked_at IS NOT NULL
GROUP BY s.id, s.name, s.city, s.owner_email, s.commission_rate,
         DATE(p.store_linked_at)
ORDER BY registration_date DESC, registrations DESC;

-- ── 5. RLS: las tiendas son solo de lectura para usuarios normales ─
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer tiendas activas (para validar el ref)
CREATE POLICY "stores_read_active"
  ON public.stores FOR SELECT
  USING (active = true);

-- Solo el backend (service_role) puede crear/editar/borrar tiendas
-- No se necesita policy de escritura: service_role bypassa RLS
