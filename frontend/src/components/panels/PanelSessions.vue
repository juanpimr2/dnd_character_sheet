<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { SessionGroup, EventEntry } from '@/types/character'
import { Plus, ChevronUp, ChevronDown, Trash2, Edit2, Check, X } from 'lucide-vue-next'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const selectedId = ref<number | null>(null)
const sidebarOpen = ref(false)
const newEntryText = ref('')
const renamingId = ref<number | null>(null)
const renameText = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

// Auto-migrate events → sessions[0] and ensure sessions array exists
onMounted(() => {
  if (!char.value) return
  if (!Array.isArray(char.value.sessions)) {
    char.value.sessions = []
  }
  if (char.value.sessions.length === 0 && char.value.events?.length > 0) {
    char.value.sessions = [{
      id: 1,
      name: 'Sesión 1',
      date: new Date().toISOString().slice(0, 10),
      entries: [...char.value.events],
    }]
    save()
  }
  if (char.value.sessions.length > 0 && selectedId.value === null) {
    selectedId.value = char.value.sessions[char.value.sessions.length - 1].id
  }
})

const selectedSession = computed<SessionGroup | null>(() =>
  char.value?.sessions?.find(s => s.id === selectedId.value) ?? null
)

function selectSession(id: number) {
  selectedId.value = id
  sidebarOpen.value = false
}

function nextId(): number {
  const sessions = char.value.sessions ?? []
  return sessions.length === 0 ? 1 : Math.max(...sessions.map(s => s.id)) + 1
}

function createSession() {
  const today = new Date().toISOString().slice(0, 10)
  const n = (char.value.sessions?.length ?? 0) + 1
  const session: SessionGroup = {
    id: nextId(),
    name: `Sesión ${n}`,
    date: today,
    entries: [],
  }
  if (!Array.isArray(char.value.sessions)) char.value.sessions = []
  char.value.sessions.push(session)
  selectedId.value = session.id
  save()
}

function deleteSession(id: number) {
  if (!confirm('¿Eliminar esta sesión y todas sus entradas?')) return
  const idx = char.value.sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  char.value.sessions.splice(idx, 1)
  if (selectedId.value === id) {
    selectedId.value = char.value.sessions.length > 0
      ? char.value.sessions[char.value.sessions.length - 1].id
      : null
  }
  save()
}

function moveSession(id: number, dir: -1 | 1) {
  const sessions = char.value.sessions
  const idx = sessions.findIndex(s => s.id === id)
  const target = idx + dir
  if (target < 0 || target >= sessions.length) return
  ;[sessions[idx], sessions[target]] = [sessions[target], sessions[idx]]
  save()
}

function startRename(session: SessionGroup) {
  renamingId.value = session.id
  renameText.value = session.name
  nextTick(() => renameInputRef.value?.focus())
}

function commitRename() {
  if (renamingId.value === null) return
  const session = char.value.sessions.find(s => s.id === renamingId.value)
  if (session && renameText.value.trim()) {
    session.name = renameText.value.trim()
    save()
  }
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

function addEntry() {
  if (!selectedSession.value || !newEntryText.value.trim()) return
  const now = new Date()
  const t = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  const entry: EventEntry = {
    id: Date.now(),
    t,
    txt: newEntryText.value.trim(),
  }
  selectedSession.value.entries.unshift(entry)
  newEntryText.value = ''
  save()
}

function removeEntry(entryId: number) {
  if (!selectedSession.value) return
  const idx = selectedSession.value.entries.findIndex(e => e.id === entryId)
  if (idx !== -1) {
    selectedSession.value.entries.splice(idx, 1)
    save()
  }
}
</script>

<template>
  <section v-if="char" class="panel sessions-panel">
    <h2 class="panel-title">Sesiones</h2>

    <div class="sessions-layout">

      <!-- ── Sidebar (session list) ── -->
      <aside class="sessions-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <span class="sidebar-title">Sesiones</span>
          <button class="btn-new-session" @click="createSession" title="Nueva sesión">
            <Plus :size="14" />
          </button>
        </div>

        <ul class="session-list">
          <li
            v-for="(session, idx) in char.sessions"
            :key="session.id"
            class="session-item"
            :class="{ active: selectedId === session.id }"
          >
            <div class="session-item-main" @click="selectSession(session.id)">
              <template v-if="renamingId === session.id">
                <input
                  ref="renameInputRef"
                  v-model="renameText"
                  class="rename-input"
                  @keydown.enter="commitRename"
                  @keydown.escape="cancelRename"
                  @blur="commitRename"
                  @click.stop
                />
              </template>
              <span v-else class="session-name">{{ session.name }}</span>
            </div>
            <div class="session-item-actions">
              <button @click.stop="startRename(session)" title="Renombrar" class="icon-btn">
                <Edit2 :size="11" />
              </button>
              <button @click.stop="moveSession(session.id, -1)" :disabled="idx === 0" title="Subir" class="icon-btn">
                <ChevronUp :size="11" />
              </button>
              <button @click.stop="moveSession(session.id, 1)" :disabled="idx === char.sessions.length - 1" title="Bajar" class="icon-btn">
                <ChevronDown :size="11" />
              </button>
              <button @click.stop="deleteSession(session.id)" title="Eliminar" class="icon-btn icon-btn-del">
                <Trash2 :size="11" />
              </button>
            </div>
          </li>
        </ul>

        <div v-if="char.sessions.length === 0" class="sidebar-empty">
          Sin sesiones.<br>Crea una nueva.
        </div>
      </aside>

      <!-- ── Mobile sidebar toggle ── -->
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        {{ sidebarOpen ? '✕ Cerrar' : '☰ Sesiones' }}
      </button>

      <!-- ── Main area ── -->
      <div class="sessions-main">
        <template v-if="selectedSession">
          <!-- Session header -->
          <div class="session-header">
            <div class="session-title-row">
              <h3 class="session-title">{{ selectedSession.name }}</h3>
              <input
                type="date"
                v-model="selectedSession.date"
                @change="save"
                class="date-input"
              />
            </div>
          </div>

          <!-- New entry form -->
          <div class="entry-form">
            <textarea
              v-model="newEntryText"
              placeholder="Añadir nueva entrada…"
              class="entry-textarea"
              rows="2"
              @keydown.ctrl.enter="addEntry"
            ></textarea>
            <button class="btn-outline btn-add-entry" @click="addEntry" :disabled="!newEntryText.trim()">
              Añadir
            </button>
          </div>

          <!-- Entries list -->
          <ul class="entries-list">
            <li
              v-for="entry in selectedSession.entries"
              :key="entry.id"
              class="entry-item"
            >
              <span class="entry-time">{{ entry.t }}</span>
              <span class="entry-text">{{ entry.txt }}</span>
              <button class="btn-del-entry" @click="removeEntry(entry.id)" title="Eliminar entrada">
                <X :size="12" />
              </button>
            </li>
            <li v-if="selectedSession.entries.length === 0" class="entries-empty">
              Sin entradas en esta sesión.
            </li>
          </ul>
        </template>

        <div v-else class="no-session">
          <span>Selecciona o crea una sesión para empezar.</span>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.sessions-panel {
  min-height: 420px;
}

.sessions-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
}

/* ── Sidebar ── */
.sessions-sidebar {
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 380px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.btn-new-session {
  background: var(--gold-subtle);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm);
  color: var(--gold);
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  display: flex;
  align-items: center;
  transition: all var(--transition);
}
.btn-new-session:hover {
  background: var(--gold-border);
}

.session-list {
  list-style: none;
  flex: 1;
  overflow-y: auto;
  padding: 0.3rem 0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem 0.35rem 0.75rem;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition);
}
.session-item:hover { background: rgba(201,168,76,0.06); }
.session-item.active {
  background: rgba(201,168,76,0.08);
  border-left-color: var(--gold);
}

.session-item-main {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.session-item.active .session-name { color: var(--gold); font-weight: 600; }

.rename-input {
  background: var(--bg-input);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.1rem 0.3rem;
  width: 100%;
  outline: none;
}

.session-item-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity var(--transition);
}
.session-item:hover .session-item-actions,
.session-item.active .session-item-actions {
  opacity: 1;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color var(--transition);
}
.icon-btn:hover { color: var(--gold); }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn-del:hover { color: var(--red-light); }

.sidebar-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 2rem 1rem;
  line-height: 1.6;
}

/* ── Main area ── */
.sessions-main {
  display: flex;
  flex-direction: column;
  padding: 0.85rem;
  gap: 0.75rem;
  background: var(--bg-card);
}

.session-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.6rem;
}

.session-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.session-title {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 600;
  color: var(--gold);
}

.date-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.78rem;
  padding: 0.2rem 0.4rem;
  outline: none;
  color-scheme: dark;
}
.date-input:focus { border-color: var(--gold-dim); }

/* ── Entry form ── */
.entry-form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.entry-textarea {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.45rem 0.6rem;
  outline: none;
  resize: vertical;
  min-height: 52px;
  transition: border-color var(--transition);
}
.entry-textarea:focus { border-color: var(--gold-dim); }

.btn-add-entry {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Entries list ── */
.entries-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  max-height: 320px;
}

.entry-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: var(--bg-elevated);
  border: 1px solid rgba(201,168,76,0.1);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  transition: border-color var(--transition);
}
.entry-item:hover { border-color: var(--border); }

.entry-time {
  font-size: 0.68rem;
  color: var(--gold-dim);
  font-weight: 600;
  white-space: nowrap;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.entry-text {
  flex: 1;
  font-size: 0.83rem;
  color: var(--text-secondary);
  line-height: 1.45;
  word-break: break-word;
}

.btn-del-entry {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
  transition: color var(--transition);
  opacity: 0;
  transition: opacity var(--transition), color var(--transition);
}
.entry-item:hover .btn-del-entry { opacity: 1; }
.btn-del-entry:hover { color: var(--red-light); }

.entries-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 1.5rem;
}

.no-session {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 3rem;
}

/* ── Mobile sidebar toggle ── */
.sidebar-toggle {
  display: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--gold-dim);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  transition: all var(--transition);
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
}

@media (max-width: 640px) {
  .sessions-layout {
    grid-template-columns: 1fr;
  }

  .sessions-sidebar {
    display: none;
    position: absolute;
    left: 0;
    top: 0;
    width: 240px;
    height: 100%;
    z-index: 20;
    box-shadow: 4px 0 16px rgba(0,0,0,0.5);
  }

  .sessions-sidebar.open {
    display: flex;
  }

  .sidebar-toggle {
    display: block;
  }

  .sessions-main {
    padding-top: 2.8rem;
  }
}
</style>
