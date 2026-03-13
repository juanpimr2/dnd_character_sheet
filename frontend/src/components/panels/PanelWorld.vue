<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { WorldEntity, EntityKind, LoreFlag } from '@/types/character'
import { Globe, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const charStore = useCharacterStore()
const authStore = useAuthStore()
const char      = computed(() => charStore.activeCharacter!)
const charId    = computed(() => charStore.currentCharacterId)
const worldLore = computed(() => char.value?.worldLore ?? { entities: [] })
const entities  = computed<WorldEntity[]>(() => worldLore.value.entities ?? [])

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '') }

// ── Icon selection ────────────────────────────────────────────────
function iconFor(entity: WorldEntity): string {
  if (entity.kind === 'city')    return '/map-icons/city.png'
  if (entity.kind === 'npc')     return '/map-icons/npc.png'
  if (entity.kind === 'faction') return '/map-icons/faction.png'
  const n = entity.name.toLowerCase()
  if (/cueva|cave|dungeon|mine|cavern|mina/.test(n))          return '/map-icons/loc-cave.png'
  if (/bosque|forest|wood|grove|arboleda/.test(n))            return '/map-icons/loc-forest.png'
  if (/ruinas|ruin|ancient|antiguo/.test(n))                  return '/map-icons/loc-ruins.png'
  if (/templo|iglesia|temple|church|shrine|catedral/.test(n)) return '/map-icons/loc-temple.png'
  if (/torre|tower|keep|fortaleza/.test(n))                   return '/map-icons/loc-tower.png'
  if (/taberna|tavern|inn|posada/.test(n))                    return '/map-icons/loc-tavern.png'
  if (/montaña|mountain|peak|cima/.test(n))                   return '/map-icons/loc-mountain.png'
  if (/cementerio|grave|tomb|catacumb/.test(n))               return '/map-icons/loc-graveyard.png'
  if (/puerto|port|harbor|dock|muelle/.test(n))               return '/map-icons/loc-port.png'
  return '/map-icons/location.png'
}

const KIND_SIZE: Record<EntityKind, number> = { city: 56, location: 42, npc: 38, faction: 38 }

// ── Hierarchy ─────────────────────────────────────────────────────
type ViewMode = 'world' | 'city'
const viewMode  = ref<ViewMode>('world')
const drillCity = ref<WorldEntity | null>(null)

const topLevel = computed(() => entities.value.filter(e => !e.parent))
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
  drillCity.value = entity; viewMode.value = 'city'; detailId.value = null
}
function drillOut() {
  viewMode.value = 'world'; drillCity.value = null; detailId.value = null
}
function radialPos(idx: number, total: number) {
  const r     = total <= 3 ? 32 : total <= 6 ? 35 : 37
  const angle = (idx / total) * 2 * Math.PI - Math.PI / 2
  return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) }
}

// ── Reset lore ────────────────────────────────────────────────────
function resetLore() {
  if (!confirm('Clear all world entities? Press Analyze notes afterwards to rebuild.')) return
  if (char.value) {
    char.value.worldLore = { entities: [] }
    if (viewMode.value === 'city') drillOut()
    detailId.value = null
    charStore.scheduleAutoSave()
  }
}

// ── Manual analysis ───────────────────────────────────────────────
const analyzing    = ref(false)
const analyzeError = ref('')
const cooldownSecs = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
function startCooldown(secs: number) {
  cooldownSecs.value = secs
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => { if (--cooldownSecs.value <= 0) { clearInterval(cooldownTimer!); cooldownTimer = null } }, 1000)
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
  drag.ox = entity.x; drag.oy = entity.y
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
}
function onMousemove(e: MouseEvent) {
  if (!drag.id || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const ent  = entities.value.find(en => en.id === drag.id)
  if (ent) {
    ent.x = Math.max(5, Math.min(92, drag.ox + ((e.clientX - drag.sx) / rect.width)  * 100))
    ent.y = Math.max(8, Math.min(88, drag.oy + ((e.clientY - drag.sy) / rect.height) * 100))
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

// ── Manual parent assignment ──────────────────────────────────────
const cityEntities = computed(() => entities.value.filter(e => e.kind === 'city'))
function assignParent(entity: WorldEntity, parentName: string) {
  entity.parent = parentName || undefined
  charStore.scheduleAutoSave()
}

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

// ── Sidebar ───────────────────────────────────────────────────────
const sidebarOpen = ref(true)

// Group entities by city for sidebar tree
const sidebarTree = computed(() => {
  const cities    = entities.value.filter(e => e.kind === 'city')
  const orphans   = entities.value.filter(e => e.kind !== 'city' && !e.parent)
  const cityNodes = cities.map(city => ({
    city,
    children: entities.value.filter(e => e.parent && norm(e.parent) === norm(city.name)),
  }))
  return { cityNodes, orphans }
})
</script>

<template>
  <section v-if="char" class="panel world-panel">

    <!-- ── Header ── -->
    <div class="panel-header">
      <h2 class="panel-title">World Lore</h2>
      <div class="header-right">
        <span class="last-analysis">Last analysis: {{ fmtTime(worldLore.lastAnalysis) }}</span>
        <button v-if="entities.length > 0" class="btn-reset" @click="resetLore">↺ Reset</button>
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
      <p class="muted">Finalize a session or press <strong>Analyze notes</strong>.</p>
    </div>

    <!-- ── Main layout ── -->
    <div v-else class="world-layout">

      <!-- ── Sidebar ── -->
      <aside class="world-sidebar" :class="{ collapsed: !sidebarOpen }">
        <div class="sidebar-header">
          <span v-if="sidebarOpen" class="sidebar-title">Entities</span>
          <button class="btn-toggle" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? 'Collapse' : 'Expand'">
            <ChevronLeft v-if="sidebarOpen" :size="13" />
            <ChevronRight v-else :size="13" />
          </button>
        </div>

        <div v-if="sidebarOpen" class="sidebar-body">
          <!-- Cities + their children -->
          <template v-for="{ city, children: kids } in sidebarTree.cityNodes" :key="city.id">
            <div
              class="sb-item sb-city"
              :class="{ active: detailId === city.id }"
              @click="openDetail(city); viewMode = 'world'"
            >
              <img :src="iconFor(city)" class="sb-icon" />
              <span class="sb-name">{{ city.name }}</span>
              <span v-if="kids.length" class="sb-count">{{ kids.length }}</span>
            </div>
            <div
              v-for="child in kids" :key="child.id"
              class="sb-item sb-child"
              :class="{ active: detailId === child.id }"
              @click="openDetail(child); drillIn(city)"
            >
              <img :src="iconFor(child)" class="sb-icon sb-icon-sm" />
              <span class="sb-name">{{ child.name }}</span>
              <span
                v-for="f in (child.flags ?? []).slice(0,2)" :key="f.type"
                class="sb-flag" :style="{ background: flagColor(f.type) }"
              />
            </div>
          </template>
          <!-- Orphans (no parent) that aren't cities -->
          <template v-if="sidebarTree.orphans.length">
            <div class="sb-section-label">Unassigned</div>
            <div
              v-for="ent in sidebarTree.orphans" :key="ent.id"
              class="sb-item"
              :class="{ active: detailId === ent.id }"
              @click="openDetail(ent)"
            >
              <img :src="iconFor(ent)" class="sb-icon sb-icon-sm" />
              <span class="sb-name">{{ ent.name }}</span>
            </div>
          </template>
        </div>
      </aside>

      <!-- ── Canvas ── -->
      <div ref="canvasRef" class="world-canvas" @click.self="closeDetail">

        <!-- Compass -->
        <img src="/map-icons/compass.png" class="map-compass" alt="" />

        <!-- Map breadcrumb -->
        <div class="map-nav">
          <button v-if="viewMode === 'city'" class="btn-back" @click="drillOut">
            <ChevronLeft :size="11" /> World
          </button>
          <span class="map-title-text">{{ viewMode === 'world' ? 'World Map' : drillCity?.name }}</span>
        </div>

        <!-- ══ WORLD VIEW ══ -->
        <Transition name="view" mode="out-in">
          <div v-if="viewMode === 'world'" key="world" class="map-layer">
            <div
              v-for="entity in topLevel" :key="entity.id"
              class="node-wrap"
              :style="{ left: entity.x + '%', top: entity.y + '%' }"
              @mousedown="onMousedown($event, entity)"
              @click.stop="childCount(entity) > 0 ? drillIn(entity) : openDetail(entity)"
            >
              <div class="node-img-wrap" :class="{ selected: detailId === entity.id, drillable: childCount(entity) > 0 }">
                <img :src="iconFor(entity)" class="node-img" :style="{ width: KIND_SIZE[entity.kind] + 'px', height: KIND_SIZE[entity.kind] + 'px' }" :alt="entity.name" />
                <span v-if="childCount(entity) > 0" class="child-badge">{{ childCount(entity) }}</span>
              </div>
              <div v-if="entity.flags?.length" class="node-flags">
                <span v-for="f in entity.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ entity.name }}</span>
            </div>
          </div>

          <!-- ══ CITY DRILL-DOWN ══ -->
          <div v-else key="city" class="map-layer">
            <!-- SVG lines only -->
            <svg class="connections-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                v-for="(child, i) in children" :key="child.id"
                x1="50" y1="50"
                :x2="radialPos(i, children.length).x"
                :y2="radialPos(i, children.length).y"
                stroke="rgba(100,60,15,0.35)" stroke-width="0.5" stroke-dasharray="2,1.5"
              />
            </svg>

            <!-- Center city -->
            <div class="node-wrap" style="left:50%;top:50%" @click.stop="openDetail(drillCity!)">
              <div class="node-img-wrap" :class="{ selected: detailId === drillCity!.id }">
                <img :src="iconFor(drillCity!)" class="node-img node-center-img" :alt="drillCity!.name" />
              </div>
              <span class="node-label node-label-lg">{{ drillCity!.name }}</span>
            </div>

            <!-- Children -->
            <div
              v-for="(child, i) in children" :key="child.id"
              class="node-wrap"
              :style="{ left: radialPos(i, children.length).x + '%', top: radialPos(i, children.length).y + '%' }"
              @click.stop="openDetail(child)"
            >
              <div class="node-img-wrap" :class="{ selected: detailId === child.id }">
                <img :src="iconFor(child)" class="node-img" :style="{ width: KIND_SIZE[child.kind] + 'px', height: KIND_SIZE[child.kind] + 'px' }" :alt="child.name" />
              </div>
              <div v-if="child.flags?.length" class="node-flags">
                <span v-for="f in child.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ child.name }}</span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Detail panel ── -->
      <aside v-if="detail" class="detail-panel">
        <div class="detail-header">
          <div class="detail-title-row">
            <img :src="iconFor(detail)" class="detail-icon" />
            <span class="detail-name">{{ detail.name }}</span>
            <span class="detail-kind">{{ detail.kind }}</span>
          </div>
          <button class="btn-icon" @click="closeDetail"><X :size="14" /></button>
        </div>

        <p class="detail-desc">{{ detail.description || 'No description.' }}</p>

        <!-- Parent assignment -->
        <div v-if="detail.kind !== 'city'" class="detail-section">
          <div class="section-label">Belongs to</div>
          <select
            :value="detail.parent ?? ''"
            @change="assignParent(detail, ($event.target as HTMLSelectElement).value)"
            class="parent-select"
          >
            <option value="">— none (top-level) —</option>
            <option v-for="city in cityEntities" :key="city.id" :value="city.name">{{ city.name }}</option>
          </select>
        </div>

        <div v-if="detail.sessions.length" class="detail-section">
          <div class="section-label">Mentioned in</div>
          <div v-for="sid in detail.sessions" :key="sid" class="session-pill">{{ sessionName(sid) }}</div>
        </div>

        <div class="detail-section">
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
.header-right { display: flex; align-items: center; gap: .6rem; }
.last-analysis { font-size: .68rem; color: var(--text-muted); }
.btn-reset {
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; font-weight: 600;
  padding: .28rem .55rem; cursor: pointer; transition: all var(--transition);
}
.btn-reset:hover { border-color: rgba(220,50,50,.4); color: var(--red-light); }
.btn-analyze {
  display: flex; align-items: center; gap: .3rem;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; font-weight: 600;
  padding: .28rem .65rem; cursor: pointer; transition: all var(--transition);
}
.btn-analyze:hover:not(:disabled) { border-color: var(--gold-border); color: var(--gold); background: rgba(201,168,76,.08); }
.btn-analyze:disabled { opacity: .45; cursor: default; }
.analyze-error { font-size: .78rem; color: var(--red-light); margin-bottom: .5rem; }

/* ── Empty ── */
.world-empty { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 4rem 2rem; text-align: center; color: var(--text-secondary); }
.empty-icon { color: var(--text-muted); opacity: .4; }
.muted { font-size: .82rem; color: var(--text-muted); max-width: 360px; }
.muted strong { color: var(--gold-dim); }

/* ── Layout ── */
.world-layout { display: flex; gap: .75rem; height: 540px; }

/* ══ Sidebar ══ */
.world-sidebar {
  width: 180px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--bg-elevated); display: flex; flex-direction: column;
  transition: width .2s ease; overflow: hidden;
}
.world-sidebar.collapsed { width: 36px; }

.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .5rem .6rem; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.sidebar-title { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); }
.btn-toggle { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .1rem; display: flex; align-items: center; }
.btn-toggle:hover { color: var(--gold); }

.sidebar-body { flex: 1; overflow-y: auto; padding: .35rem 0; }

.sb-section-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); padding: .4rem .7rem .15rem; }

.sb-item {
  display: flex; align-items: center; gap: .4rem;
  padding: .3rem .7rem; cursor: pointer;
  border-left: 2.5px solid transparent; transition: all var(--transition);
}
.sb-item:hover { background: rgba(201,168,76,.06); }
.sb-item.active { background: rgba(201,168,76,.1); border-left-color: var(--gold); }
.sb-city { font-weight: 600; }
.sb-child { padding-left: 1.4rem; }

.sb-icon { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }
.sb-icon-sm { width: 16px; height: 16px; }

.sb-name { font-size: .75rem; color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-item.active .sb-name { color: var(--gold); }
.sb-count { font-size: .6rem; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: .05rem .3rem; flex-shrink: 0; }
.sb-flag { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* ══ Canvas ══ */
.world-canvas {
  flex: 1; position: relative; border-radius: var(--radius-md); overflow: hidden;
  cursor: default;
  /* Kenney parchment texture */
  background: url('/map-icons/parchment.png') center/cover no-repeat;
}

/* Subtle darkening overlay so nodes stand out */
.world-canvas::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: rgba(30, 15, 0, 0.08);
  box-shadow: inset 0 0 60px rgba(30, 15, 0, 0.25);
}

/* Map nav (breadcrumb) */
.map-nav {
  position: absolute; top: .55rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: .45rem; z-index: 6; white-space: nowrap;
}
.map-title-text {
  font-size: .68rem; font-weight: 700; letter-spacing: .13em;
  text-transform: uppercase; color: rgba(60,30,5,.7);
  text-shadow: 0 1px 3px rgba(240,220,170,.8);
}
.btn-back {
  display: flex; align-items: center; gap: .15rem;
  background: rgba(60,30,5,.1); border: 1px solid rgba(60,30,5,.25);
  border-radius: 20px; color: rgba(60,30,5,.7);
  font-family: inherit; font-size: .63rem; font-weight: 700;
  padding: .15rem .4rem; cursor: pointer; transition: all var(--transition);
}
.btn-back:hover { background: rgba(60,30,5,.2); }

/* Compass image */
.map-compass {
  position: absolute; bottom: .6rem; right: .7rem;
  width: 52px; height: 52px; object-fit: contain;
  z-index: 5; opacity: .75;
  pointer-events: none;
}

/* Map layers */
.map-layer { position: absolute; inset: 0; z-index: 2; }

/* View transition */
.view-enter-active { transition: opacity .28s ease, transform .28s ease; }
.view-leave-active { transition: opacity .2s ease,  transform .2s ease; }
.view-enter-from   { opacity: 0; transform: scale(.96); }
.view-leave-to     { opacity: 0; transform: scale(1.04); }

/* SVG lines */
.connections-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; }

/* ── Node wrapper ── */
.node-wrap {
  position: absolute; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  cursor: pointer; z-index: 4;
}

/* Node image wrapper (for selection ring) */
.node-img-wrap {
  position: relative; display: flex; align-items: center; justify-content: center;
  transition: transform .15s ease;
}
.node-wrap:hover .node-img-wrap { transform: scale(1.1) translateY(-2px); }
.node-img-wrap.selected::before {
  content: ''; position: absolute; inset: -5px;
  border-radius: 50%; border: 2.5px solid rgba(201,168,76,.9);
  box-shadow: 0 0 10px rgba(201,168,76,.5);
}
.node-img-wrap.drillable { cursor: zoom-in; }

/* Node images */
.node-img {
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(40,20,0,.45));
}
.node-center-img { width: 68px !important; height: 68px !important; }

/* Child count badge */
.child-badge {
  position: absolute; top: -4px; right: -6px;
  min-width: 16px; height: 16px; border-radius: 8px;
  background: rgba(201,168,76,.95); color: rgba(40,20,0,.9);
  font-size: .58rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}

/* Flags dots */
.node-flags { display: flex; gap: 2px; margin-top: 1px; }
.flag-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,.2); }

/* Node labels */
.node-label {
  font-size: .64rem; font-weight: 700;
  color: rgba(40,18,0,.85);
  text-shadow: 0 1px 3px rgba(240,220,160,1), 0 0 10px rgba(240,220,160,.9);
  max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
}
.node-label-lg { font-size: .75rem; }

/* ══ Detail panel ══ */
.detail-panel {
  width: 210px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex; flex-direction: column; gap: .6rem;
  padding: .7rem; overflow-y: auto;
}
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .4rem; }
.detail-title-row { display: flex; align-items: center; gap: .35rem; min-width: 0; flex-wrap: wrap; }
.detail-icon { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }
.detail-name { font-size: .88rem; font-weight: 700; color: var(--text-primary); }
.detail-kind { font-size: .62rem; text-transform: capitalize; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: .05rem .4rem; }
.btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .15rem; border-radius: 3px; display: flex; align-items: center; flex-shrink: 0; }
.btn-icon:hover { color: var(--text-primary); }
.detail-desc { font-size: .8rem; color: var(--text-secondary); line-height: 1.5; }
.detail-section { display: flex; flex-direction: column; gap: .3rem; }
.section-label { font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); }

.parent-select {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-secondary); font-family: inherit; font-size: .75rem;
  padding: .2rem .4rem; cursor: pointer; width: 100%;
}
.parent-select:focus { outline: none; border-color: var(--gold-dim); }

.session-pill { font-size: .72rem; color: var(--gold-dim); background: rgba(201,168,76,.07); border: 1px solid var(--gold-border); border-radius: 20px; padding: .1rem .5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.flags-grid { display: flex; flex-wrap: wrap; gap: .3rem; }
.flag-btn { font-size: .68rem; padding: .15rem .45rem; background: transparent; border: 1px solid var(--border); border-radius: 20px; color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all var(--transition); }
.flag-btn:hover, .flag-btn.active { border-color: var(--fc); color: var(--fc); background: color-mix(in srgb, var(--fc) 12%, transparent); }

.btn-del { display: flex; align-items: center; gap: .25rem; font-size: .68rem; padding: .2rem .5rem; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-muted); cursor: pointer; font-family: inherit; margin-top: auto; transition: all var(--transition); }
.btn-del:hover { color: var(--red-light); border-color: rgba(220,50,50,.3); }

/* Spinner */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
