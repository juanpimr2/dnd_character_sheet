<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { WorldEntity, EntityKind, LoreFlag } from '@/types/character'
import { Globe, Loader2, X, MapPin, User, Shield, Building2, ChevronLeft } from 'lucide-vue-next'

const charStore = useCharacterStore()
const authStore = useAuthStore()
const char      = computed(() => charStore.activeCharacter!)
const charId    = computed(() => charStore.currentCharacterId)
const worldLore = computed(() => char.value?.worldLore ?? { entities: [] })
const entities  = computed<WorldEntity[]>(() => worldLore.value.entities ?? [])

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '') }

// ── Hierarchy ─────────────────────────────────────────────────────
type ViewMode = 'world' | 'city'
const viewMode  = ref<ViewMode>('world')
const drillCity = ref<WorldEntity | null>(null)

// Top-level = no parent
const topLevel = computed(() => entities.value.filter(e => !e.parent))

// Children of the current drilled city
const children = computed(() => {
  if (!drillCity.value) return []
  const pn = norm(drillCity.value.name)
  return entities.value.filter(e => e.parent && norm(e.parent) === pn)
})

function childCount(e: WorldEntity) {
  const n = norm(e.name)
  return entities.value.filter(c => c.parent && norm(c.parent) === n).length
}

function drillIn(entity: WorldEntity) {
  drillCity.value = entity
  viewMode.value  = 'city'
  detailId.value  = null
}
function drillOut() {
  viewMode.value  = 'world'
  drillCity.value = null
  detailId.value  = null
}

// Radial position for children in city view (percentage)
function radialPos(idx: number, total: number) {
  const r     = total <= 3 ? 30 : total <= 6 ? 34 : 37
  const angle = (idx / total) * 2 * Math.PI - Math.PI / 2
  return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) }
}

// ── Manual analysis ───────────────────────────────────────────────
// ── Reset lore ────────────────────────────────────────────────────
function resetLore() {
  if (!confirm('Clear all world entities? Press Analyze notes afterwards to rebuild from scratch.')) return
  if (char.value) {
    char.value.worldLore = { entities: [] }
    if (viewMode.value === 'city') drillOut()
    detailId.value = null
    charStore.scheduleAutoSave()
  }
}

const analyzing    = ref(false)
const analyzeError = ref('')
const cooldownSecs = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(secs: number) {
  cooldownSecs.value = secs
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (--cooldownSecs.value <= 0) { clearInterval(cooldownTimer!); cooldownTimer = null }
  }, 1000)
}

async function analyzeNotes() {
  if (analyzing.value || cooldownSecs.value > 0) return
  analyzing.value = true; analyzeError.value = ''
  try {
    const res  = await fetch(`/api/characters/${charId.value}/extract-lore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.getToken()}` },
      body: JSON.stringify({ manual: true }),
    })
    const json = await res.json()
    if (res.status === 429) { startCooldown(json.remaining); return }
    if (!res.ok) { analyzeError.value = json.error ?? 'Error'; return }
    if (char.value) char.value.worldLore = json.worldLore
    charStore.scheduleAutoSave()
  } catch { analyzeError.value = 'Network error' }
  finally   { analyzing.value = false }
}

// ── Dragging (world view only) ────────────────────────────────────
const canvasRef = ref<HTMLDivElement | null>(null)
const drag = reactive<{ id: number | null; sx: number; sy: number; ox: number; oy: number }>({
  id: null, sx: 0, sy: 0, ox: 0, oy: 0,
})

function onMousedown(e: MouseEvent, entity: WorldEntity) {
  if (e.button !== 0 || viewMode.value !== 'world') return
  e.preventDefault()
  drag.id = entity.id; drag.sx = e.clientX; drag.sy = e.clientY
  drag.ox = entity.x;  drag.oy = entity.y
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
}
function onMousemove(e: MouseEvent) {
  if (!drag.id || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const ent  = entities.value.find(en => en.id === drag.id)
  if (ent) {
    ent.x = Math.max(4, Math.min(93, drag.ox + ((e.clientX - drag.sx) / rect.width)  * 100))
    ent.y = Math.max(8, Math.min(90, drag.oy + ((e.clientY - drag.sy) / rect.height) * 100))
  }
}
function onMouseup() {
  if (drag.id) charStore.scheduleAutoSave()
  drag.id = null
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup',   onMouseup)
}

// ── Detail panel ──────────────────────────────────────────────────
const detailId = ref<number | null>(null)
const detail   = computed<WorldEntity | null>(() => entities.value.find(e => e.id === detailId.value) ?? null)
function openDetail(entity: WorldEntity) { detailId.value = entity.id }
function closeDetail() { detailId.value = null }

// ── Flags ─────────────────────────────────────────────────────────
const FLAGS = [
  { type: 'visit'  as LoreFlag['type'], label: 'Visited', color: '#2a6aaa' },
  { type: 'ally'   as LoreFlag['type'], label: 'Ally',    color: '#2a7a3a' },
  { type: 'enemy'  as LoreFlag['type'], label: 'Enemy',   color: '#aa2a2a' },
  { type: 'danger' as LoreFlag['type'], label: 'Danger',  color: '#aa6a1a' },
  { type: 'quest'  as LoreFlag['type'], label: 'Quest',   color: '#7a5a00' },
  { type: 'note'   as LoreFlag['type'], label: 'Note',    color: '#6a2aaa' },
]
function flagColor(type: LoreFlag['type']) { return FLAGS.find(f => f.type === type)?.color ?? '#888' }
function toggleFlag(entity: WorldEntity, type: LoreFlag['type']) {
  if (!entity.flags) entity.flags = []
  const idx = entity.flags.findIndex(f => f.type === type)
  if (idx === -1) entity.flags.push({ type }); else entity.flags.splice(idx, 1)
  charStore.scheduleAutoSave()
}
function hasFlag(entity: WorldEntity, type: LoreFlag['type']) { return entity.flags?.some(f => f.type === type) ?? false }

// ── Kind config ───────────────────────────────────────────────────
const KIND_ICON: Record<EntityKind, any>    = { city: Building2, location: MapPin, npc: User, faction: Shield }
const KIND_COLOR: Record<EntityKind, string> = { city: '#7a4a08', location: '#1a3a6a', npc: '#1a5a28', faction: '#6a1818' }
const KIND_SIZE: Record<EntityKind, number>  = { city: 50, location: 40, npc: 34, faction: 34 }

// ── Utils ─────────────────────────────────────────────────────────
function sessionName(id: number) { return char.value?.sessions?.find(s => s.id === id)?.name ?? `Session ${id}` }
function fmtTime(iso?: string) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
         d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function deleteEntity(id: number) {
  if (!char.value?.worldLore) return
  char.value.worldLore.entities = char.value.worldLore.entities.filter(e => e.id !== id)
  if (detailId.value === id) detailId.value = null
  charStore.scheduleAutoSave()
}
</script>

<template>
  <section v-if="char" class="panel world-panel">

    <!-- ── Header ── -->
    <div class="panel-header">
      <h2 class="panel-title">World Lore</h2>
      <div class="header-right">
        <span class="last-analysis">Last analysis: {{ fmtTime(worldLore.lastAnalysis) }}</span>
        <button v-if="entities.length > 0" class="btn-reset" @click="resetLore" title="Clear all entities and rebuild">
          ↺ Reset lore
        </button>
        <button class="btn-analyze" :disabled="analyzing || cooldownSecs > 0" @click="analyzeNotes">
          <Loader2 v-if="analyzing" :size="13" class="spin" />
          <Globe v-else :size="13" />
          <template v-if="cooldownSecs > 0">{{ cooldownSecs }}s</template>
          <template v-else-if="analyzing">Analyzing…</template>
          <template v-else>Analyze notes</template>
        </button>
      </div>
    </div>

    <div v-if="analyzeError" class="analyze-error">{{ analyzeError }}</div>

    <!-- ── Empty ── -->
    <div v-if="entities.length === 0 && !analyzing" class="world-empty">
      <Globe :size="40" class="empty-icon" />
      <p>No world entities yet.</p>
      <p class="muted">Finalize a session to auto-extract lore, or press <strong>Analyze notes</strong>.</p>
    </div>

    <!-- ── Main layout ── -->
    <div v-else class="world-layout">

      <!-- ── Parchment canvas ── -->
      <div ref="canvasRef" class="world-canvas" @click.self="closeDetail">

        <!-- Parchment overlays -->
        <div class="parchment-vignette" />
        <div class="parchment-frame" />

        <!-- Terrain decorations (mountains, forests, water, compass rose) -->
        <svg class="terrain-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <!-- Water — top-left corner -->
          <g opacity="0.22" fill="none" stroke="rgba(40,90,160,1)" stroke-width="0.55" stroke-linecap="round">
            <path d="M2,6  Q4,4  6,6  Q8,8  10,6"/>
            <path d="M2,9  Q4,7  6,9  Q8,11 10,9"/>
            <path d="M2,12 Q4,10 6,12 Q8,14 10,12"/>
            <path d="M4,15 Q6,13 8,15 Q10,17 12,15"/>
          </g>
          <!-- Mountain range — upper-right -->
          <g opacity="0.20">
            <path d="M72,26 L77,14 L82,26 Z" fill="rgba(110,65,20,0.15)" stroke="rgba(90,50,15,1)" stroke-width="0.5" stroke-linejoin="round"/>
            <path d="M79,26 L85,10 L91,26 Z" fill="rgba(110,65,20,0.18)" stroke="rgba(90,50,15,1)" stroke-width="0.5" stroke-linejoin="round"/>
            <path d="M87,26 L92,16 L97,26 Z" fill="rgba(110,65,20,0.15)" stroke="rgba(90,50,15,1)" stroke-width="0.5" stroke-linejoin="round"/>
            <!-- Snow caps -->
            <path d="M77,14 L79,19 L75,19 Z" fill="rgba(235,225,205,0.55)" stroke="none"/>
            <path d="M85,10 L87,16 L83,16 Z" fill="rgba(235,225,205,0.6)"  stroke="none"/>
            <path d="M92,16 L94,20 L90,20 Z" fill="rgba(235,225,205,0.5)"  stroke="none"/>
          </g>
          <!-- Forest — lower-left -->
          <g opacity="0.18" stroke="rgba(45,80,25,1)" stroke-width="0.45">
            <circle cx="7"  cy="78" r="3.5" fill="rgba(45,80,25,0.18)"/>
            <circle cx="12" cy="75" r="3.0" fill="rgba(45,80,25,0.15)"/>
            <circle cx="5"  cy="73" r="2.5" fill="rgba(45,80,25,0.14)"/>
            <circle cx="15" cy="79" r="2.8" fill="rgba(45,80,25,0.16)"/>
            <circle cx="10" cy="82" r="3.2" fill="rgba(45,80,25,0.18)"/>
            <circle cx="17" cy="74" r="2.2" fill="rgba(45,80,25,0.12)"/>
          </g>
          <!-- Rolling hills — bottom-right -->
          <g opacity="0.12" fill="rgba(100,75,30,0.2)" stroke="rgba(100,75,30,1)" stroke-width="0.4">
            <path d="M80,88 Q85,82 90,88 Q95,82 100,88"/>
            <path d="M85,92 Q90,86 95,92 Q98,88 100,92"/>
          </g>
          <!-- Compass rose — bottom-right corner -->
          <g transform="translate(92,87)">
            <circle cx="0" cy="0" r="5.5" fill="rgba(237,224,186,0.6)" stroke="rgba(90,50,15,0.35)" stroke-width="0.5"/>
            <!-- N (dark) -->
            <path d="M0,-5 L1.2,-1.5 L0,-2.5 L-1.2,-1.5 Z" fill="rgba(70,35,5,0.75)"/>
            <!-- S -->
            <path d="M0,5 L-1.2,1.5 L0,2.5 L1.2,1.5 Z" fill="rgba(70,35,5,0.35)"/>
            <!-- E -->
            <path d="M5,0 L1.5,-1.2 L2.5,0 L1.5,1.2 Z" fill="rgba(70,35,5,0.35)"/>
            <!-- W -->
            <path d="M-5,0 L-1.5,1.2 L-2.5,0 L-1.5,-1.2 Z" fill="rgba(70,35,5,0.35)"/>
            <circle cx="0" cy="0" r="1" fill="rgba(70,35,5,0.5)"/>
            <text x="0" y="-6.5" text-anchor="middle" font-size="3.2" font-weight="900" fill="rgba(70,35,5,0.65)" font-family="serif">N</text>
          </g>
        </svg>

        <!-- Map breadcrumb -->
        <div class="map-nav">
          <button v-if="viewMode === 'city'" class="btn-back" @click="drillOut">
            <ChevronLeft :size="11" /> World
          </button>
          <span class="map-title-text">{{ viewMode === 'world' ? 'World Map' : drillCity?.name }}</span>
        </div>

        <!-- Legend (world view) -->
        <div v-if="viewMode === 'world'" class="legend">
          <div v-for="(col, kind) in KIND_COLOR" :key="kind" class="legend-item">
            <component :is="KIND_ICON[kind as EntityKind]" :size="9" :style="{ color: col }" />
            <span>{{ kind }}</span>
          </div>
        </div>

        <!-- ══ WORLD VIEW ══ -->
        <Transition name="view" mode="out-in">
          <div v-if="viewMode === 'world'" key="world" class="map-layer">
            <div
              v-for="entity in topLevel"
              :key="entity.id"
              class="node-wrap"
              :style="{ left: entity.x + '%', top: entity.y + '%' }"
              @mousedown="onMousedown($event, entity)"
              @click.stop="childCount(entity) > 0 ? drillIn(entity) : openDetail(entity)"
            >
              <div
                class="node-body"
                :class="{ selected: detailId === entity.id, drillable: childCount(entity) > 0 }"
                :style="{
                  width:  KIND_SIZE[entity.kind] + 'px',
                  height: KIND_SIZE[entity.kind] + 'px',
                  '--nc': KIND_COLOR[entity.kind],
                }"
              >
                <component :is="KIND_ICON[entity.kind]" :size="Math.floor(KIND_SIZE[entity.kind] * 0.38)" />
                <span v-if="childCount(entity) > 0" class="child-badge">{{ childCount(entity) }}</span>
              </div>
              <div v-if="entity.flags?.length" class="node-flags">
                <span v-for="f in entity.flags.slice(0, 3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label" :style="{ color: KIND_COLOR[entity.kind] }">{{ entity.name }}</span>
            </div>
          </div>

          <!-- ══ CITY DRILL-DOWN ══ -->
          <div v-else key="city" class="map-layer">

            <!-- SVG connecting lines -->
            <svg class="connections-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                v-for="(child, i) in children"
                :key="child.id"
                x1="50" y1="50"
                :x2="radialPos(i, children.length).x"
                :y2="radialPos(i, children.length).y"
                stroke="rgba(122,74,8,0.3)"
                stroke-width="0.45"
                stroke-dasharray="2,1.5"
              />
            </svg>

            <!-- Center city node -->
            <div class="node-wrap" style="left:50%;top:50%" @click.stop="openDetail(drillCity!)">
              <div
                class="node-body node-center"
                :class="{ selected: detailId === drillCity!.id }"
                :style="{ '--nc': KIND_COLOR[drillCity!.kind] }"
              >
                <component :is="KIND_ICON[drillCity!.kind]" :size="24" />
              </div>
              <div v-if="drillCity!.flags?.length" class="node-flags">
                <span v-for="f in drillCity!.flags.slice(0, 3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label node-label-center" :style="{ color: KIND_COLOR[drillCity!.kind] }">{{ drillCity!.name }}</span>
            </div>

            <!-- Child nodes -->
            <div
              v-for="(child, i) in children"
              :key="child.id"
              class="node-wrap"
              :style="{
                left: radialPos(i, children.length).x + '%',
                top:  radialPos(i, children.length).y + '%',
              }"
              @click.stop="openDetail(child)"
            >
              <div
                class="node-body"
                :class="{ selected: detailId === child.id }"
                :style="{
                  width:  KIND_SIZE[child.kind] + 'px',
                  height: KIND_SIZE[child.kind] + 'px',
                  '--nc': KIND_COLOR[child.kind],
                }"
              >
                <component :is="KIND_ICON[child.kind]" :size="Math.floor(KIND_SIZE[child.kind] * 0.38)" />
              </div>
              <div v-if="child.flags?.length" class="node-flags">
                <span v-for="f in child.flags.slice(0, 3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label" :style="{ color: KIND_COLOR[child.kind] }">{{ child.name }}</span>
            </div>

          </div>
        </Transition>
      </div>

      <!-- ── Detail panel ── -->
      <aside v-if="detail" class="detail-panel">
        <div class="detail-header">
          <div class="detail-title-row">
            <component :is="KIND_ICON[detail.kind]" :size="14" :style="{ color: KIND_COLOR[detail.kind] }" />
            <span class="detail-name">{{ detail.name }}</span>
            <span class="detail-kind">{{ detail.kind }}</span>
          </div>
          <button class="btn-icon" @click="closeDetail"><X :size="14" /></button>
        </div>

        <p class="detail-desc">{{ detail.description || 'No description.' }}</p>

        <div v-if="detail.parent" class="detail-parent">
          <span class="section-label">Part of</span>
          <span class="parent-pill">{{ detail.parent }}</span>
        </div>

        <div v-if="detail.sessions.length" class="detail-sessions">
          <div class="section-label">Mentioned in</div>
          <div v-for="sid in detail.sessions" :key="sid" class="session-pill">{{ sessionName(sid) }}</div>
        </div>

        <div class="detail-flags">
          <div class="section-label">Flags</div>
          <div class="flags-grid">
            <button
              v-for="ft in FLAGS" :key="ft.type"
              class="flag-btn" :class="{ active: hasFlag(detail, ft.type) }"
              :style="{ '--fc': ft.color }"
              @click="toggleFlag(detail, ft.type)"
            >{{ ft.label }}</button>
          </div>
        </div>

        <button class="btn-del" @click="deleteEntity(detail.id)"><X :size="11" /> Remove</button>
      </aside>

    </div>
  </section>
</template>

<style scoped>
.world-panel { user-select: none; }

/* ── Header ── */
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; gap: .75rem; flex-wrap: wrap; }
.header-right  { display: flex; align-items: center; gap: .75rem; }
.last-analysis { font-size: .68rem; color: var(--text-muted); }

.btn-reset {
  display: flex; align-items: center; gap: .25rem;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; font-weight: 600;
  padding: .28rem .55rem; cursor: pointer; transition: all var(--transition);
}
.btn-reset:hover { border-color: rgba(220,50,50,.4); color: var(--red-light); }

.btn-analyze {
  display: flex; align-items: center; gap: .3rem;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; font-weight: 600;
  padding: .28rem .65rem; cursor: pointer; white-space: nowrap; transition: all var(--transition);
}
.btn-analyze:hover:not(:disabled) { border-color: var(--gold-border); color: var(--gold); background: rgba(201,168,76,.08); }
.btn-analyze:disabled { opacity: .45; cursor: default; }
.analyze-error { font-size: .78rem; color: var(--red-light); margin-bottom: .5rem; }

/* ── Empty ── */
.world-empty { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 4rem 2rem; text-align: center; color: var(--text-secondary); }
.empty-icon  { color: var(--text-muted); opacity: .4; }
.muted       { font-size: .82rem; color: var(--text-muted); max-width: 360px; }
.muted strong { color: var(--gold-dim); }

/* ── Layout ── */
.world-layout { display: flex; gap: .75rem; height: 520px; }

/* ══ Canvas (parchment) ══ */
.world-canvas {
  flex: 1; position: relative; border-radius: var(--radius-md); overflow: hidden; cursor: default;
  /* Parchment base */
  background-color: #ede0ba;
  background-image:
    radial-gradient(ellipse at 12% 18%, rgba(139,90,43,.20) 0%, transparent 45%),
    radial-gradient(ellipse at 88% 82%, rgba(100,60,20,.16) 0%, transparent 40%),
    radial-gradient(ellipse at 72% 10%, rgba(160,110,50,.12) 0%, transparent 38%),
    radial-gradient(ellipse at 22% 92%, rgba(120,70,30,.14) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 50%, rgba(200,160,80,.06) 0%, transparent 70%);
  box-shadow: inset 0 0 70px rgba(80,40,10,.14);
}

/* Terrain SVG layer */
.terrain-svg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 1;
}

/* Vignette overlay */
.parchment-vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(60,30,5,.22) 100%);
}
/* Inner decorative frame */
.parchment-frame {
  position: absolute; inset: 10px; pointer-events: none; z-index: 1;
  border: 1.5px solid rgba(122,74,8,.20); border-radius: 4px;
}

/* ── Map nav (breadcrumb) ── */
.map-nav {
  position: absolute; top: .55rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: .45rem; z-index: 6; white-space: nowrap;
}
.map-title-text {
  font-size: .67rem; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(70,35,5,.6);
}
.btn-back {
  display: flex; align-items: center; gap: .15rem;
  background: rgba(70,35,5,.08); border: 1px solid rgba(70,35,5,.2);
  border-radius: 20px; color: rgba(70,35,5,.65);
  font-family: inherit; font-size: .63rem; font-weight: 700;
  padding: .15rem .4rem; cursor: pointer; transition: all var(--transition);
}
.btn-back:hover { background: rgba(70,35,5,.16); }


/* ── Legend ── */
.legend {
  position: absolute; bottom: .6rem; left: .8rem; z-index: 5;
  display: flex; gap: .6rem; flex-wrap: wrap;
}
.legend-item {
  display: flex; align-items: center; gap: .2rem;
  font-size: .58rem; color: rgba(70,35,5,.5); text-transform: capitalize;
}

/* ── Map layers (for transitions) ── */
.map-layer { position: absolute; inset: 0; }

/* View transition */
.view-enter-active { transition: opacity .28s ease, transform .28s ease; }
.view-leave-active { transition: opacity .2s ease,  transform .2s ease; }
.view-enter-from   { opacity: 0; transform: scale(.96); }
.view-leave-to     { opacity: 0; transform: scale(1.04); }

/* ── SVG connections (city view) ── */
.connections-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }

/* ── Node wrapper ── */
.node-wrap {
  position: absolute; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  cursor: pointer; z-index: 4;
  transition: filter .15s ease;
}
.node-wrap:hover { filter: brightness(0.9); }

/* ── Node body (circle) ── */
.node-body {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2.5px solid var(--nc, #7a4a08);
  background: rgba(237,224,186,.82);
  color: var(--nc, #7a4a08);
  box-shadow: 0 2px 12px rgba(60,30,5,.22), inset 0 1px 4px rgba(255,255,255,.5);
  transition: transform .15s ease, box-shadow .15s ease;
  position: relative;
}
.node-body.selected {
  box-shadow:
    0 0 0 3px rgba(237,224,186,.9),
    0 0 0 5.5px var(--nc, #7a4a08),
    0 3px 14px rgba(60,30,5,.3);
}
/* Drillable = dashed border, zoom cursor */
.node-body.drillable { border-style: dashed; cursor: zoom-in; }
.node-body.drillable:hover { border-style: solid; }

/* Center node in city view */
.node-center {
  width: 62px !important; height: 62px !important; border-width: 3px;
  box-shadow:
    0 0 0 5px rgba(237,224,186,.55),
    0 0 0 7px var(--nc, #7a4a08),
    0 4px 18px rgba(60,30,5,.28),
    inset 0 1px 4px rgba(255,255,255,.5);
}

/* ── Child badge ── */
.child-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 17px; height: 17px; border-radius: 9px;
  background: var(--nc, #7a4a08); color: #ede0ba;
  font-size: .58rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
  box-shadow: 0 1px 5px rgba(0,0,0,.25);
}

/* ── Flags dots ── */
.node-flags { display: flex; gap: 2px; }
.flag-dot   { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,.18); }

/* ── Labels ── */
.node-label {
  font-size: .63rem; font-weight: 700;
  text-shadow: 0 1px 4px rgba(237,224,186,1), 0 0 8px rgba(237,224,186,.8);
  max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
}
.node-label-center { font-size: .7rem; }

/* ══ Detail panel ══ */
.detail-panel {
  width: 220px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex; flex-direction: column; gap: .65rem;
  padding: .75rem; overflow-y: auto;
}
.detail-header   { display: flex; align-items: flex-start; justify-content: space-between; gap: .4rem; }
.detail-title-row{ display: flex; align-items: center; gap: .35rem; min-width: 0; flex-wrap: wrap; }
.detail-name     { font-size: .88rem; font-weight: 700; color: var(--text-primary); }
.detail-kind     { font-size: .62rem; text-transform: capitalize; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: .05rem .4rem; }
.btn-icon        { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .15rem; border-radius: 3px; display: flex; align-items: center; flex-shrink: 0; }
.btn-icon:hover  { color: var(--text-primary); }
.detail-desc     { font-size: .8rem; color: var(--text-secondary); line-height: 1.5; }

.section-label   { font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin-bottom: .3rem; }

.detail-parent   { display: flex; flex-direction: column; gap: .2rem; }
.parent-pill     { font-size: .72rem; color: rgba(122,74,8,.8); background: rgba(122,74,8,.08); border: 1px solid rgba(122,74,8,.2); border-radius: 20px; padding: .1rem .5rem; display: inline-block; }

.detail-sessions { display: flex; flex-direction: column; gap: .25rem; }
.session-pill    { font-size: .72rem; color: var(--gold-dim); background: rgba(201,168,76,.07); border: 1px solid var(--gold-border); border-radius: 20px; padding: .1rem .5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.flags-grid { display: flex; flex-wrap: wrap; gap: .3rem; }
.flag-btn {
  font-size: .68rem; padding: .15rem .45rem;
  background: transparent; border: 1px solid var(--border); border-radius: 20px;
  color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all var(--transition);
}
.flag-btn:hover, .flag-btn.active { border-color: var(--fc); color: var(--fc); background: color-mix(in srgb, var(--fc) 12%, transparent); }

.btn-del {
  display: flex; align-items: center; gap: .25rem;
  font-size: .68rem; padding: .2rem .5rem;
  background: transparent; border: 1px solid transparent;
  border-radius: var(--radius-sm); color: var(--text-muted);
  cursor: pointer; font-family: inherit; margin-top: auto; transition: all var(--transition);
}
.btn-del:hover { color: var(--red-light); border-color: rgba(220,50,50,.3); }

/* Spinner */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
