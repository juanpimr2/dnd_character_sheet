<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MapPin, Scroll, Shield, Sword, BookOpen } from 'lucide-vue-next'

const route  = useRoute()
const router = useRouter()

interface StoreInfo {
  name: string
  city: string
  referral_code: string
}

const store   = ref<StoreInfo | null>(null)
const loading = ref(true)
const notFound = ref(false)

onMounted(async () => {
  const code = (route.params.code as string).toUpperCase()
  try {
    const res = await fetch(`/api/stores/${code}`)
    if (!res.ok) { notFound.value = true; return }
    store.value = await res.json()
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function goToRegister() {
  router.push({ name: 'login', query: { ref: store.value?.referral_code, mode: 'register' } })
}

function goToLogin() {
  router.push({ name: 'login', query: { ref: store.value?.referral_code } })
}
</script>

<template>
  <div class="page">

    <!-- Loading -->
    <div v-if="loading" class="center-wrap">
      <div class="spinner" aria-label="Cargando…" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="center-wrap">
      <div class="not-found-card">
        <Shield :size="36" class="nf-icon" />
        <h1 class="nf-title">Tienda no encontrada</h1>
        <p class="nf-sub">El enlace puede haber caducado o la tienda no está activa.</p>
        <button class="btn-primary" @click="router.push('/login')">Ir a Rollbook</button>
      </div>
    </div>

    <!-- Landing -->
    <template v-else-if="store">

      <!-- Hero -->
      <section class="hero">
        <div class="hero-glow" aria-hidden="true" />

        <div class="hero-inner">

          <!-- Logo -->
          <a href="/" class="brand">
            <img src="/logo.png" alt="Rollbook" class="brand-mark" />
            <span class="brand-name">Rollbook</span>
          </a>

          <!-- Store badge -->
          <div class="store-badge">
            <MapPin :size="12" />
            {{ store.name }} · {{ store.city }}
          </div>

          <h1 class="hero-title">
            Tu ficha de personaje,<br />
            <span class="hero-accent">siempre contigo</span>
          </h1>

          <p class="hero-sub">
            Los jugadores de <strong>{{ store.name }}</strong> usan Rollbook para
            gestionar sus personajes de D&D 3.5 y Pathfinder. Gratis, desde cualquier
            dispositivo.
          </p>

          <div class="hero-cta">
            <button class="btn-primary btn-lg" @click="goToRegister">
              <Scroll :size="16" />
              Crear cuenta gratis
            </button>
            <button class="btn-ghost" @click="goToLogin">
              Ya tengo cuenta
            </button>
          </div>

        </div>
      </section>

      <!-- Features -->
      <section class="features">
        <div class="features-inner">
          <div class="feature-card">
            <div class="feature-icon"><Sword :size="22" /></div>
            <h3 class="feature-title">Ficha completa D&D 3.5 / PF</h3>
            <p class="feature-desc">
              Estadísticas, combate, habilidades, equipo, historia — todo en un
              solo lugar. Se guarda automáticamente mientras juegas.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><Shield :size="22" /></div>
            <h3 class="feature-title">Calculadora de bonificadores</h3>
            <p class="feature-desc">
              CA, tiradas de salvación y ataques calculados en tiempo real con
              las reglas de stacking de D&D 3.5.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><BookOpen :size="22" /></div>
            <h3 class="feature-title">Acceso desde cualquier sitio</h3>
            <p class="feature-desc">
              En la tienda, en casa o en el bar. Tu personaje siempre disponible
              con solo abrir el navegador.
            </p>
          </div>
        </div>
      </section>

      <!-- Footer CTA -->
      <section class="footer-cta">
        <div class="footer-cta-inner">
          <p class="footer-cta-text">
            Recomendado por <strong>{{ store.name }}</strong>
          </p>
          <button class="btn-primary btn-lg" @click="goToRegister">
            <Scroll :size="16" />
            Empezar gratis
          </button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="site-footer">
        <a href="/" class="footer-brand">Rollbook</a>
        <span class="footer-sep">·</span>
        <span class="footer-tagline">Every hero. Any world.</span>
      </footer>

    </template>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}

/* ── Loading / Not found ───────────────────────────────────────── */
.center-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.not-found-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  max-width: 340px;
  padding: 2rem;
}
.nf-icon  { color: var(--text-muted); }
.nf-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.nf-sub   { font-size: 0.85rem; color: var(--text-muted); margin: 0; line-height: 1.6; }

/* ── Hero ──────────────────────────────────────────────────────── */
.hero {
  position: relative;
  overflow: hidden;
  padding: 5rem 1.5rem 4rem;
  text-align: center;
  flex-shrink: 0;
}

.hero-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% -10%, rgba(201, 168, 76, 0.12) 0%, transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, rgba(138, 92, 200, 0.07) 0%, transparent 60%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  margin-bottom: 0.5rem;
}
.brand-mark {
  width: 38px;
  height: 38px;
  object-fit: contain;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 10px rgba(201, 168, 76, 0.35));
}
.brand-name {
  font-family: var(--font-title);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(135deg, #c9a84c 0%, #e8d183 60%, #c9a84c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Store badge */
.store-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.28rem 0.8rem;
}

/* Headline */
.hero-title {
  font-family: var(--font-title);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.01em;
}
.hero-accent {
  background: linear-gradient(135deg, #c9a84c 0%, #e8d183 60%, #c9a84c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 520px;
  margin: 0;
}

/* CTA */
.hero-cta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}

/* ── Features ──────────────────────────────────────────────────── */
.features {
  padding: 3rem 1.5rem;
  border-top: 1px solid var(--border);
}

.features-inner {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  transition: border-color var(--transition);
}
.feature-card:hover {
  border-color: var(--gold-border);
}

.feature-icon {
  color: var(--gold);
  width: 40px;
  height: 40px;
  background: rgba(201, 168, 76, 0.08);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.feature-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0;
}

/* ── Footer CTA ────────────────────────────────────────────────── */
.footer-cta {
  padding: 3rem 1.5rem;
  border-top: 1px solid var(--border);
  text-align: center;
}

.footer-cta-inner {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.footer-cta-text {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Site footer ───────────────────────────────────────────────── */
.site-footer {
  border-top: 1px solid var(--border);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.footer-brand {
  font-family: var(--font-title);
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
  text-decoration: none;
  font-size: 0.82rem;
}

.footer-sep { opacity: 0.4; }

/* ── Buttons ───────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--gold);
  color: #0d0b14;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.55rem 1.1rem;
  cursor: pointer;
  transition: opacity var(--transition);
  text-decoration: none;
}
.btn-primary:hover { opacity: 0.85; }
.btn-lg { font-size: 0.95rem; padding: 0.7rem 1.5rem; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.55rem 1.1rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-ghost:hover {
  border-color: var(--gold-border);
  color: var(--gold);
}
</style>
