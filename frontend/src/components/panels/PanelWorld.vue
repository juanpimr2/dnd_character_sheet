<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { WorldEntity, EntityKind, LoreFlag } from '@/types/character'
import { Globe, Loader2, X, Flag, MapPin, User, Shield, Building2, Star, AlertTriangle, Eye, StickyNote } from 'lucide-vue-next'

const charStore  = useCharacterStore()
const authStore  = useAuthStore()
const char       = computed(() => charStore.activeCharacter!)
const charId     = computed(() => charStore.currentCharacterId)

// ── Lore data ──────────────────────────────────────────────────────
const worldLore  = computed(() => char.value?.worldLore ?? { entities: [] })
const entities   = computed<WorldEntity[]>(() => worldLore.value.entities ?? [])

// ── Manual analysis ───────────────────────────────────────────────
const analyzing     = ref(false)
const analyzeError  = ref('')
const cooldownSecs  = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldownDisplay(remaining: number) {
  cooldownSecs.value = remaining
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldownSecs.value -= 1
    if (cooldownSecs.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
      cooldownSecs.value = 0
    }
  }, 1000)
}

async function analyzeNotes() {
  if (analyzing.value || cooldownSecs.value > 0) return
  analyzing.value   = true
  analyzeError.value = ''
  try {
    const res = await fetch(`/api/characters/${charId.value}/extract-lore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.getToken()}`,
      },
      body: JSON.stringify({ manual: true }),
    })
    const json = await res.json()
    if (res.status === 429) {
      startCooldownDisplay(json.remaining)
      return
    }
    if (!res.ok) { analyzeError.value = json.error ?? 'Error'; return }
    if (char.value) char.value.worldLore = json.worldLore
    charStore.scheduleAutoSave()
  } catch {
    analyzeError.value = 'Network error'
  } finally {
    analyzing.value = false
  }
}

// ── Dragging nodes ────────────────────────────────────────────────
const canvasRef = ref<HTMLDivElement | null>(null)

const dragging = reactive<{
  id: number | null
  startX: number
  startY: number
  origX: number
  origY: number
}>({ id: null, startX: 0, startY: 0, origX: 0, origY: 0 })

function onNodeMousedown(e: MouseEvent, entity: WorldEntity) {
  if (e.button !== 0) return
  e.preventDefault()
  dragging.id     = entity.id
  dragging.startX = e.clientX
  dragging.startY = e.clientY
  dragging.origX  = entity.x
  dragging.origY  = entity.y
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
}

function onMousemove(e: MouseEvent) {
  if (dragging.id === null || !canvasRef.value) return
  const rect   = canvasRef.value.getBoundingClientRect()
  const dx     = ((e.clientX - dragging.startX) / rect.width)  * 100
  const dy     = ((e.clientY - dragging.startY) / rect.height) * 100
  const entity = entities.value.find(en => en.id === dragging.id)
  if (entity) {
    entity.x = Math.max(2, Math.min(95, dragging.origX + dx))
    entity.y = Math.max(2, Math.min(95, dragging.origY + dy))
  }
}

function onMouseup() {
  if (dragging.id !== null) charStore.scheduleAutoSave()
  dragging.id = null
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup',   onMouseup)
}

// ── Detail panel ──────────────────────────────────────────────────
const detailId = ref<number | null>(null)
const detail   = computed<WorldEntity | null>(() =>
  entities.value.find(e => e.id === detailId.value) ?? null
)

function openDetail(entity: WorldEntity) { detailId.value = entity.id }
function closeDetail() { detailId.value = null }

// ── Flag management ───────────────────────────────────────────────
const FLAG_TYPES: { type: LoreFlag['type']; label: string; icon: any; color: string }[] = [
  { type: 'visit',  label: 'Visited',  icon: Eye,           color: '#7eb8f7' },
  { type: 'ally',   label: 'Ally',     icon: Star,          color: '#b8d97e' },
  { type: 'enemy',  label: 'Enemy',    icon: AlertTriangle, color: '#f7817e' },
  { type: 'danger', label: 'Danger',   icon: AlertTriangle, color: '#f7c87e' },
  { type: 'quest',  label: 'Quest',    icon: Flag,          color: '#c9a84c' },
  { type: 'note',   label: 'Note',     icon: StickyNote,    color: '#a07ef7' },
]

function toggleFlag(entity: WorldEntity, type: LoreFlag['type']) {
  if (!entity.flags) entity.flags = []
  const idx = entity.flags.findIndex(f => f.type === type)
  if (idx === -1) entity.flags.push({ type })
  else entity.flags.splice(idx, 1)
  charStore.scheduleAutoSave()
}

function hasFlag(entity: WorldEntity, type: LoreFlag['type']): boolean {
  return entity.flags?.some(f => f.type === type) ?? false
}

// ── Kind helpers ─────────────────────────────────────────────────
const KIND_ICON: Record<EntityKind, any> = {
  city:     Building2,
  location: MapPin,
  npc:      User,
  faction:  Shield,
}
const KIND_COLOR: Record<EntityKind, string> = {
  city:     '#c9a84c',
  location: '#7eb8f7',
  npc:      '#b8d97e',
  faction:  '#f7817e',
}
const KIND_SIZE: Record<EntityKind, 'lg' | 'md' | 'sm' | 'sm'> = {
  city:     'lg',
  location: 'md',
  npc:      'sm',
  faction:  'sm',
}

// ── Session names for detail ───────────────────────────────────────
function sessionName(id: number): string {
  return char.value?.sessions?.find(s => s.id === id)?.name ?? `Session ${id}`
}

// ── Last analysis fmt ─────────────────────────────────────────────
function fmtTime(iso?: string): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Delete entity ─────────────────────────────────────────────────
function deleteEntity(id: number) {
  if (!char.value?.worldLore) return
  char.value.worldLore.entities = char.value.worldLore.entities.filter(e => e.id !== id)
  if (detailId.value === id) detailId.value = null
  charStore.scheduleAutoSave()
}
</script>

<template>
  <section v-if="char" class="panel world-panel">
    <!-- Header -->
    <div class="panel-header">
      <h2 class="panel-title">World Lore</h2>
      <div class="header-right">
        <span class="last-analysis">Last analysis: {{ fmtTime(worldLore.lastAnalysis) }}</span>
        <button
          class="btn-analyze"
          :disabled="analyzing || cooldownSecs > 0"
          @click="analyzeNotes"
          title="Analyze all session notes with AI"
        >
          <Loader2 v-if="analyzing" :size="13" class="spin" />
          <Globe v-else :size="13" />
          <template v-if="cooldownSecs > 0">Cooldown {{ cooldownSecs }}s</template>
          <template v-else-if="analyzing">Analyzing…</template>
          <template v-else>Analyze notes</template>
        </button>
      </div>
    </div>

    <div v-if="analyzeError" class="analyze-error">{{ analyzeError }}</div>

    <!-- Empty state -->
    <div v-if="entities.length === 0 && !analyzing" class="world-empty">
      <Globe :size="36" class="empty-icon" />
      <p>No world entities yet.</p>
      <p class="muted">Finalize a session to auto-extract lore, or press <strong>Analyze notes</strong> to scan all sessions.</p>
    </div>

    <!-- Canvas + detail side by side -->
    <div v-else class="world-layout">

      <!-- Node canvas -->
      <div
        ref="canvasRef"
        class="world-canvas"
        @click.self="closeDetail"
      >
        <!-- Grid texture overlay (CSS) -->
        <div class="canvas-bg" />

        <!-- Legend -->
        <div class="legend">
          <div v-for="(col, kind) in KIND_COLOR" :key="kind" class="legend-item">
            <component :is="KIND_ICON[kind as EntityKind]" :size="10" :style="{ color: col }" />
            <span>{{ kind }}</span>
          </div>
        </div>

        <!-- Entity nodes -->
        <div
          v-for="entity in entities"
          :key="entity.id"
          class="entity-node"
          :class="[`node-${KIND_SIZE[entity.kind]}`, { selected: detailId === entity.id }]"
          :style="{ left: entity.x + '%', top: entity.y + '%', '--kind-color': KIND_COLOR[entity.kind] }"
          @mousedown="onNodeMousedown($event, entity)"
          @click.stop="openDetail(entity)"
        >
          <component :is="KIND_ICON[entity.kind]" :size="12" class="node-icon" />
          <span class="node-label">{{ entity.name }}</span>
          <!-- Active flags dots -->
          <div v-if="entity.flags?.length" class="node-flags">
            <span
              v-for="flag in entity.flags.slice(0, 3)"
              :key="flag.type"
              class="flag-dot"
              :style="{ background: FLAG_TYPES.find(f => f.type === flag.type)?.color ?? '#888' }"
            />
          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <aside v-if="detail" class="detail-panel">
        <div class="detail-header">
          <div class="detail-title-row">
            <component :is="KIND_ICON[detail.kind]" :size="14" :style="{ color: KIND_COLOR[detail.kind] }" />
            <span class="detail-name">{{ detail.name }}</span>
            <span class="detail-kind">{{ detail.kind }}</span>
          </div>
          <button class="btn-close-detail" @click="closeDetail"><X :size="14" /></button>
        </div>

        <p class="detail-desc">{{ detail.description || 'No description yet.' }}</p>

        <!-- Sessions -->
        <div v-if="detail.sessions.length" class="detail-sessions">
          <div class="detail-section-label">Mentioned in</div>
          <div v-for="sid in detail.sessions" :key="sid" class="session-pill">
            {{ sessionName(sid) }}
          </div>
        </div>

        <!-- Flags -->
        <div class="detail-flags">
          <div class="detail-section-label">Flags</div>
          <div class="flags-grid">
            <button
              v-for="ft in FLAG_TYPES"
              :key="ft.type"
              class="flag-btn"
              :class="{ active: hasFlag(detail, ft.type) }"
              :style="{ '--flag-color': ft.color }"
              @click="toggleFlag(detail, ft.type)"
              :title="ft.label"
            >
              <component :is="ft.icon" :size="12" />
              {{ ft.label }}
            </button>
          </div>
        </div>

        <button class="btn-del-entity" @click="deleteEntity(detail.id)">
          <X :size="11" /> Remove entity
        </button>
      </aside>

    </div>
  </section>
</template>

<style scoped>
.world-panel { user-select: none; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.last-analysis {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.btn-analyze {
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
  padding: 0.28rem 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}
.btn-analyze:hover:not(:disabled) {
  border-color: var(--gold-border);
  color: var(--gold);
  background: rgba(201,168,76,0.08);
}
.btn-analyze:disabled { opacity: 0.45; cursor: default; }

.analyze-error {
  font-size: 0.78rem;
  color: var(--red-light);
  margin-bottom: 0.5rem;
}

/* ── Empty state ── */
.world-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary);
}
.empty-icon { color: var(--text-muted); opacity: 0.4; }
.muted { font-size: 0.82rem; color: var(--text-muted); max-width: 360px; }
.muted strong { color: var(--gold-dim); }

/* ── Layout ── */
.world-layout {
  display: flex;
  gap: 0.75rem;
  height: 520px;
}

/* ── Canvas ── */
.world-canvas {
  flex: 1;
  position: relative;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #0e1014;
  cursor: default;
}

.canvas-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(201,168,76,0.03) 0%, transparent 50%),
    radial-gradient(circle at 75% 70%, rgba(126,184,247,0.03) 0%, transparent 50%),
    linear-gradient(rgba(201,168,76,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201,168,76,0.035) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
  pointer-events: none;
}

/* ── Legend ── */
.legend {
  position: absolute;
  bottom: 0.6rem;
  left: 0.75rem;
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

/* ── Nodes ── */
.entity-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.1s;
}
.entity-node:hover { z-index: 10; transform: translate(-50%, -50%) scale(1.08); }
.entity-node.selected { z-index: 20; }

.node-icon {
  padding: 0.35rem;
  border-radius: 50%;
  border: 2px solid var(--kind-color, #888);
  color: var(--kind-color, #888);
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px color-mix(in srgb, var(--kind-color, #888) 40%, transparent);
}
.node-lg .node-icon { padding: 0.5rem; }
.node-sm .node-icon { padding: 0.25rem; }

.entity-node.selected .node-icon {
  box-shadow: 0 0 14px var(--kind-color, #888), 0 0 4px white;
}

.node-label {
  font-size: 0.62rem;
  color: var(--text-secondary);
  white-space: nowrap;
  text-shadow: 0 1px 3px #000, 0 0 8px #000;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-flags {
  display: flex;
  gap: 2px;
  margin-top: 1px;
}
.flag-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  opacity: 0.85;
}

/* ── Detail panel ── */
.detail-panel {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
}
.detail-title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex-wrap: wrap;
}
.detail-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}
.detail-kind {
  font-size: 0.62rem;
  text-transform: capitalize;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.05rem 0.4rem;
}

.btn-close-detail {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 3px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.btn-close-detail:hover { color: var(--text-primary); }

.detail-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.detail-section-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.detail-sessions { display: flex; flex-direction: column; gap: 0.25rem; }
.session-pill {
  font-size: 0.72rem;
  color: var(--gold-dim);
  background: rgba(201,168,76,0.07);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.flag-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  padding: 0.15rem 0.45rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition);
}
.flag-btn:hover,
.flag-btn.active {
  border-color: var(--flag-color);
  color: var(--flag-color);
  background: color-mix(in srgb, var(--flag-color) 12%, transparent);
}

.btn-del-entity {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  padding: 0.2rem 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  margin-top: auto;
  transition: all var(--transition);
}
.btn-del-entity:hover { color: var(--red-light); border-color: rgba(220,50,50,0.3); }

/* Animations */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
