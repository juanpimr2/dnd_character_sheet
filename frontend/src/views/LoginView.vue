<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

type Mode = 'login' | 'register'
const mode = ref<Mode>('login')

const email          = ref('')
const password       = ref('')
const confirm        = ref('')
const loading        = ref(false)
const loadingGoogle  = ref(false)
const error          = ref('')
const success        = ref('')

const isLogin = computed(() => mode.value === 'login')

function switchMode(m: Mode) {
  mode.value = m
  error.value = ''
  success.value = ''
  password.value = ''
  confirm.value = ''
}

async function handleSubmit(): Promise<void> {
  error.value = ''
  success.value = ''

  if (!email.value.trim() || !password.value) {
    error.value = 'Rellena todos los campos'
    return
  }

  if (!isLogin.value && password.value !== confirm.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (!isLogin.value && password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
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
      success.value = '¡Cuenta creada! Revisa tu email para confirmar el registro.'
      switchMode('login')
    }
  }
}

// Capturar ?ref= del QR de tienda y guardarlo para después del login
onMounted(() => {
  const ref = route.query.ref as string | undefined
  if (ref) localStorage.setItem('dnd_store_ref', ref)
})

async function handleGoogle(): Promise<void> {
  loadingGoogle.value = true
  error.value = ''
  const err = await authStore.loginWithGoogle()
  // Si hay error muéstralo; si no, el browser redirige a Google automáticamente
  if (err) {
    error.value = err
    loadingGoogle.value = false
  }
  // No reseteamos loadingGoogle si no hay error: el redirect ya lleva al usuario fuera
}
</script>

<template>
  <div class="login-page">
    <div class="bg-ornament top-left"  aria-hidden="true"></div>
    <div class="bg-ornament bot-right" aria-hidden="true"></div>

    <main class="login-card" role="main">

      <div class="emblem" aria-hidden="true">
        <span class="emblem-icon">⚔️</span>
      </div>

      <h1 class="login-title">Gestor de Personajes</h1>
      <p class="login-subtitle">D&amp;D 3.5 · Pathfinder</p>

      <div class="divider" aria-hidden="true">
        <span class="divider-gem">◆</span>
      </div>

      <!-- Tabs login / registro -->
      <div class="mode-tabs" role="tablist">
        <button
          role="tab"
          :aria-selected="isLogin"
          :class="{ active: isLogin }"
          @click="switchMode('login')"
        >Iniciar sesión</button>
        <button
          role="tab"
          :aria-selected="!isLogin"
          :class="{ active: !isLogin }"
          @click="switchMode('register')"
        >Crear cuenta</button>
      </div>

      <!-- Mensaje de éxito post-registro -->
      <div v-if="success" class="success-banner" role="status">
        ✓ {{ success }}
      </div>

      <form class="login-form" @submit.prevent="handleSubmit" novalidate>
        <div class="field">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="jugador@ejemplo.com"
            autocomplete="email"
            spellcheck="false"
            :disabled="loading"
            required
          />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
            required
          />
        </div>

        <div v-if="!isLogin" class="field">
          <label for="confirm">Confirmar contraseña</label>
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            :disabled="loading"
            required
          />
        </div>

        <div v-if="error" class="error-banner" role="alert">
          <span aria-hidden="true">⚠</span> {{ error }}
        </div>

        <button type="submit" class="btn-primary btn-submit" :disabled="loading || loadingGoogle">
          <span v-if="loading" class="spinner" aria-label="Cargando…"></span>
          <span v-else-if="isLogin">Entrar al Salón</span>
          <span v-else>Crear cuenta</span>
        </button>
      </form>

      <!-- Divisor OAuth -->
      <div class="oauth-divider">
        <span class="oauth-divider-line"></span>
        <span class="oauth-divider-text">o continúa con</span>
        <span class="oauth-divider-line"></span>
      </div>

      <!-- Google OAuth -->
      <button
        class="btn-google"
        :disabled="loading || loadingGoogle"
        @click="handleGoogle"
        data-test="google-login"
      >
        <span v-if="loadingGoogle" class="spinner spinner-dark" aria-label="Redirigiendo…"></span>
        <template v-else>
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </template>
      </button>

    </main>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201, 168, 76, 0.08) 0%, transparent 70%),
    var(--bg-base);
}

.bg-ornament {
  position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.04;
  background: var(--gold);
  filter: blur(80px);
}
.top-left  { top: -150px; left: -150px; }
.bot-right { bottom: -150px; right: -150px; }

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-xl);
  padding: 2.5rem 2.25rem;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: var(--shadow), var(--shadow-gold);
  position: relative;
}
.login-card::before,
.login-card::after {
  content: '◇';
  position: absolute;
  font-size: 0.65rem;
  color: var(--gold-dim);
  opacity: 0.6;
}
.login-card::before { top: 12px; left: 14px; }
.login-card::after  { bottom: 12px; right: 14px; }

.emblem {
  width: 68px; height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--bg-elevated) 60%, var(--bg-card) 100%);
  border: 2px solid var(--gold-border);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.1rem;
  box-shadow: 0 0 20px rgba(201, 168, 76, 0.15);
}
.emblem-icon { font-size: 1.75rem; filter: drop-shadow(0 0 8px rgba(201, 168, 76, 0.5)); }

.login-title   { font-size: 1.45rem; color: var(--gold-light); letter-spacing: 0.02em; margin-bottom: 0.25rem; }
.login-subtitle { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; }

.divider {
  display: flex; align-items: center; gap: 0.6rem;
  margin: 1.25rem 0 1rem;
  opacity: 0.35;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--gold-dim); }
.divider-gem { font-size: 0.5rem; color: var(--gold); }

/* Tabs modo */
.mode-tabs {
  display: flex;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  margin-bottom: 1.25rem;
  gap: 2px;
}
.mode-tabs button {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem;
  cursor: pointer;
  transition: all var(--transition);
}
.mode-tabs button.active {
  background: var(--bg-card);
  color: var(--gold);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.login-form { display: flex; flex-direction: column; gap: 0.9rem; text-align: left; }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label {
  font-size: 0.72rem; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.07em;
}
.field input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.9rem; font-family: inherit;
  padding: 0.58rem 0.85rem;
  width: 100%; outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.field input:focus {
  border-color: var(--gold-dim);
  box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.1);
}
.field input::placeholder { color: var(--text-muted); }
.field input:disabled { opacity: 0.45; cursor: not-allowed; }

.error-banner {
  font-size: 0.82rem; color: var(--red-light);
  background: var(--red-subtle);
  border: 1px solid rgba(158, 48, 48, 0.35);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.8rem; text-align: center;
}

.success-banner {
  font-size: 0.82rem; color: #45c070;
  background: rgba(45, 138, 78, 0.12);
  border: 1px solid rgba(45, 138, 78, 0.3);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.8rem; text-align: center;
  margin-bottom: 0.5rem;
}

.btn-submit { margin-top: 0.2rem; width: 100%; font-size: 0.95rem; padding: 0.78rem; min-height: 44px; }

.oauth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0 1rem;
}
.oauth-divider-line { flex: 1; height: 1px; background: var(--border); }
.oauth-divider-text { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.06em; }

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
}
.btn-google:hover:not(:disabled) {
  background: var(--bg-card);
  border-color: var(--gold-dim);
  box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.08);
}
.btn-google:disabled { opacity: 0.45; cursor: not-allowed; }

.google-icon { width: 18px; height: 18px; flex-shrink: 0; }

.spinner-dark {
  border-color: rgba(0,0,0,0.15);
  border-top-color: #333;
}
</style>
