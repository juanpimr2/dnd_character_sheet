<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore }     from '@/stores/auth'
import { useCharacterStore } from '@/stores/characters'
import AppHeader    from '@/components/AppHeader.vue'
import CharacterCard from '@/components/CharacterCard.vue'

const router     = useRouter()
const route      = useRoute()
const authStore  = useAuthStore()
const charStore  = useCharacterStore()

const playerId       = computed(() => authStore.user?.id ?? '')
const successToast   = ref(false)
const checkingOut    = ref(false)

const maxAllowed = computed(() => {
  const u = authStore.user
  if (!u) return 1
  if (u.plan === 'dm') return Infinity
  return u.purchased ? 20 + (u.extraCharacters ?? 0) : 1
})

const atLimit = computed(() =>
  charStore.characters.length >= maxAllowed.value
)

onMounted(async () => {
  await charStore.fetchCharacters()
  if (route.query.payment === 'success') {
    // Re-fetch profile para actualizar purchased
    if (authStore.session?.user?.id) {
      await authStore.fetchProfile(authStore.session.user.id)
    }
    successToast.value = true
    setTimeout(() => { successToast.value = false }, 5000)
  }
})

function openCharacter(id: string): void {
  router.push({ name: 'character', params: { id } })
}

async function confirmDelete(id: string, name: string): Promise<void> {
  if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return
  await charStore.deleteCharacter(id)
}

async function createCharacter(): Promise<void> {
  if (atLimit.value) return
  const name = window.prompt('New character name:')?.trim()
  if (!name) return
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
  if (!id) return
  const error = await charStore.createCharacter(id, name)
  if (error) { alert('Error creating character: ' + error); return }
  router.push({ name: 'character', params: { id } })
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
    alert('Error starting checkout: ' + (e instanceof Error ? e.message : e))
    checkingOut.value = false
  }
}
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">

      <!-- Payment success toast -->
      <div v-if="successToast" class="toast-success" role="status">
        <template v-if="authStore.user?.plan === 'dm'">
          ✓ Plan Maestro DM activated! Unlimited characters unlocked.
        </template>
        <template v-else-if="(authStore.user?.extraCharacters ?? 0) > 0 && authStore.user?.purchased">
          ✓ +5 slots added! You now have {{ 20 + (authStore.user?.extraCharacters ?? 0) }} characters available.
        </template>
        <template v-else>
          ✓ Payment complete! You now have full access to 20 characters.
        </template>
      </div>

      <!-- Page header -->
      <header class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">My Characters</h1>
          <p class="page-subtitle">
            Player: <code>{{ playerId }}</code>
          </p>
        </div>
        <button
          class="btn-outline"
          @click="createCharacter"
          :disabled="atLimit"
          :title="atLimit ? 'Character limit reached' : undefined"
        >
          <span aria-hidden="true">✦</span> New Character
        </button>
      </header>

      <!-- Upsell banner (free plan at limit) -->
      <div
        v-if="atLimit && !authStore.user?.purchased"
        class="upsell-banner"
        role="alert"
      >
        <div class="upsell-text">
          <span class="upsell-icon" aria-hidden="true">🎲</span>
          <div>
            <strong>You have {{ charStore.characters.length }}/{{ maxAllowed }} character on the free plan.</strong>
            <span> Unlock up to 20 characters for €4.99 — or go unlimited with the DM plan for €9.99</span>
          </div>
        </div>
        <div class="upsell-actions">
          <button
            class="btn-primary btn-checkout"
            @click="startCheckout('/api/checkout')"
            :disabled="checkingOut"
          >
            <span v-if="checkingOut">Redirecting…</span>
            <span v-else>Full access €4.99 →</span>
          </button>
          <button
            class="btn-outline btn-checkout"
            @click="startCheckout('/api/checkout/dm')"
            :disabled="checkingOut"
          >
            <span v-if="checkingOut">Redirecting…</span>
            <span v-else>DM plan €9.99 ∞</span>
          </button>
        </div>
      </div>

      <!-- ── Loading ── -->
      <div v-if="charStore.loading" class="state-box">
        <div class="spinner-lg" role="status" aria-label="Loading characters"></div>
        <p>Loading characters…</p>
      </div>

      <!-- ── Error ── -->
      <div v-else-if="charStore.error" class="state-box state-error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ charStore.error }}</p>
        <button class="btn-outline" @click="charStore.fetchCharacters()">
          Retry
        </button>
      </div>

      <!-- ── Empty state ── -->
      <div v-else-if="charStore.characters.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">🎭</div>
        <h2>No characters yet</h2>
        <p>Create your first hero to begin the adventure</p>
        <button class="btn-primary" @click="createCharacter">
          ✦ Create my first character
        </button>
      </div>

      <!-- ── Character grid ── -->
      <section v-else aria-label="Character list">
        <div class="char-grid">
          <CharacterCard
            v-for="char in charStore.characters"
            :key="char.id"
            :character="char"
            @click="openCharacter(char.id)"
            @delete="confirmDelete(char.id, char.name)"
          />
        </div>
        <p class="char-count">
          {{ charStore.characters.length }}
          {{ charStore.characters.length === 1 ? 'character' : 'characters' }}
          · limit: {{ maxAllowed }}
        </p>
      </section>

    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 55% 35% at 15% 20%,  rgba(136, 85, 208, 0.10) 0%, transparent 60%),
    radial-gradient(ellipse 45% 30% at 85% 10%,  rgba(201, 168, 76, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 40% 50% at 90% 85%,  rgba(136, 85, 208, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse 60% 25% at 50% 100%, rgba(201, 168, 76, 0.04) 0%, transparent 60%),
    var(--bg-base);
  position: relative;
}

.page::after {
  content: '';
  position: absolute;
  inset: 0;
  min-height: 100vh;
  pointer-events: none;
  z-index: 0;
  background-image: url('/parchment.png');
  background-size: 500px;
  background-repeat: repeat;
  opacity: 0.07;
}

.content { position: relative; z-index: 1; }

/* Línea decorativa dorada bajo el header */
.page::before {
  content: '';
  display: block;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.35) 30%, rgba(136,85,208,0.25) 60%, transparent 100%);
  margin-top: -1px;
}

.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* Toast */
.toast-success {
  background: rgba(60, 140, 80, 0.15);
  border: 1px solid rgba(60, 140, 80, 0.4);
  color: #5dc878;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  margin-bottom: 1rem;
}

/* Cabecera */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.7rem;
  color: var(--gold-light);
  letter-spacing: 0.02em;
  margin-bottom: 0.2rem;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.page-subtitle code {
  font-family: 'Courier New', monospace;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

/* Upsell banner */
.upsell-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.upsell-text {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.upsell-icon { font-size: 1.4rem; flex-shrink: 0; }

.upsell-text strong { color: var(--gold-light); }

.upsell-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-checkout {
  font-size: 0.85rem;
  padding: 0.45rem 1rem;
  white-space: nowrap;
}

/* Estado: cargando / error */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 5rem 2rem;
  color: var(--text-muted);
  text-align: center;
}

.state-error { color: var(--red-light); }

.state-icon { font-size: 2rem; }

/* Estado: vacío */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 5rem 2rem;
  border: 1px dashed rgba(201, 168, 76, 0.2);
  border-radius: var(--radius-xl);
  background: radial-gradient(ellipse 60% 60% at 50% 40%, rgba(136,85,208,0.06) 0%, transparent 70%);
}

.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }

.empty-state h2 {
  font-size: 1.15rem;
  color: var(--text-primary);
}
.empty-state p {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

/* Grid */
.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1rem;
}

.char-count {
  margin-top: 1.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
}
</style>
