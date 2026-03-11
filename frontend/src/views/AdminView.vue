<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Shield, Building2, BarChart2, Users, Plus, Download,
  Check, X, Pencil, QrCode, LogOut, TrendingUp, CalendarDays,
} from 'lucide-vue-next'

// ── Types ─────────────────────────────────────────────────────────
interface StoreRow {
  id: string
  name: string
  city: string
  owner_email: string
  referral_code: string
  commission_rate: number
  active: boolean
  notes: string | null
  created_at: string
  total_registrations: number
}

interface DailyStat {
  store_id: string
  store_name: string
  store_city: string
  store_owner_email: string
  commission_rate: number
  registration_date: string | null
  registrations: number
}

interface Overview {
  totalUsers: number
  registrationsToday: number
  activeStores: number
  topStoreToday: { store_name: string; registrations: number } | null
}

// ── Admin auth ─────────────────────────────────────────────────────
const adminKey  = ref(sessionStorage.getItem('rollbook_admin_key') ?? '')
const keyInput  = ref('')
const authError = ref('')

function submitKey() {
  adminKey.value = keyInput.value.trim()
  sessionStorage.setItem('rollbook_admin_key', adminKey.value)
  authError.value = ''
  keyInput.value  = ''
  loadAll()
}

function clearKey() {
  adminKey.value = ''
  sessionStorage.removeItem('rollbook_admin_key')
}

// ── API helper ─────────────────────────────────────────────────────
async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey.value,
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 403) {
    clearKey()
    authError.value = 'Clave incorrecta'
    throw new Error('Acceso denegado')
  }
  return res
}

// ── Tabs ───────────────────────────────────────────────────────────
const tab = ref<'overview' | 'stores' | 'stats'>('overview')

// ── Overview ──────────────────────────────────────────────────────
const overview        = ref<Overview | null>(null)
const overviewLoading = ref(false)

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res   = await adminFetch('/api/admin/overview')
    overview.value = await res.json()
  } catch { /* ignored */ } finally {
    overviewLoading.value = false
  }
}

// ── Stores ────────────────────────────────────────────────────────
const stores        = ref<StoreRow[]>([])
const storesLoading = ref(false)
const storeError    = ref('')

const showNewForm = ref(false)
const newStore    = ref({ name: '', city: '', owner_email: '', commission_rate: 20, notes: '' })
const savingNew   = ref(false)

const editId      = ref<string | null>(null)
const editFields  = ref({ commission_rate: 20, notes: '' })

async function loadStores() {
  storesLoading.value = true
  try {
    const res    = await adminFetch('/api/admin/stores/list')
    stores.value = await res.json()
  } catch { /* ignored */ } finally {
    storesLoading.value = false
  }
}

async function createStore() {
  storeError.value = ''
  savingNew.value  = true
  try {
    const res  = await adminFetch('/api/admin/stores', {
      method: 'POST',
      body: JSON.stringify({ ...newStore.value, commission_rate: newStore.value.commission_rate / 100 }),
    })
    const data = await res.json()
    if (!res.ok) { storeError.value = data.error; return }
    showNewForm.value = false
    newStore.value    = { name: '', city: '', owner_email: '', commission_rate: 20, notes: '' }
    await loadStores()
  } finally {
    savingNew.value = false
  }
}

async function toggleActive(store: StoreRow) {
  await adminFetch(`/api/admin/stores/${store.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: !store.active }),
  })
  store.active = !store.active
}

function startEdit(store: StoreRow) {
  editId.value     = store.id
  editFields.value = {
    commission_rate: Math.round(store.commission_rate * 100),
    notes: store.notes ?? '',
  }
}

async function saveEdit(store: StoreRow) {
  storeError.value = ''
  const res  = await adminFetch(`/api/admin/stores/${store.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      commission_rate: editFields.value.commission_rate / 100,
      notes: editFields.value.notes || null,
    }),
  })
  if (!res.ok) { const d = await res.json(); storeError.value = d.error; return }
  editId.value = null
  await loadStores()
}

async function downloadQR(store: StoreRow, format: 'svg' | 'png') {
  const res  = await adminFetch(`/api/admin/stores/${store.id}/qr?format=${format}`)
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `qr-${store.referral_code}.${format}`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Stats ─────────────────────────────────────────────────────────
const statsDate    = ref(new Date().toISOString().split('T')[0])
const stats        = ref<DailyStat[]>([])
const statsLoading = ref(false)

const totalRegsForDate = computed(() =>
  stats.value.reduce((acc, r) => acc + Number(r.registrations), 0)
)

async function loadStats() {
  statsLoading.value = true
  try {
    const res  = await adminFetch(`/api/admin/stores/stats?date=${statsDate.value}`)
    stats.value = await res.json()
  } catch { /* ignored */ } finally {
    statsLoading.value = false
  }
}

// ── Init ───────────────────────────────────────────────────────────
function loadAll() {
  loadOverview()
  loadStores()
  loadStats()
}

onMounted(() => {
  if (adminKey.value) loadAll()
})
</script>

<template>

  <!-- ── Admin login ─────────────────────────────────────────────── -->
  <div v-if="!adminKey" class="login-wrap">
    <div class="login-card">
      <div class="login-icon"><Shield :size="28" /></div>
      <h1 class="login-title">Rollbook Admin</h1>
      <p class="login-sub">Introduce la clave de administrador</p>
      <form @submit.prevent="submitKey" class="login-form">
        <input
          v-model="keyInput"
          type="password"
          placeholder="Admin key…"
          class="login-input"
          autocomplete="current-password"
        />
        <button type="submit" class="btn-primary" :disabled="!keyInput">
          Acceder
        </button>
      </form>
      <p v-if="authError" class="login-error">{{ authError }}</p>
    </div>
  </div>

  <!-- ── Admin panel ─────────────────────────────────────────────── -->
  <div v-else class="admin-wrap">

    <!-- Header -->
    <header class="admin-header">
      <div class="admin-header-inner">
        <div class="admin-brand">
          <Shield :size="18" class="admin-brand-icon" />
          <span class="admin-brand-name">Rollbook Admin</span>
        </div>
        <button class="btn-exit" @click="clearKey">
          <LogOut :size="14" />
          Salir
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="admin-tabs">
      <button
        v-for="t in [
          { id: 'overview', label: 'Overview',  Icon: TrendingUp  },
          { id: 'stores',   label: 'Tiendas',   Icon: Building2   },
          { id: 'stats',    label: 'Estadísticas', Icon: BarChart2 },
        ]"
        :key="t.id"
        :class="['tab-btn', { active: tab === t.id }]"
        @click="tab = t.id as typeof tab"
      >
        <component :is="t.Icon" :size="15" />
        {{ t.label }}
      </button>
    </nav>

    <main class="admin-main">

      <!-- ────────────────── OVERVIEW ──────────────────────────── -->
      <section v-if="tab === 'overview'">
        <div v-if="overviewLoading" class="loading-text">Cargando…</div>
        <template v-else-if="overview">

          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-label">
                <Users :size="13" />
                Usuarios totales
              </div>
              <div class="stat-value">{{ overview.totalUsers ?? '—' }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">
                <TrendingUp :size="13" />
                Registros hoy
              </div>
              <div class="stat-value">{{ overview.registrationsToday }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">
                <Building2 :size="13" />
                Tiendas activas
              </div>
              <div class="stat-value">{{ overview.activeStores ?? '—' }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">
                <BarChart2 :size="13" />
                Top tienda hoy
              </div>
              <div class="stat-value stat-value--sm">
                {{ overview.topStoreToday
                    ? `${overview.topStoreToday.store_name} (${overview.topStoreToday.registrations})`
                    : '—' }}
              </div>
            </div>
          </div>

          <div class="overview-hint">
            Última actualización al cargar la página.
            <button class="btn-link" @click="loadAll">Actualizar</button>
          </div>

        </template>
      </section>

      <!-- ────────────────── TIENDAS ───────────────────────────── -->
      <section v-if="tab === 'stores'">

        <div class="section-header">
          <h2 class="section-title">Tiendas afiliadas</h2>
          <button class="btn-primary btn-sm" @click="showNewForm = !showNewForm">
            <Plus :size="14" />
            Nueva tienda
          </button>
        </div>

        <!-- New store form -->
        <div v-if="showNewForm" class="form-card">
          <h3 class="form-title">Nueva tienda</h3>
          <div class="form-row">
            <label class="form-label">Nombre *</label>
            <input v-model="newStore.name" class="form-input" placeholder="Dragones & Dados Madrid" />
          </div>
          <div class="form-row">
            <label class="form-label">Ciudad *</label>
            <input v-model="newStore.city" class="form-input" placeholder="Madrid" />
          </div>
          <div class="form-row">
            <label class="form-label">Email del dueño *</label>
            <input v-model="newStore.owner_email" class="form-input" type="email" placeholder="tienda@ejemplo.com" />
          </div>
          <div class="form-row">
            <label class="form-label">Comisión (%)</label>
            <input v-model.number="newStore.commission_rate" class="form-input form-input--sm" type="number" min="0" max="100" />
          </div>
          <div class="form-row">
            <label class="form-label">Notas</label>
            <input v-model="newStore.notes" class="form-input" placeholder="Opcional…" />
          </div>
          <p v-if="storeError" class="form-error">{{ storeError }}</p>
          <div class="form-actions">
            <button class="btn-outline" @click="showNewForm = false">Cancelar</button>
            <button
              class="btn-primary"
              @click="createStore"
              :disabled="savingNew || !newStore.name || !newStore.city || !newStore.owner_email"
            >
              {{ savingNew ? 'Creando…' : 'Crear tienda' }}
            </button>
          </div>
        </div>

        <!-- Stores table -->
        <div v-if="storesLoading" class="loading-text">Cargando tiendas…</div>
        <div v-else-if="stores.length === 0" class="empty-text">No hay tiendas aún.</div>
        <div v-else class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Tienda</th>
                <th>Código</th>
                <th>Comisión</th>
                <th>Registros</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="store in stores" :key="store.id">
                <!-- Normal row -->
                <tr v-if="editId !== store.id">
                  <td>
                    <div class="store-name">{{ store.name }}</div>
                    <div class="store-city">{{ store.city }}</div>
                  </td>
                  <td>
                    <code class="code-pill">{{ store.referral_code }}</code>
                  </td>
                  <td>{{ Math.round(store.commission_rate * 100) }}%</td>
                  <td>{{ store.total_registrations }}</td>
                  <td>
                    <button
                      :class="['status-badge', store.active ? 'status-badge--on' : 'status-badge--off']"
                      @click="toggleActive(store)"
                      title="Cambiar estado"
                    >
                      {{ store.active ? 'Activa' : 'Inactiva' }}
                    </button>
                  </td>
                  <td>
                    <div class="action-group">
                      <button class="btn-action" title="Editar" @click="startEdit(store)">
                        <Pencil :size="13" />
                      </button>
                      <button class="btn-action" title="Descargar QR SVG" @click="downloadQR(store, 'svg')">
                        <QrCode :size="13" />
                        <span class="action-label">SVG</span>
                      </button>
                      <button class="btn-action" title="Descargar QR PNG" @click="downloadQR(store, 'png')">
                        <Download :size="13" />
                        <span class="action-label">PNG</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- Edit row -->
                <tr v-else class="edit-row">
                  <td colspan="2">
                    <div class="store-name">{{ store.name }} — {{ store.city }}</div>
                    <div class="edit-notes-wrap">
                      <input v-model="editFields.notes" class="form-input form-input--sm" placeholder="Notas…" />
                    </div>
                  </td>
                  <td>
                    <input
                      v-model.number="editFields.commission_rate"
                      class="form-input form-input--xs"
                      type="number" min="0" max="100"
                    />
                    <span class="pct-label">%</span>
                  </td>
                  <td>{{ store.total_registrations }}</td>
                  <td></td>
                  <td>
                    <div class="action-group">
                      <button class="btn-action btn-action--confirm" @click="saveEdit(store)">
                        <Check :size="13" />
                      </button>
                      <button class="btn-action btn-action--cancel" @click="editId = null">
                        <X :size="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p v-if="storeError && !showNewForm" class="form-error">{{ storeError }}</p>

      </section>

      <!-- ────────────────── STATS ──────────────────────────────── -->
      <section v-if="tab === 'stats'">

        <div class="section-header">
          <h2 class="section-title">Estadísticas diarias</h2>
          <div class="date-picker-wrap">
            <CalendarDays :size="14" class="date-icon" />
            <input
              v-model="statsDate"
              type="date"
              class="date-input"
              @change="loadStats"
            />
          </div>
        </div>

        <div v-if="statsLoading" class="loading-text">Cargando…</div>
        <div v-else-if="stats.length === 0" class="empty-text">
          Sin registros para esa fecha.
        </div>
        <template v-else>
          <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Tienda</th>
                  <th>Ciudad</th>
                  <th>Email</th>
                  <th>Comisión</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in stats" :key="`${row.store_id}-${row.registration_date}`">
                  <td><div class="store-name">{{ row.store_name }}</div></td>
                  <td>{{ row.store_city }}</td>
                  <td class="email-cell">{{ row.store_owner_email }}</td>
                  <td>{{ Math.round(row.commission_rate * 100) }}%</td>
                  <td><strong>{{ row.registrations }}</strong></td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="4">Total</td>
                  <td><strong>{{ totalRegsForDate }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>

      </section>

    </main>
  </div>
</template>

<style scoped>
/* ── Variables locales ─────────────────────────────────────────── */
:root { --admin-gold: #c9a84c; }

/* ── Login ─────────────────────────────────────────────────────── */
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 360px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-icon {
  color: var(--gold);
  display: flex;
  justify-content: center;
}

.login-title {
  font-family: var(--font-title);
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #c9a84c 0%, #e8d183 60%, #c9a84c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.login-sub {
  color: var(--text-muted);
  font-size: 0.82rem;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.login-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: var(--font-mono);
  box-sizing: border-box;
  outline: none;
  transition: border-color var(--transition);
}
.login-input:focus { border-color: var(--gold-border); }

.login-error {
  color: var(--red-light);
  font-size: 0.8rem;
  margin: 0;
}

/* ── Admin layout ──────────────────────────────────────────────── */
.admin-wrap {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}

.admin-header {
  background: rgba(13, 11, 20, 0.9);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(16px);
}

.admin-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.admin-brand-icon { color: var(--gold); }

.admin-brand-name {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.btn-exit {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: inherit;
  padding: 0.28rem 0.65rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-exit:hover {
  border-color: rgba(176, 32, 64, 0.45);
  color: var(--red-light);
}

/* ── Tabs ──────────────────────────────────────────────────────── */
.admin-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.8rem 1.1rem;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  margin-bottom: -1px;
}
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

/* ── Main ──────────────────────────────────────────────────────── */
.admin-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 3rem;
  width: 100%;
  box-sizing: border-box;
}

/* ── Overview ──────────────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.73rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-value--sm {
  font-size: 0.95rem;
  line-height: 1.4;
}

.overview-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ── Section header ────────────────────────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* ── Buttons ───────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--gold);
  color: #0d0b14;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: opacity var(--transition);
}
.btn-primary:hover:not(:disabled) { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-sm { padding: 0.38rem 0.8rem; font-size: 0.78rem; }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-family: inherit;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-outline:hover { border-color: var(--gold-border); color: var(--gold); }

.btn-link {
  background: none;
  border: none;
  color: var(--gold);
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

/* ── Form card ─────────────────────────────────────────────────── */
.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.form-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  width: 120px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  padding: 0.45rem 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
}
.form-input:focus { border-color: var(--gold-border); }
.form-input--sm { max-width: 100px; flex: unset; }
.form-input--xs { max-width: 70px; flex: unset; }

.form-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  padding-top: 0.25rem;
}

.form-error {
  color: var(--red-light);
  font-size: 0.8rem;
  margin: 0;
}

/* ── Table ─────────────────────────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.admin-table th {
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.7rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.admin-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: middle;
}

.admin-table tbody tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover td { background: rgba(255,255,255,0.02); }

.edit-row td { background: rgba(201,168,76,0.04); }

.store-name {
  color: var(--text-primary);
  font-weight: 500;
}

.store-city {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.email-cell {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.code-pill {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  color: var(--gold);
  letter-spacing: 0.04em;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.18rem 0.6rem;
  border-radius: 20px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition);
  letter-spacing: 0.04em;
}
.status-badge--on {
  background: rgba(52, 199, 89, 0.1);
  border-color: rgba(52, 199, 89, 0.3);
  color: var(--green-light);
}
.status-badge--on:hover {
  background: rgba(52, 199, 89, 0.18);
}
.status-badge--off {
  background: rgba(176, 32, 64, 0.08);
  border-color: rgba(176, 32, 64, 0.25);
  color: var(--red-light);
}
.status-badge--off:hover {
  background: rgba(176, 32, 64, 0.15);
}

.action-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-family: inherit;
  padding: 0.22rem 0.5rem;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.btn-action:hover {
  border-color: var(--gold-border);
  color: var(--gold);
}
.btn-action--confirm:hover {
  border-color: rgba(52, 199, 89, 0.4);
  color: var(--green-light);
}
.btn-action--cancel:hover {
  border-color: rgba(176, 32, 64, 0.4);
  color: var(--red-light);
}

.action-label { font-size: 0.7rem; }

.edit-notes-wrap {
  margin-top: 0.4rem;
}

.pct-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

/* ── Stats ─────────────────────────────────────────────────────── */
.date-picker-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-icon { color: var(--text-muted); }

.date-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.4rem 0.75rem;
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition);
  color-scheme: dark;
}
.date-input:focus { border-color: var(--gold-border); }

.total-row td {
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
}

/* ── Misc ──────────────────────────────────────────────────────── */
.loading-text {
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 2rem 0;
  text-align: center;
}

.empty-text {
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 2.5rem 0;
  text-align: center;
}
</style>
