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
  if (!u) return 2
  return u.purchased ? 10 + (u.extraCharacters ?? 0) : 2
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
  if (!confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return
  await charStore.deleteCharacter(id)
}

async function createCharacter(): Promise<void> {
  if (atLimit.value) return
  const name = window.prompt('Nombre del nuevo personaje:')?.trim()
  if (!name) return
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
  if (!id) return
  const error = await charStore.createCharacter(id, name)
  if (error) { alert('Error al crear personaje: ' + error); return }
  router.push({ name: 'character', params: { id } })
}

async function startCheckout(): Promise<void> {
  checkingOut.value = true
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.getToken()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    window.location.href = data.url
  } catch (e) {
    alert('Error al iniciar el pago: ' + (e instanceof Error ? e.message : e))
    checkingOut.value = false
  }
}
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">

      <!-- Toast de éxito de pago -->
      <div v-if="successToast" class="toast-success" role="status">
        ✓ ¡Pago completado! Ya tienes acceso completo a 10 personajes.
      </div>

      <!-- Cabecera de página -->
      <header class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Mis Personajes</h1>
          <p class="page-subtitle">
            Jugador: <code>{{ playerId }}</code>
          </p>
        </div>
        <button
          class="btn-outline"
          @click="createCharacter"
          :disabled="atLimit"
          :title="atLimit ? 'Has alcanzado el límite de personajes' : undefined"
        >
          <span aria-hidden="true">✦</span> Nuevo Personaje
        </button>
      </header>

      <!-- Banner de upsell (plan free en el límite) -->
      <div
        v-if="atLimit && !authStore.user?.purchased"
        class="upsell-banner"
        role="alert"
      >
        <div class="upsell-text">
          <span class="upsell-icon" aria-hidden="true">🎲</span>
          <div>
            <strong>Tienes {{ charStore.characters.length }}/{{ maxAllowed }} personajes en el plan gratuito.</strong>
            <span> Desbloquea hasta 10 personajes por 4.99€</span>
          </div>
        </div>
        <button
          class="btn-primary btn-checkout"
          @click="startCheckout"
          :disabled="checkingOut"
        >
          <span v-if="checkingOut">Redirigiendo…</span>
          <span v-else>Comprar acceso completo →</span>
        </button>
      </div>

      <!-- ── Estado: cargando ── -->
      <div v-if="charStore.loading" class="state-box">
        <div class="spinner-lg" role="status" aria-label="Cargando personajes"></div>
        <p>Cargando personajes…</p>
      </div>

      <!-- ── Estado: error ── -->
      <div v-else-if="charStore.error" class="state-box state-error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ charStore.error }}</p>
        <button class="btn-outline" @click="charStore.fetchCharacters()">
          Reintentar
        </button>
      </div>

      <!-- ── Estado: vacío ── -->
      <div v-else-if="charStore.characters.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">🎭</div>
        <h2>Sin personajes todavía</h2>
        <p>Crea tu primer héroe para comenzar la aventura</p>
        <button class="btn-primary" @click="createCharacter">
          ✦ Crear mi primer personaje
        </button>
      </div>

      <!-- ── Grid de personajes ── -->
      <section v-else aria-label="Lista de personajes">
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
          {{ charStore.characters.length === 1 ? 'personaje' : 'personajes' }}
          · límite: {{ maxAllowed }}
        </p>
      </section>

    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 60% 40% at 80% 0%, rgba(201, 168, 76, 0.05) 0%, transparent 60%),
    var(--bg-base);
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
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
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
