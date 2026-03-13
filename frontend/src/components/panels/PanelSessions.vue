<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { SessionGroup, EventEntry } from '@/types/character'
import { Plus, Trash2, Edit2, Check, X, SendHorizontal, CheckCircle2, Loader2, Globe } from 'lucide-vue-next'

const charStore = useCharacterStore()
const authStore = useAuthStore()
const char = computed(() => charStore.activeCharacter!)
const characterId = computed(() => charStore.currentCharacterId)
function save() { charStore.scheduleAutoSave() }

const extractingLore = ref(false)

const selectedId   = ref<number | null>(null)
const sidebarOpen  = ref(false)
const newEntryText = ref('')
const renamingId   = ref<number | null>(null)
const renameText   = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const chatRef        = ref<HTMLDivElement | null>(null)
const textareaRef    = ref<HTMLTextAreaElement | null>(null)

// ── Init ──────────────────────────────────────────────────────────
onMounted(() => {
  if (!char.value) return
  if (!Array.isArray(char.value.sessions)) char.value.sessions = []
  // Migrate legacy events
  if (char.value.sessions.length === 0 && char.value.events?.length > 0) {
    char.value.sessions = [{
      id: 1, name: 'Session 1',
      date: new Date().toISOString().slice(0, 10),
      entries: [...char.value.events],
    }]
    save()
  }
  if (char.value.sessions.length > 0 && selectedId.value === null) {
    // Select last non-finalized, or last overall
    const active = char.value.sessions.filter(s => !s.finalized)
    selectedId.value = active.length > 0
      ? active[active.length - 1].id
      : char.value.sessions[char.value.sessions.length - 1].id
  }
})

const selectedSession = computed<SessionGroup | null>(() =>
  char.value?.sessions?.find(s => s.id === selectedId.value) ?? null
)

// ── Session CRUD ──────────────────────────────────────────────────
function selectSession(id: number) {
  selectedId.value = id
  sidebarOpen.value = false
}

function nextId(): number {
  const sessions = char.value.sessions ?? []
  return sessions.length === 0 ? 1 : Math.max(...sessions.map(s => s.id)) + 1
}

function createSession() {
  const n = (char.value.sessions?.length ?? 0) + 1
  const session: SessionGroup = {
    id: nextId(),
    name: `Session ${n}`,
    date: new Date().toISOString().slice(0, 10),
    entries: [],
  }
  if (!Array.isArray(char.value.sessions)) char.value.sessions = []
  char.value.sessions.push(session)
  selectedId.value = session.id
  save()
}

function deleteSession(id: number) {
  if (!confirm('Delete this session and all its entries?')) return
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

// ── Finalizar sesión ──────────────────────────────────────────────
async function finalizeSession() {
  if (!selectedSession.value) return
  const s = selectedSession.value
  // Auto-add date to name if still default
  if (/^Session \d+$/.test(s.name)) {
    const d = new Date()
    const dd = d.getDate().toString().padStart(2, '0')
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const yy = d.getFullYear().toString().slice(2)
    s.name = `${s.name} — ${dd}/${mm}/${yy}`
  }
  s.finalized = true
  save()

  // Trigger lore extraction (no cooldown on finalize)
  if (characterId.value && s.entries.length > 0) {
    extractingLore.value = true
    try {
      const res = await fetch(`/api/characters/${characterId.value}/extract-lore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.getToken()}`,
        },
        body: JSON.stringify({ sessionId: s.id }),
      })
      if (res.ok) {
        const { worldLore } = await res.json()
        if (char.value) char.value.worldLore = worldLore
      }
    } catch (_) {
      // Lore extraction failure is non-fatal
    } finally {
      extractingLore.value = false
    }
  }
}

// ── Entries ───────────────────────────────────────────────────────
async function addEntry() {
  if (!selectedSession.value || !newEntryText.value.trim()) return
  if (selectedSession.value.finalized) return

  const now = new Date()
  const t = now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0')

  const entry: EventEntry = {
    id:  Date.now(),
    t,
    txt: newEntryText.value.trim(),
  }
  selectedSession.value.entries.push(entry)   // push → oldest first (chat order)
  newEntryText.value = ''
  save()

  await nextTick()
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  textareaRef.value?.focus()
}

function removeEntry(entryId: number) {
  if (!selectedSession.value) return
  const idx = selectedSession.value.entries.findIndex(e => e.id === entryId)
  if (idx !== -1) { selectedSession.value.entries.splice(idx, 1); save() }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    addEntry()
  }
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<template>
  <section v-if="char" class="panel sessions-panel">
    <h2 class="panel-title">Sessions</h2>

    <div class="sessions-layout">

      <!-- ── Sidebar ─────────────────────────────────────────────── -->
      <aside class="sessions-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <span class="sidebar-title">Sessions</span>
          <button class="btn-new-session" @click="createSession" title="New session">
            <Plus :size="14" />
          </button>
        </div>

        <ul class="session-list">
          <li
            v-for="session in [...char.sessions].reverse()"
            :key="session.id"
            class="session-item"
            :class="{ active: selectedId === session.id, finalized: session.finalized }"
            @click="selectSession(session.id)"
          >
            <div class="session-item-main">
              <template v-if="renamingId === session.id">
                <input
                  ref="renameInputRef"
                  v-model="renameText"
                  class="rename-input"
                  @keydown.enter="commitRename"
                  @keydown.escape="renamingId = null"
                  @blur="commitRename"
                  @click.stop
                />
              </template>
              <template v-else>
                <div class="session-name-row">
                  <CheckCircle2 v-if="session.finalized" :size="11" class="finalized-icon" />
                  <span class="session-name">{{ session.name }}</span>
                </div>
                <span class="session-date">{{ fmtDate(session.date) }} · {{ session.entries.length }} entries</span>
              </template>
            </div>
            <div class="session-item-actions" @click.stop>
              <button @click="startRename(session)" title="Rename" class="icon-btn"><Edit2 :size="11" /></button>
              <button @click="deleteSession(session.id)" title="Delete" class="icon-btn icon-btn-del"><Trash2 :size="11" /></button>
            </div>
          </li>
        </ul>

        <div v-if="char.sessions.length === 0" class="sidebar-empty">
          No sessions.<br>Press + to start one.
        </div>
      </aside>

      <!-- ── Mobile toggle ───────────────────────────────────────── -->
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        {{ sidebarOpen ? '✕ Close' : '☰ Sessions' }}
      </button>

      <!-- ── Main chat area ──────────────────────────────────────── -->
      <div class="sessions-main">
        <template v-if="selectedSession">

          <!-- Chat header -->
          <div class="chat-header">
            <div class="chat-title-wrap">
              <span class="chat-title">{{ selectedSession.name }}</span>
              <span v-if="selectedSession.finalized" class="finalized-badge">Finalizada</span>
            </div>
            <button
              v-if="!selectedSession.finalized"
              class="btn-finalize"
              :disabled="extractingLore"
              @click="finalizeSession"
              title="Mark session as finished — also extracts World Lore"
            >
              <Loader2 v-if="extractingLore" :size="13" class="spin" />
              <Check v-else :size="13" />
              {{ extractingLore ? 'Analyzing…' : 'Finalizar sesión' }}
            </button>
            <span v-if="extractingLore" class="lore-hint">
              <Globe :size="11" /> Extracting world lore…
            </span>
          </div>

          <!-- Chat messages -->
          <div class="chat-messages" ref="chatRef">
            <div v-if="selectedSession.entries.length === 0" class="chat-empty">
              No entries yet — type your first note below.
            </div>
            <div
              v-for="entry in selectedSession.entries"
              :key="entry.id"
              class="chat-entry"
            >
              <span class="entry-time">{{ entry.t }}</span>
              <span class="entry-text">{{ entry.txt }}</span>
              <button class="btn-del-entry" @click="removeEntry(entry.id)" title="Remove">
                <X :size="11" />
              </button>
            </div>
          </div>

          <!-- Chat input -->
          <div class="chat-input-wrap" :class="{ disabled: selectedSession.finalized }">
            <textarea
              ref="textareaRef"
              v-model="newEntryText"
              :placeholder="selectedSession.finalized ? 'Session finalized — start a new one with +' : 'Take a note… (Enter to send, Shift+Enter for newline)'"
              :disabled="selectedSession.finalized"
              class="chat-textarea"
              rows="2"
              @keydown="onKeydown"
            />
            <button
              class="btn-send"
              :disabled="!newEntryText.trim() || selectedSession.finalized"
              @click="addEntry"
              title="Send (Enter)"
            >
              <SendHorizontal :size="18" />
            </button>
          </div>

        </template>

        <div v-else class="no-session">
          <p>Press <strong>+</strong> in the sidebar to start a new session.</p>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.sessions-panel { min-height: 480px; }

.sessions-layout {
  display: grid;
  grid-template-columns: 210px 1fr;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  height: 480px;
}

/* ── Sidebar ── */
.sessions-sidebar {
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.63rem;
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
.btn-new-session:hover { background: var(--gold-border); }

.session-list {
  list-style: none;
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0;
}

.session-item {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.4rem 0.5rem 0.4rem 0.75rem;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition);
}
.session-item:hover { background: rgba(201,168,76,0.05); }
.session-item.active {
  background: rgba(201,168,76,0.08);
  border-left-color: var(--gold);
}
.session-item.finalized { opacity: 0.65; }
.session-item.finalized.active { opacity: 1; }

.session-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }

.session-name-row { display: flex; align-items: center; gap: 0.3rem; }
.finalized-icon { color: var(--gold-dim); flex-shrink: 0; }

.session-name {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-item.active .session-name { color: var(--gold); font-weight: 600; }
.session-date { font-size: 0.65rem; color: var(--text-muted); }

.rename-input {
  background: var(--bg-input);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  width: 100%;
  outline: none;
}

.session-item-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity var(--transition);
  flex-shrink: 0;
}
.session-item:hover .session-item-actions,
.session-item.active .session-item-actions { opacity: 1; }

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
.icon-btn-del:hover { color: var(--red-light); }

.sidebar-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 2rem 1rem;
  line-height: 1.7;
}

/* ── Main chat ── */
.sessions-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
}

/* Chat header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 0.75rem;
}

.chat-title-wrap { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.chat-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--gold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.finalized-badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gold-dim);
  background: rgba(201,168,76,0.1);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
  flex-shrink: 0;
}

.btn-finalize {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition);
}
.btn-finalize:hover:not(:disabled) {
  border-color: var(--gold-border);
  color: var(--gold);
  background: rgba(201,168,76,0.08);
}
.btn-finalize:disabled { opacity: 0.6; cursor: default; }

.lore-hint {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  color: var(--gold-dim);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Chat messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chat-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: auto;
}

.chat-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid transparent;
  transition: border-color var(--transition);
}
.chat-entry:hover {
  border-color: var(--border);
}

.entry-time {
  font-size: 0.65rem;
  color: var(--gold-dim);
  font-weight: 600;
  white-space: nowrap;
  margin-top: 0.15rem;
  flex-shrink: 0;
  font-family: 'Courier New', monospace;
}

.entry-text {
  flex: 1;
  font-size: 0.84rem;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
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
  opacity: 0;
  transition: opacity var(--transition), color var(--transition);
}
.chat-entry:hover .btn-del-entry { opacity: 1; }
.btn-del-entry:hover { color: var(--red-light); }

/* Chat input */
.chat-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  flex-shrink: 0;
}
.chat-input-wrap.disabled { opacity: 0.5; }

.chat-textarea {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.45;
  padding: 0.45rem 0.6rem;
  outline: none;
  resize: none;
  transition: border-color var(--transition);
}
.chat-textarea:focus { border-color: var(--gold-dim); }
.chat-textarea::placeholder { color: var(--text-muted); opacity: 0.6; font-size: 0.8rem; }
.chat-textarea:disabled { cursor: not-allowed; }

.btn-send {
  background: rgba(201,168,76,0.12);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  color: var(--gold);
  cursor: pointer;
  padding: 0.45rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
}
.btn-send:hover:not(:disabled) { background: rgba(201,168,76,0.22); }
.btn-send:disabled { opacity: 0.35; cursor: not-allowed; }

/* No session */
.no-session {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 3rem;
  text-align: center;
}
.no-session strong { color: var(--gold); }

/* ── Mobile ── */
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
  .sessions-layout { grid-template-columns: 1fr; }
  .sessions-sidebar {
    display: none;
    position: absolute;
    left: 0; top: 0;
    width: 240px;
    height: 100%;
    z-index: 20;
    box-shadow: 4px 0 16px rgba(0,0,0,0.5);
  }
  .sessions-sidebar.open { display: flex; }
  .sidebar-toggle { display: block; }
  .sessions-main { padding-top: 0; }
}
</style>
