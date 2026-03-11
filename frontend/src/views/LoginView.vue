<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StoreRegisterModal from '@/components/StoreRegisterModal.vue'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

type Mode = 'login' | 'register'
const mode = ref<Mode>('login')

const email         = ref('')
const password      = ref('')
const confirm       = ref('')
const loading       = ref(false)
const loadingGoogle = ref(false)
const error         = ref('')
const success       = ref('')

const isLogin         = computed(() => mode.value === 'login')
const storeName       = ref<string | null>(null)
const showStoreModal  = ref(false)

function switchMode(m: Mode) {
  mode.value     = m
  error.value    = ''
  success.value  = ''
  password.value = ''
  confirm.value  = ''
}

async function handleSubmit(): Promise<void> {
  error.value   = ''
  success.value = ''

  if (!email.value.trim() || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }
  if (!isLogin.value && password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  if (!isLogin.value && password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  loading.value = true

  if (isLogin.value) {
    const err = await authStore.login(email.value.trim(), password.value)
    loading.value = false
    if (err) { error.value = err; return }
    const redirect = route.query.redirect as string | undefined
    router.push(redirect && redirect !== '/login' ? redirect : { name: 'characters' })
  } else {
    const err = await authStore.register(email.value.trim(), password.value)
    loading.value = false
    if (err) { error.value = err; return }
    if (authStore.isAuthenticated) {
      router.push({ name: 'characters' })
    } else {
      success.value = 'Account created. Check your email to confirm.'
      switchMode('login')
    }
  }
}

onMounted(async () => {
  const ref = route.query.ref as string | undefined
  if (ref) {
    localStorage.setItem('dnd_store_ref', ref)
    try {
      const res = await fetch(`/api/stores/${ref}`)
      if (res.ok) {
        const data = await res.json()
        storeName.value = data.name
      }
    } catch { /* ignore — banner is optional */ }
  }
  if (route.query.mode === 'register') mode.value = 'register'
})

async function handleGoogle(): Promise<void> {
  loadingGoogle.value = true
  error.value = ''
  const err = await authStore.loginWithGoogle()
  if (err) {
    error.value = err
    loadingGoogle.value = false
  }
}
</script>

<template>
  <div class="grimoire">

    <!-- ══ PÁGINA IZQUIERDA — El mundo ══ -->
    <div class="page-left">
      <!-- Fondo dungeon hall -->
      <div class="hero-bg" aria-hidden="true"></div>
      <!-- Overlay gradiente para que el contenido sea legible -->
      <div class="hero-overlay" aria-hidden="true"></div>

      <!-- Contenido de la página izquierda -->
      <div class="hero-content">

        <!-- Logo -->
        <div class="hero-logo">
          <img src="/logo_nobg.png" alt="Rollbook emblem" class="hero-logo-img" />
        </div>

        <h1 class="hero-title">Rollbook</h1>
        <p class="hero-tagline">Every hero. Any world.</p>

        <!-- Divisor -->
        <div class="hero-divider" aria-hidden="true">
          <span class="divider-line"></span>
          <span class="divider-diamond"></span>
          <span class="divider-line"></span>
        </div>

        <!-- Feature list -->
        <ul class="hero-features">
          <li>
            <span class="feat-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><polygon points="8,1 14,5 12,13 4,13 2,5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
            </span>
            Full character sheets for D&amp;D 3.5e, Pathfinder 1e and D&amp;D 5e
          </li>
          <li>
            <span class="feat-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/></svg>
            </span>
            Auto-save to the cloud — access from anywhere
          </li>
          <li>
            <span class="feat-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            Automatic AC, saving throws and attack calculations
          </li>
          <li>
            <span class="feat-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
            </span>
            Free to start · No credit card required
          </li>
        </ul>

        <!-- Chips de sistema -->
        <div class="hero-chips">
          <span class="hchip">D&amp;D 3.5e</span>
          <span class="hchip">Pathfinder 1e</span>
          <span class="hchip">D&amp;D 5e</span>
        </div>

      </div>

      <!-- Spine del grimorio (borde derecho decorativo) -->
      <div class="book-spine" aria-hidden="true"></div>
    </div>

    <!-- ══ PÁGINA DERECHA — El formulario ══ -->
    <div class="page-right">

      <!-- Orbes de fondo sutiles -->
      <div class="orb orb-1" aria-hidden="true"></div>
      <div class="orb orb-2" aria-hidden="true"></div>

      <div class="form-container">

        <!-- Store referral banner -->
        <div v-if="storeName" class="store-banner" role="note">
          <span class="store-banner-icon">🎲</span>
          <span class="store-banner-text">
            Recommended by <strong>{{ storeName }}</strong> —
            creating your account helps support them.
          </span>
        </div>

        <!-- Tabs -->
        <div class="mode-tabs" role="tablist">
          <button
            role="tab"
            :aria-selected="isLogin"
            :class="{ active: isLogin }"
            @click="switchMode('login')"
          >Sign in</button>
          <button
            role="tab"
            :aria-selected="!isLogin"
            :class="{ active: !isLogin }"
            @click="switchMode('register')"
          >Create account</button>
        </div>

        <div v-if="success" class="success-banner" role="status">{{ success }}</div>

        <!-- Formulario -->
        <form class="login-form" @submit.prevent="handleSubmit" novalidate>
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email" v-model="email" type="email"
              placeholder="adventurer@example.com"
              autocomplete="email" spellcheck="false"
              :disabled="loading" required
            />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input
              id="password" v-model="password" type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="loading" required
            />
          </div>

          <div v-if="!isLogin" class="field">
            <label for="confirm">Confirm password</label>
            <input
              id="confirm" v-model="confirm" type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              :disabled="loading" required
            />
          </div>

          <div v-if="error" class="error-banner" role="alert">{{ error }}</div>

          <button type="submit" class="btn-primary btn-submit" :disabled="loading || loadingGoogle">
            <span v-if="loading" class="spinner"></span>
            <span v-else-if="isLogin">Enter the Hall</span>
            <span v-else>Forge my account</span>
          </button>
        </form>

        <!-- OAuth -->
        <div class="oauth-divider">
          <span class="oauth-line"></span>
          <span class="oauth-text">or continue with</span>
          <span class="oauth-line"></span>
        </div>

        <button class="btn-google" :disabled="loading || loadingGoogle" @click="handleGoogle" data-test="google-login">
          <span v-if="loadingGoogle" class="spinner spinner-light"></span>
          <template v-else>
            <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </template>
        </button>

        <!-- Store CTA -->
        <div class="store-cta">
          <span class="store-cta-text">Are you a game store?</span>
          <button class="btn-store-link" @click="showStoreModal = true">
            Get your free QR →
          </button>
        </div>

      </div>
    </div>

  </div>

  <!-- Store registration modal -->
  <StoreRegisterModal v-if="showStoreModal" @close="showStoreModal = false" />

</template>

<style scoped>
/* ══ Layout ══════════════════════════════════════════════════════════ */
.grimoire {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 768px) {
  .grimoire { grid-template-columns: 1fr; }
  .page-left { display: none; }
}

/* ══ Página izquierda ═══════════════════════════════════════════════ */
.page-left {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image: url('/hero-bg.png');
  background-size: cover;
  background-position: center;
  transform: scale(1.04);
  animation: hero-zoom 25s ease-in-out infinite alternate;
}

@keyframes hero-zoom {
  from { transform: scale(1.04); }
  to   { transform: scale(1.12); }
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right,  rgba(10,9,16,0.15) 0%, rgba(10,9,16,0.60) 100%),
    linear-gradient(to bottom, rgba(10,9,16,0.20) 0%, rgba(10,9,16,0.45) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  padding: 3rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
}

/* ── Logo ── */
.hero-logo { margin-bottom: 1rem; }

.hero-logo-img {
  width: 155px;
  height: 155px;
  object-fit: contain;
  filter: drop-shadow(0 0 24px rgba(201, 168, 76, 0.45));
  animation: logo-pulse 4s ease-in-out infinite;
}

@keyframes logo-pulse {
  0%, 100% { filter: drop-shadow(0 0 18px rgba(201, 168, 76, 0.38)); }
  50%       { filter: drop-shadow(0 0 36px rgba(201, 168, 76, 0.65)) drop-shadow(0 0 10px rgba(136, 85, 208, 0.30)); }
}

.hero-title {
  font-family: var(--font-title);
  font-size: 2.6rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #8a6f2e 0%, #f0df90 45%, #c9a84c 75%, #e8d183 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 0.4rem;
  filter: drop-shadow(0 2px 12px rgba(201, 168, 76, 0.3));
}

.hero-tagline {
  font-size: 0.72rem;
  font-style: italic;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(232, 224, 242, 0.65);
  margin-bottom: 1.25rem;
}

.hero-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
  margin: 0.25rem 0 1.5rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.6), transparent);
}

.divider-diamond {
  width: 8px;
  height: 8px;
  background: var(--gold);
  transform: rotate(45deg);
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(201, 168, 76, 0.6);
}

.hero-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  text-align: left;
  width: 100%;
  max-width: 320px;
  margin-bottom: 1.5rem;
}
.hero-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.82rem;
  color: rgba(232, 224, 242, 0.80);
  line-height: 1.4;
}

.feat-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; color: var(--gold); }
.feat-icon svg { width: 100%; height: 100%; }

.hero-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
.hchip {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--arcane-light);
  background: rgba(136, 85, 208, 0.15);
  border: 1px solid rgba(136, 85, 208, 0.35);
  border-radius: 20px;
  padding: 0.2rem 0.65rem;
  backdrop-filter: blur(4px);
}

.book-spine {
  position: absolute;
  top: 0; right: 0;
  width: 3px; height: 100%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(201,168,76,0.15) 15%,
    rgba(201,168,76,0.55) 50%,
    rgba(201,168,76,0.15) 85%,
    transparent 100%
  );
  box-shadow: 0 0 16px rgba(201, 168, 76, 0.20);
}

/* ══ Página derecha ══════════════════════════════════════════════════ */
.page-right {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: var(--bg-base);
  overflow: hidden;
}

.orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(80px); }
.orb-1 {
  width: 400px; height: 400px; top: -150px; right: -100px;
  background: radial-gradient(circle, rgba(136,85,208,0.12) 0%, transparent 70%);
  animation: orb-drift 14s ease-in-out infinite;
}
.orb-2 {
  width: 300px; height: 300px; bottom: -80px; left: -60px;
  background: radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%);
  animation: orb-drift 18s ease-in-out infinite reverse;
}
@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0); }
  50%       { transform: translate(20px, -15px); }
}

.form-container { width: 100%; max-width: 380px; position: relative; z-index: 1; }

/* ── Tabs ── */
.mode-tabs {
  display: flex;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px; margin-bottom: 1.5rem; gap: 2px;
}
.mode-tabs button {
  flex: 1; background: transparent; border: none;
  border-radius: var(--radius-sm); color: var(--text-muted);
  font-family: inherit; font-size: 0.82rem; font-weight: 600;
  padding: 0.45rem; cursor: pointer; transition: all var(--transition);
}
.mode-tabs button.active {
  background: linear-gradient(135deg, rgba(136,85,208,0.20), rgba(201,168,76,0.12));
  color: var(--gold-light);
  box-shadow: 0 1px 6px rgba(0,0,0,0.35);
  border: 1px solid var(--gold-border);
}

/* ── Form ── */
.login-form { display: flex; flex-direction: column; gap: 0.9rem; }

.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label {
  font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-secondary);
}
.field input {
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary);
  font-size: 0.9rem; font-family: inherit; padding: 0.62rem 0.9rem;
  width: 100%; outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.field input:focus { border-color: var(--arcane); box-shadow: 0 0 0 3px rgba(136,85,208,0.14); }
.field input::placeholder { color: var(--text-muted); opacity: 0.55; }
.field input:disabled { opacity: 0.4; cursor: not-allowed; }

.error-banner {
  font-size: 0.8rem; color: var(--red-light); background: var(--red-subtle);
  border: 1px solid rgba(176,32,64,0.3); border-radius: var(--radius-sm); padding: 0.5rem 0.85rem;
}
.success-banner {
  font-size: 0.8rem; color: var(--green-light); background: rgba(45,138,78,0.10);
  border: 1px solid rgba(45,138,78,0.28); border-radius: var(--radius-sm);
  padding: 0.5rem 0.85rem; margin-bottom: 0.5rem;
}

.btn-submit {
  width: 100%; margin-top: 0.25rem; font-size: 0.95rem;
  font-family: var(--font-title); letter-spacing: 0.06em;
  padding: 0.82rem; min-height: 46px;
}

.oauth-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 1rem; }
.oauth-line { flex: 1; height: 1px; background: var(--border); }
.oauth-text {
  font-size: 0.66rem; color: var(--text-muted); white-space: nowrap;
  text-transform: uppercase; letter-spacing: 0.08em;
}

.btn-google {
  display: flex; align-items: center; justify-content: center; gap: 0.65rem;
  width: 100%; min-height: 44px; padding: 0.65rem 1rem;
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary);
  font-family: inherit; font-size: 0.88rem; font-weight: 500;
  cursor: pointer; transition: all var(--transition);
}
.btn-google:hover:not(:disabled) {
  background: rgba(136,85,208,0.08); border-color: var(--arcane-border);
  box-shadow: 0 0 16px rgba(136,85,208,0.12);
}
.btn-google:disabled { opacity: 0.4; cursor: not-allowed; }
.google-icon { width: 18px; height: 18px; flex-shrink: 0; }
.spinner-light { border-color: rgba(232,224,242,0.2); border-top-color: var(--text-primary); }

/* ── Store CTA ── */
.store-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1.25rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--border);
}

.store-cta-text {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.btn-store-link {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--gold);
  cursor: pointer;
  padding: 0;
  transition: opacity var(--transition);
}
.btn-store-link:hover { opacity: 0.75; }

/* ── Store referral banner ── */
.store-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  background: rgba(201, 168, 76, 0.07);
  border: 1px solid rgba(201, 168, 76, 0.22);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.85rem;
  margin-bottom: 1.1rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-secondary);
}
.store-banner-icon { flex-shrink: 0; font-size: 0.9rem; margin-top: 1px; }
.store-banner-text strong { color: var(--gold); font-weight: 600; }
</style>
