<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'

const authStore = useAuthStore()

const maskedToken  = ref<string | null>(null)
const clearToken   = ref<string | null>(null)   // solo visible tras regenerar
const loading      = ref(false)
const regenerating = ref(false)
const copied       = ref(false)
const error        = ref('')
const checkingOut  = ref(false)

async function fetchMe() {
  loading.value = true
  try {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${authStore.getToken()}` },
    })
    const data = await res.json()
    maskedToken.value = data.api_token
  } catch {
    error.value = 'Error loading profile'
  } finally {
    loading.value = false
  }
}

async function regenerateToken() {
  if (!confirm('Generate a new API token? The current token will stop working.')) return
  regenerating.value = true
  clearToken.value   = null
  error.value        = ''
  try {
    const res = await fetch('/api/me/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.getToken()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    clearToken.value   = data.api_token
    maskedToken.value  = data.api_token.slice(0, 8) + '...'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error regenerating token'
  } finally {
    regenerating.value = false
  }
}

async function copyToken() {
  const token = clearToken.value ?? maskedToken.value
  if (!token) return
  await navigator.clipboard.writeText(token)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function startCheckout(endpoint = '/api/checkout'): Promise<void> {
  checkingOut.value = true
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.getToken()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    window.location.href = data.url
  } catch (e) {
    error.value = 'Error starting checkout: ' + (e instanceof Error ? e.message : e)
    checkingOut.value = false
  }
}

onMounted(fetchMe)
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="content">

      <header class="page-header">
        <h1 class="page-title">Settings</h1>
      </header>

      <!-- API Token -->
      <section class="card">
        <h2 class="card-title">API Token</h2>
        <p class="card-desc">
          Use this token to authenticate with the API without a browser session.
          Useful for VTT integrations, bots, or external scripts.
        </p>

        <div v-if="loading" class="token-loading">Loading…</div>

        <template v-else>
          <!-- Warning if just regenerated -->
          <div v-if="clearToken" class="token-alert" role="alert">
            ⚠ Save this token now — it will not be shown in full again.
          </div>

          <div class="token-row">
            <code class="token-display">{{ clearToken ?? maskedToken ?? '—' }}</code>
            <button class="btn-icon" @click="copyToken" :title="copied ? 'Copied' : 'Copy'">
              {{ copied ? '✓' : '⧉' }}
            </button>
          </div>

          <div class="token-hint" v-if="!clearToken">
            The full token is only shown immediately after generating it.
          </div>

          <div v-if="error" class="error-text">{{ error }}</div>

          <button
            class="btn-outline btn-danger"
            @click="regenerateToken"
            :disabled="regenerating"
          >
            <span v-if="regenerating">Generating…</span>
            <span v-else>Regenerate token</span>
          </button>

          <!-- Usage example -->
          <details class="usage-details">
            <summary>How to use it</summary>
            <pre class="code-block">curl https://tuapp.com/api/characters \
  -H "Authorization: Bearer {{ clearToken ?? maskedToken ?? 'TU_TOKEN' }}"</pre>
          </details>
        </template>
      </section>

      <!-- Info de cuenta -->
      <section class="card">
        <h2 class="card-title">Cuenta</h2>
        <div class="info-row">
          <span class="info-label">Usuario</span>
          <span>{{ authStore.user?.name ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span>{{ authStore.user?.email ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Plan</span>
          <span class="plan-badge">{{ authStore.user?.plan ?? 'free' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Max characters</span>
          <span>{{ authStore.user?.maxCharacters ?? 2 }}</span>
        </div>
      </section>

      <!-- Plan / Compra -->
      <section class="card">
        <h2 class="card-title">Plan</h2>

        <!-- DM Plan -->
        <template v-if="authStore.user?.plan === 'dm'">
          <div class="plan-status">
            <span class="plan-badge plan-badge--dm">⚔ Plan Maestro DM · Unlimited characters</span>
            <span v-if="authStore.user.purchasedAt" class="plan-date">
              Purchased on {{ new Date(authStore.user.purchasedAt).toLocaleDateString('en-US') }}
            </span>
          </div>
          <p class="card-desc">
            You have unlimited characters. Rule them all, Dungeon Master.
          </p>
        </template>

        <!-- Full access (non-DM) -->
        <template v-else-if="authStore.user?.purchased">
          <div class="plan-status">
            <span class="plan-badge plan-badge--gold">✓ Full access · 20 characters</span>
            <span v-if="authStore.user.purchasedAt" class="plan-date">
              Purchased on {{ new Date(authStore.user.purchasedAt).toLocaleDateString('en-US') }}
            </span>
          </div>
          <p class="card-desc">
            You have 20 + {{ authStore.user?.extraCharacters ?? 0 }} characters available.
            Add more slots or go unlimited with the DM plan.
          </p>
          <div class="plan-actions">
            <button
              class="btn-outline"
              style="font-size: 0.85rem; padding: 0.45rem 1rem;"
              @click="startCheckout('/api/checkout/slots')"
              :disabled="checkingOut"
            >
              <span v-if="checkingOut">Redirecting…</span>
              <span v-else>+5 slots · €1.99</span>
            </button>
            <button
              class="btn-outline"
              style="font-size: 0.85rem; padding: 0.45rem 1rem;"
              @click="startCheckout('/api/checkout/dm')"
              :disabled="checkingOut"
            >
              <span v-if="checkingOut">Redirecting…</span>
              <span v-else>Upgrade to DM plan · €9.99 ∞</span>
            </button>
          </div>
          <div v-if="error" class="error-text">{{ error }}</div>
        </template>

        <!-- Free -->
        <template v-else>
          <div class="plan-status">
            <span class="plan-badge plan-badge--free">Free · 1 character</span>
          </div>
          <p class="card-desc">
            The free plan includes 1 character. Unlock up to 20 characters for €4.99,
            or go unlimited with the DM plan for €9.99.
          </p>
          <div class="plan-actions">
            <button
              class="btn-primary"
              style="font-size: 0.85rem; padding: 0.45rem 1rem;"
              @click="startCheckout('/api/checkout')"
              :disabled="checkingOut"
            >
              <span v-if="checkingOut">Redirecting…</span>
              <span v-else>Full access · €4.99 →</span>
            </button>
            <button
              class="btn-outline"
              style="font-size: 0.85rem; padding: 0.45rem 1rem;"
              @click="startCheckout('/api/checkout/dm')"
              :disabled="checkingOut"
            >
              <span v-if="checkingOut">Redirecting…</span>
              <span v-else>DM plan · €9.99 ∞</span>
            </button>
          </div>
          <div v-if="error" class="error-text">{{ error }}</div>
        </template>
      </section>

    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: var(--bg-base); }
.content {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header { margin-bottom: 0.5rem; }
.page-title  { font-size: 1.5rem; color: var(--gold-light); }

/* Card */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.card-desc { font-size: 0.82rem; color: var(--text-muted); }

/* Token */
.token-loading { font-size: 0.82rem; color: var(--text-muted); }

.token-alert {
  font-size: 0.8rem;
  background: rgba(192, 144, 48, 0.1);
  border: 1px solid rgba(192, 144, 48, 0.35);
  color: #c09030;
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.85rem;
}
.token-display {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  color: var(--gold-dim);
  word-break: break-all;
}
.btn-icon {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.1rem 0.3rem;
  transition: color var(--transition);
  flex-shrink: 0;
}
.btn-icon:hover { color: var(--gold); }

.token-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.error-text { font-size: 0.82rem; color: var(--red-light); }

.btn-danger {
  border-color: rgba(160, 50, 50, 0.4);
  color: var(--red-light);
  font-size: 0.82rem;
  padding: 0.4rem 0.85rem;
  align-self: flex-start;
}
.btn-danger:hover:not(:disabled) {
  background: rgba(160, 50, 50, 0.1);
  border-color: rgba(160, 50, 50, 0.6);
}

/* Usage example */
.usage-details { margin-top: 0.25rem; }
.usage-details summary {
  font-size: 0.75rem;
  color: var(--gold-dim);
  cursor: pointer;
  list-style: none;
  outline: none;
}
.usage-details summary::-webkit-details-marker { display: none; }
.usage-details summary::before { content: '▶ '; font-size: 0.55rem; }
details[open] summary::before { content: '▼ '; }
.code-block {
  margin-top: 0.5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.65rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Cuenta */
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
}
.info-row:last-child { border-bottom: none; }
.info-label { color: var(--text-muted); font-size: 0.78rem; }

.plan-badge {
  background: var(--gold-subtle);
  color: var(--gold);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.1rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.plan-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.plan-badge--gold {
  background: rgba(201, 168, 76, 0.15);
  color: var(--gold-light);
  border-color: rgba(201, 168, 76, 0.5);
  font-size: 0.8rem;
  padding: 0.2rem 0.7rem;
  text-transform: none;
}

.plan-badge--free {
  background: rgba(120, 120, 140, 0.12);
  color: var(--text-muted);
  border-color: var(--border);
  font-size: 0.8rem;
  padding: 0.2rem 0.7rem;
  text-transform: none;
}

.plan-badge--dm {
  background: rgba(138, 92, 200, 0.15);
  color: #b07ee8;
  border-color: rgba(138, 92, 200, 0.35);
  font-size: 0.8rem;
  padding: 0.2rem 0.7rem;
  text-transform: none;
}

.plan-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-self: flex-start;
}

.plan-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
