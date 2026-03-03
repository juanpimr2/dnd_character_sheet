-- ══════════════════════════════════════════════════════════════════
-- Migración 003: Eliminar columnas de suscripción
-- Rollbook usa pago único — sin subscripciones recurrentes.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_ends_at;

-- Nota: stripe_customer_id se conserva por si hace falta en flujos futuros.
-- max_characters se conserva como campo legacy (el límite real se calcula
-- desde purchased + extra_characters en la aplicación).
