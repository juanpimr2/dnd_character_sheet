<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { WorldEntity, EntityKind, LoreFlag, MapDecoration } from '@/types/character'
import { Globe, Loader2, X, ChevronLeft, ChevronRight, Edit2, HelpCircle, Plus } from 'lucide-vue-next'

const charStore = useCharacterStore()
const authStore = useAuthStore()
const char      = computed(() => charStore.activeCharacter!)
const charId    = computed(() => charStore.currentCharacterId)
const worldLore = computed(() => char.value?.worldLore ?? { entities: [] })
const entities  = computed<WorldEntity[]>(() => worldLore.value.entities ?? [])
const decorations = computed<MapDecoration[]>(() => worldLore.value.decorations ?? [])

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '') }

// ── Icon palette data ──────────────────────────────────────────────
const PALETTE_TERRAIN = [
  { icon: '/map-icons/loc-mountain.png',  label: 'Mountain'  },
  { icon: '/map-icons/loc-forest.png',    label: 'Forest'    },
  { icon: '/map-icons/loc-cave.png',      label: 'Cave'      },
  { icon: '/map-icons/loc-tower.png',     label: 'Tower'     },
  { icon: '/map-icons/loc-temple.png',    label: 'Temple'    },
  { icon: '/map-icons/loc-ruins.png',     label: 'Ruins'     },
  { icon: '/map-icons/loc-tavern.png',    label: 'Tavern'    },
  { icon: '/map-icons/loc-graveyard.png', label: 'Graveyard' },
  { icon: '/map-icons/loc-port.png',      label: 'Port'      },
  { icon: '/map-icons/loc-danger.png',    label: 'Danger'    },
]
const PALETTE_MARKERS = [
  { icon: '/map-icons/city.png',     label: 'City'     },
  { icon: '/map-icons/location.png', label: 'Place'    },
  { icon: '/map-icons/npc.png',      label: 'NPC'      },
  { icon: '/map-icons/faction.png',  label: 'Faction'  },
]
const ALL_ICONS = [...PALETTE_TERRAIN, ...PALETTE_MARKERS]

// ── Icon selection (respects override) ────────────────────────────
function iconFor(entity: WorldEntity): string {
  if (entity.iconOverride) return entity.iconOverride
  if (entity.kind === 'city') return '/map-icons/city.png'
  if (entity.kind === 'npc') {
    const n = entity.name.toLowerCase()
    if (/mage|wizard|mago|brujo|hechicero|sorcerer|witch|arcanist/.test(n)) return '/map-icons/loc-temple.png'
    if (/priest|cleric|sacerdote|healer|cura|padre|bishop/.test(n))         return '/map-icons/loc-temple.png'
    if (/rogue|thief|assassin|ladr[oó]n|asesino|spy|smuggler/.test(n))      return '/map-icons/loc-ruins.png'
    if (/pirate|captain|smuggler|sailor|pirata|marino/.test(n))             return '/map-icons/loc-port.png'
    return '/map-icons/loc-tower.png'  // noble/lord/warrior/generic character
  }
  if (entity.kind === 'faction') {
    const n = entity.name.toLowerCase()
    if (/guild|gremio|commerce|comercio|merchant|trade|merced/.test(n)) return '/map-icons/loc-tavern.png'
    if (/church|iglesia|holy|sagrado|order|orden|religion|cult/.test(n)) return '/map-icons/loc-temple.png'
    if (/army|militar|guard|guardia|legión|legion|soldiers/.test(n))     return '/map-icons/loc-tower.png'
    if (/house|casa|noble|dynasty|familia|family/.test(n))               return '/map-icons/city.png'
    if (/thieves|thiefs|ladr|shadows|shadow|dark|oscuro/.test(n))        return '/map-icons/loc-ruins.png'
    return '/map-icons/loc-temple.png'  // default: organized group/order
  }
  // kind === 'location'
  const n = entity.name.toLowerCase()
  if (/cueva|cave|dungeon|mine|cavern|mina/.test(n))          return '/map-icons/loc-cave.png'
  if (/bosque|forest|wood|grove|arboleda/.test(n))            return '/map-icons/loc-forest.png'
  if (/ruinas|ruin|ancient|antiguo/.test(n))                  return '/map-icons/loc-ruins.png'
  if (/templo|iglesia|temple|church|shrine|catedral/.test(n)) return '/map-icons/loc-temple.png'
  if (/torre|tower|keep|fortaleza/.test(n))                   return '/map-icons/loc-tower.png'
  if (/taberna|tavern|inn|posada/.test(n))                    return '/map-icons/loc-tavern.png'
  if (/monta[ñn]a|mountain|peak|cima/.test(n))                return '/map-icons/loc-mountain.png'
  if (/cementerio|grave|tomb|catacumb/.test(n))               return '/map-icons/loc-graveyard.png'
  if (/puerto|port|harbor|dock|muelle/.test(n))               return '/map-icons/loc-port.png'
  return '/map-icons/location.png'
}

// ── Recommended icons per entity kind (for picker) ────────────────
function recommendedForKind(kind: EntityKind) {
  switch (kind) {
    case 'city':     return [
      { icon: '/map-icons/city.png',      label: 'City' },
      { icon: '/map-icons/loc-tower.png', label: 'Keep' },
      { icon: '/map-icons/loc-temple.png',label: 'Capital' },
    ]
    case 'npc':      return [
      { icon: '/map-icons/loc-tower.png',    label: 'Noble/Warrior' },
      { icon: '/map-icons/loc-temple.png',   label: 'Priest/Mage' },
      { icon: '/map-icons/loc-tavern.png',   label: 'Commoner' },
      { icon: '/map-icons/loc-ruins.png',    label: 'Rogue' },
      { icon: '/map-icons/loc-port.png',     label: 'Sailor' },
      { icon: '/map-icons/loc-cave.png',     label: 'Outlaw' },
    ]
    case 'faction':  return [
      { icon: '/map-icons/loc-temple.png',   label: 'Order/Cult' },
      { icon: '/map-icons/loc-tower.png',    label: 'Guild/Army' },
      { icon: '/map-icons/loc-tavern.png',   label: 'Trade' },
      { icon: '/map-icons/city.png',         label: 'Noble House' },
      { icon: '/map-icons/loc-ruins.png',    label: 'Thieves' },
    ]
    case 'location': return PALETTE_TERRAIN
    default:         return ALL_ICONS
  }
}

const KIND_SIZE: Record<EntityKind, number> = { city: 56, location: 42, npc: 38, faction: 38 }

// ── Multi-level navigation (navStack) ─────────────────────────────
const navStack = ref<WorldEntity[]>([])
const currentParent = computed<WorldEntity | null>(() => navStack.value[navStack.value.length - 1] ?? null)

const visibleNodes = computed<WorldEntity[]>(() => {
  if (!currentParent.value) return entities.value.filter(e => !e.parent)
  const pn = norm(currentParent.value.name)
  return entities.value.filter(e => e.parent && norm(e.parent) === pn)
})

function childrenOf(entity: WorldEntity): WorldEntity[] {
  const n = norm(entity.name)
  return entities.value.filter(e => e.parent && norm(e.parent) === n)
}
function hasChildren(entity: WorldEntity): boolean {
  return childrenOf(entity).length > 0
}

function drillIn(entity: WorldEntity) {
  navStack.value.push(entity); detailId.value = null
}
function drillToDepth(depth: number) {
  navStack.value = navStack.value.slice(0, depth); detailId.value = null
}

// ── Tree layout (top-down, org-chart style) ───────────────────────
// Parent node renders at top-center (50%, 16%), children spread horizontally below
function treePos(idx: number, total: number): { x: number; y: number } {
  if (total <= 1) return { x: 50, y: 74 }
  // Spread children evenly. Max step 17%, min when many children
  const step    = Math.min(17, 74 / (total - 1))
  const span    = step * (total - 1)
  const startX  = 50 - span / 2
  return { x: Math.max(8, Math.min(92, startX + idx * step)), y: 74 }
}
// x of leftmost and rightmost child (for the horizontal bus line)
function busLeft(total: number)  { return treePos(0, total).x }
function busRight(total: number) { return treePos(total - 1, total).x }

// Navigate to an entity from anywhere (e.g., sidebar click)
function pathTo(entity: WorldEntity): WorldEntity[] {
  const path: WorldEntity[] = []
  let cur: WorldEntity | undefined = entity
  while (cur?.parent) {
    const p = entities.value.find(e => norm(e.name) === norm(cur!.parent!))
    if (!p) break
    path.unshift(p)
    cur = p
  }
  return path
}
function navigateTo(entity: WorldEntity) {
  const path = pathTo(entity)
  // Navigate into the entity's parent so it's visible on canvas
  navStack.value = path
  openDetail(entity)
}

// ── Decorations ────────────────────────────────────────────────────
const currentScope = computed<string | null>(() => currentParent.value?.name ?? null)
const visibleDecorations = computed(() =>
  decorations.value.filter(d => d.scope === currentScope.value)
)

function addDecoration(x: number, y: number) {
  if (!pendingIcon.value || !char.value) return
  const wl = char.value.worldLore ??= { entities: [] }
  if (!wl.decorations) wl.decorations = []
  wl.decorations.push({
    id: Date.now(),
    icon: pendingIcon.value,
    x: Math.max(3, Math.min(95, x)),
    y: Math.max(5, Math.min(93, y)),
    size: 36,
    scope: currentScope.value,
  })
  charStore.scheduleAutoSave()
}
function deleteDecoration(id: number) {
  if (!char.value?.worldLore?.decorations) return
  char.value.worldLore.decorations = char.value.worldLore.decorations.filter(d => d.id !== id)
  charStore.scheduleAutoSave()
}

// ── Edit mode ─────────────────────────────────────────────────────
const editMode    = ref(false)
const pendingIcon = ref<string | null>(null)

function toggleEdit() {
  editMode.value = !editMode.value
  if (!editMode.value) pendingIcon.value = null
}
function selectPalette(icon: string) {
  pendingIcon.value = pendingIcon.value === icon ? null : icon
}

// ── Add entity manually ───────────────────────────────────────────
function addEntity() {
  if (!char.value) return
  const wl = char.value.worldLore ??= { entities: [] }
  const newEnt: WorldEntity = {
    id: Date.now(),
    name: 'New Entity',
    kind: 'location',
    description: '',
    parent: currentParent.value?.name,
    sessions: [],
    x: 40 + Math.random() * 20,
    y: 35 + Math.random() * 25,
    flags: [],
  }
  wl.entities.push(newEnt)
  detailId.value = newEnt.id
  charStore.scheduleAutoSave()
}

// ── Reset & Analyze ───────────────────────────────────────────────
function resetLore() {
  if (!confirm('Clear all world entities and decorations? Press Analyze notes afterwards to rebuild.')) return
  if (char.value) {
    char.value.worldLore = { entities: [], decorations: [] }
    navStack.value = []; detailId.value = null
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

// ── Dragging ──────────────────────────────────────────────────────
const canvasRef = ref<HTMLDivElement | null>(null)
const drag = reactive<{
  type: 'entity' | 'deco' | null; id: number | null
  sx: number; sy: number; ox: number; oy: number; moved: boolean
}>({ type: null, id: null, sx: 0, sy: 0, ox: 0, oy: 0, moved: false })

function startDragEntity(e: MouseEvent, entity: WorldEntity) {
  if (e.button !== 0) return
  // Only drag entities in world view (depth 0) or in editMode
  if (navStack.value.length > 0 && !editMode.value) return
  e.preventDefault()
  drag.type = 'entity'; drag.id = entity.id; drag.moved = false
  drag.sx = e.clientX; drag.sy = e.clientY; drag.ox = entity.x; drag.oy = entity.y
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
}
function startDragDeco(e: MouseEvent, deco: MapDecoration) {
  if (e.button !== 0 || !editMode.value) return
  e.preventDefault()
  drag.type = 'deco'; drag.id = deco.id; drag.moved = false
  drag.sx = e.clientX; drag.sy = e.clientY; drag.ox = deco.x; drag.oy = deco.y
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
}
function onMousemove(e: MouseEvent) {
  if (!drag.id || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const dx   = ((e.clientX - drag.sx) / rect.width)  * 100
  const dy   = ((e.clientY - drag.sy) / rect.height) * 100
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true
  if (drag.type === 'entity') {
    const ent = entities.value.find(en => en.id === drag.id)
    if (ent) { ent.x = Math.max(5, Math.min(92, drag.ox + dx)); ent.y = Math.max(8, Math.min(88, drag.oy + dy)) }
  } else if (drag.type === 'deco') {
    const deco = decorations.value.find(d => d.id === drag.id)
    if (deco) { deco.x = Math.max(3, Math.min(95, drag.ox + dx)); deco.y = Math.max(5, Math.min(93, drag.oy + dy)) }
  }
}
function onMouseup() {
  if (drag.id) charStore.scheduleAutoSave()
  drag.id = null; drag.type = null
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup',   onMouseup)
}

// ── Entity click (guard against drag) ────────────────────────────
function onEntityClick(entity: WorldEntity) {
  if (drag.moved) { drag.moved = false; return }
  if (hasChildren(entity)) drillIn(entity)
  else openDetail(entity)
}

// ── Canvas click (place decoration) ──────────────────────────────
function onCanvasClick(e: MouseEvent) {
  if (!editMode.value || !pendingIcon.value || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  addDecoration(
    ((e.clientX - rect.left) / rect.width)  * 100,
    ((e.clientY - rect.top)  / rect.height) * 100,
  )
}

// ── Detail panel ──────────────────────────────────────────────────
const detailId = ref<number | null>(null)
const detail   = computed<WorldEntity | null>(() => entities.value.find(e => e.id === detailId.value) ?? null)
function openDetail(entity: WorldEntity) { detailId.value = entity.id }
function closeDetail() { detailId.value = null }

function deleteEntity(id: number) {
  if (!char.value?.worldLore) return
  char.value.worldLore.entities = char.value.worldLore.entities.filter(e => e.id !== id)
  if (detailId.value === id) detailId.value = null
  charStore.scheduleAutoSave()
}

// Inline editing helpers
function updateName(val: string) {
  if (detail.value) { detail.value.name = val; charStore.scheduleAutoSave() }
}
function updateDesc(val: string) {
  if (detail.value) { detail.value.description = val; charStore.scheduleAutoSave() }
}
function updateKind(val: EntityKind) {
  if (detail.value) { detail.value.kind = val; charStore.scheduleAutoSave() }
}
function applyIconOverride(icon: string) {
  if (detail.value) { detail.value.iconOverride = icon; charStore.scheduleAutoSave() }
}
function clearIconOverride() {
  if (detail.value) { delete detail.value.iconOverride; charStore.scheduleAutoSave() }
}

// Parent assignment — shows all entities except self
const parentOptions = computed(() =>
  detail.value ? entities.value.filter(e => e.id !== detail.value!.id) : []
)
function assignParent(parentName: string) {
  if (detail.value) { detail.value.parent = parentName || undefined; charStore.scheduleAutoSave() }
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

// ── Sidebar ───────────────────────────────────────────────────────
const sidebarOpen = ref(true)

interface SBNode { entity: WorldEntity; depth: number }

const sidebarNodes = computed<SBNode[]>(() => {
  const result: SBNode[] = []
  function traverse(ent: WorldEntity, depth: number) {
    result.push({ entity: ent, depth })
    childrenOf(ent).forEach(child => traverse(child, depth + 1))
  }
  entities.value.filter(e => !e.parent).forEach(e => traverse(e, 0))
  return result
})

// Entities whose declared parent doesn't match any existing entity
const orphanNodes = computed(() =>
  entities.value.filter(e => e.parent && !entities.value.some(p => norm(p.name) === norm(e.parent!)))
)

// ── Help / Tutorial ───────────────────────────────────────────────
const showHelp = ref(false)

// ── Utils ─────────────────────────────────────────────────────────
function sessionName(id: number) { return char.value?.sessions?.find(s => s.id === id)?.name ?? `Session ${id}` }
function fmtTime(iso?: string) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
         ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section v-if="char" class="panel world-panel">

    <!-- ── Header ── -->
    <div class="panel-header">
      <h2 class="panel-title">World Lore</h2>
      <div class="header-right">
        <span class="last-analysis">{{ fmtTime(worldLore.lastAnalysis) }}</span>
        <button class="btn-help" @click="showHelp = !showHelp" :class="{ active: showHelp }" title="Help">
          <HelpCircle :size="13" />
        </button>
        <button class="btn-icon-hdr" :class="{ 'edit-on': editMode }" @click="toggleEdit" :title="editMode ? 'Exit edit mode' : 'Edit map'">
          <Edit2 :size="13" />
          <span>{{ editMode ? 'Done' : 'Edit' }}</span>
        </button>
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

    <!-- ── Help overlay ── -->
    <div v-if="showHelp" class="help-box">
      <button class="help-close" @click="showHelp = false"><X :size="12" /></button>
      <div class="help-grid">
        <div class="help-item"><span class="help-key">Click entity</span> Open details or drill in (badge = has children)</div>
        <div class="help-item"><span class="help-key">Drag entity</span> Reposition on world map</div>
        <div class="help-item"><span class="help-key">Breadcrumb</span> Navigate back up the hierarchy</div>
        <div class="help-item"><span class="help-key">Edit mode</span> Place terrain icons — click palette → click map. Drag decorations to move.</div>
        <div class="help-item"><span class="help-key">+ Add</span> Create a new entity manually</div>
        <div class="help-item"><span class="help-key">Analyze notes</span> AI extracts entities from session logs (15 min cooldown)</div>
      </div>
    </div>

    <!-- ── Empty ── -->
    <div v-if="entities.length === 0 && !analyzing" class="world-empty">
      <Globe :size="40" class="empty-icon" />
      <p>No world entities yet.</p>
      <p class="muted">Finalize a session or press <strong>Analyze notes</strong>.</p>
      <button class="btn-add-empty" @click="addEntity"><Plus :size="13" /> Add manually</button>
    </div>

    <!-- ── Main layout ── -->
    <div v-else class="world-layout">

      <!-- ── Sidebar ── -->
      <aside class="world-sidebar" :class="{ collapsed: !sidebarOpen }">
        <div class="sidebar-header">
          <span v-if="sidebarOpen" class="sidebar-title">Entities</span>
          <button class="btn-toggle" @click="sidebarOpen = !sidebarOpen">
            <ChevronLeft v-if="sidebarOpen" :size="13" />
            <ChevronRight v-else :size="13" />
          </button>
        </div>
        <div v-if="sidebarOpen" class="sidebar-body">
          <div
            v-for="{ entity, depth } in sidebarNodes" :key="entity.id"
            class="sb-item"
            :class="{ active: detailId === entity.id }"
            :style="{ paddingLeft: `calc(0.7rem + ${depth} * 0.85rem)` }"
            @click="navigateTo(entity)"
          >
            <img :src="iconFor(entity)" class="sb-icon" :class="{ 'sb-icon-sm': depth > 0 }" />
            <span class="sb-name">{{ entity.name }}</span>
            <span v-if="hasChildren(entity)" class="sb-count">{{ childrenOf(entity).length }}</span>
            <span v-for="f in (entity.flags ?? []).slice(0,2)" :key="f.type" class="sb-flag" :style="{ background: flagColor(f.type) }" />
          </div>
          <template v-if="orphanNodes.length">
            <div class="sb-section-label">Unassigned</div>
            <div
              v-for="ent in orphanNodes" :key="ent.id"
              class="sb-item"
              :class="{ active: detailId === ent.id }"
              @click="navigateTo(ent)"
            >
              <img :src="iconFor(ent)" class="sb-icon sb-icon-sm" />
              <span class="sb-name">{{ ent.name }}</span>
            </div>
          </template>
          <!-- Add entity button at bottom of sidebar -->
          <button class="sb-add-btn" @click="addEntity"><Plus :size="11" /> New entity</button>
        </div>
      </aside>

      <!-- ── Canvas ── -->
      <div
        ref="canvasRef"
        class="world-canvas"
        :class="{ 'edit-cursor': editMode && pendingIcon }"
        @click.self="onCanvasClick"
      >
        <!-- Compass -->
        <img src="/map-icons/compass.png" class="map-compass" alt="" />

        <!-- Breadcrumb nav -->
        <div class="map-nav">
          <button class="btn-crumb" @click="drillToDepth(0)">World</button>
          <template v-for="(e, i) in navStack" :key="e.id">
            <span class="crumb-sep">›</span>
            <button v-if="i < navStack.length - 1" class="btn-crumb" @click="drillToDepth(i + 1)">{{ e.name }}</button>
            <span v-else class="crumb-current">{{ e.name }}</span>
          </template>
        </div>

        <!-- Decorations layer (always visible, draggable in edit mode) -->
        <div
          v-for="deco in visibleDecorations" :key="deco.id"
          class="deco-wrap"
          :style="{ left: deco.x + '%', top: deco.y + '%', '--sz': (deco.size ?? 36) + 'px' }"
          :class="{ draggable: editMode }"
          @mousedown="startDragDeco($event, deco)"
        >
          <img :src="deco.icon" class="deco-img" :alt="deco.icon" />
          <button v-if="editMode" class="deco-del" @click.stop="deleteDecoration(deco.id)"><X :size="9" /></button>
        </div>

        <!-- ══ WORLD VIEW ══ -->
        <Transition name="view" mode="out-in">
          <div v-if="navStack.length === 0" key="world" class="map-layer">
            <div
              v-for="entity in visibleNodes" :key="entity.id"
              class="node-wrap"
              :style="{ left: entity.x + '%', top: entity.y + '%' }"
              @mousedown="startDragEntity($event, entity)"
              @click.stop="onEntityClick(entity)"
            >
              <div class="node-img-wrap" :class="{ selected: detailId === entity.id, drillable: hasChildren(entity) }">
                <img :src="iconFor(entity)" class="node-img" :style="{ width: KIND_SIZE[entity.kind] + 'px', height: KIND_SIZE[entity.kind] + 'px' }" :alt="entity.name" />
                <span v-if="hasChildren(entity)" class="child-badge">{{ childrenOf(entity).length }}</span>
              </div>
              <div v-if="entity.flags?.length" class="node-flags">
                <span v-for="f in entity.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ entity.name }}</span>
            </div>
          </div>

          <!-- ══ DRILL-DOWN VIEW (top-down tree layout) ══ -->
          <div v-else :key="navStack[navStack.length-1].id" class="map-layer">
            <!-- SVG flowchart lines: trunk → bus → branches -->
            <svg class="connections-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <!-- Vertical trunk from parent down to bus -->
              <line
                x1="50" y1="23" x2="50" y2="44"
                stroke="rgba(100,60,15,0.4)" stroke-width="0.6" stroke-dasharray="2,1.5"
              />
              <!-- Horizontal bus across all children (skip if single child) -->
              <line
                v-if="visibleNodes.length > 1"
                :x1="busLeft(visibleNodes.length)" y1="44"
                :x2="busRight(visibleNodes.length)" y2="44"
                stroke="rgba(100,60,15,0.4)" stroke-width="0.6" stroke-dasharray="2,1.5"
              />
              <!-- Vertical branch from bus down to each child -->
              <line
                v-for="(child, i) in visibleNodes" :key="child.id"
                :x1="treePos(i, visibleNodes.length).x" y1="44"
                :x2="treePos(i, visibleNodes.length).x" y2="67"
                stroke="rgba(100,60,15,0.4)" stroke-width="0.6" stroke-dasharray="2,1.5"
              />
            </svg>

            <!-- Parent node — top center -->
            <div class="node-wrap" style="left:50%;top:16%" @click.stop="openDetail(navStack[navStack.length-1])">
              <div class="node-img-wrap" :class="{ selected: detailId === navStack[navStack.length-1].id }">
                <img :src="iconFor(navStack[navStack.length-1])" class="node-img node-center-img" :alt="navStack[navStack.length-1].name" />
              </div>
              <span class="node-label node-label-lg">{{ navStack[navStack.length-1].name }}</span>
            </div>

            <!-- Child nodes — spread horizontally below -->
            <div
              v-for="(child, i) in visibleNodes" :key="child.id"
              class="node-wrap"
              :style="{ left: treePos(i, visibleNodes.length).x + '%', top: treePos(i, visibleNodes.length).y + '%' }"
              @click.stop="onEntityClick(child)"
            >
              <div class="node-img-wrap" :class="{ selected: detailId === child.id, drillable: hasChildren(child) }">
                <img :src="iconFor(child)" class="node-img" :style="{ width: KIND_SIZE[child.kind] + 'px', height: KIND_SIZE[child.kind] + 'px' }" :alt="child.name" />
                <span v-if="hasChildren(child)" class="child-badge">{{ childrenOf(child).length }}</span>
              </div>
              <div v-if="child.flags?.length" class="node-flags">
                <span v-for="f in child.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ child.name }}</span>
            </div>
          </div>
        </Transition>

        <!-- ── Floating edit toolbar (visible when edit mode) ── -->
        <Transition name="toolbar">
          <div v-if="editMode" class="edit-toolbar">
            <div class="toolbar-section-label">Terrain</div>
            <div class="toolbar-grid">
              <button
                v-for="item in PALETTE_TERRAIN" :key="item.icon"
                class="palette-btn" :class="{ active: pendingIcon === item.icon }"
                :title="item.label" @click="selectPalette(item.icon)"
              >
                <img :src="item.icon" class="palette-img" />
              </button>
            </div>
            <div class="toolbar-section-label">Markers</div>
            <div class="toolbar-grid">
              <button
                v-for="item in PALETTE_MARKERS" :key="item.icon"
                class="palette-btn" :class="{ active: pendingIcon === item.icon }"
                :title="item.label" @click="selectPalette(item.icon)"
              >
                <img :src="item.icon" class="palette-img" />
              </button>
            </div>
            <div v-if="pendingIcon" class="toolbar-hint">Click map to place</div>
            <div v-else class="toolbar-hint">Select an icon above</div>
          </div>
        </Transition>
      </div>

      <!-- ── Detail panel ── -->
      <aside v-if="detail" class="detail-panel">
        <div class="detail-header">
          <img :src="iconFor(detail)" class="detail-icon" />
          <button class="btn-icon" @click="closeDetail" title="Close"><X :size="14" /></button>
        </div>

        <!-- Editable name -->
        <input
          class="detail-name-input"
          :value="detail.name"
          @blur="updateName(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          spellcheck="false"
        />

        <!-- Kind selector -->
        <select
          :value="detail.kind"
          @change="updateKind(($event.target as HTMLSelectElement).value as EntityKind)"
          class="detail-kind-select"
        >
          <option value="city">City / Town</option>
          <option value="location">Location / Place</option>
          <option value="faction">Faction / Organization</option>
          <option value="npc">NPC / Character</option>
        </select>

        <!-- Editable description -->
        <textarea
          class="detail-desc-input"
          :value="detail.description"
          placeholder="Description…"
          @blur="updateDesc(($event.target as HTMLTextAreaElement).value)"
          rows="3"
        />

        <!-- Parent assignment -->
        <div class="detail-section">
          <div class="section-label">Belongs to</div>
          <select
            :value="detail.parent ?? ''"
            @change="assignParent(($event.target as HTMLSelectElement).value)"
            class="parent-select"
          >
            <option value="">— top-level —</option>
            <option v-for="opt in parentOptions" :key="opt.id" :value="opt.name">{{ opt.name }}</option>
          </select>
        </div>

        <!-- Icon override — always visible, organized by kind -->
        <div class="detail-section">
          <div class="section-label">Icon</div>
          <div class="icon-pick-sublabel">Recommended for {{ detail.kind }}</div>
          <div class="icon-pick-grid">
            <button
              v-for="item in recommendedForKind(detail.kind)" :key="item.icon"
              class="icon-pick-btn"
              :class="{ active: (detail.iconOverride ?? iconFor(detail)) === item.icon }"
              :title="item.label"
              @click="applyIconOverride(item.icon)"
            >
              <img :src="item.icon" />
            </button>
          </div>
          <div class="icon-pick-sublabel" style="margin-top:.3rem">All icons</div>
          <div class="icon-pick-grid">
            <button
              v-for="item in ALL_ICONS" :key="item.icon + '_all'"
              class="icon-pick-btn"
              :class="{ active: (detail.iconOverride ?? iconFor(detail)) === item.icon }"
              :title="item.label"
              @click="applyIconOverride(item.icon)"
            >
              <img :src="item.icon" />
            </button>
          </div>
          <button v-if="detail.iconOverride" class="btn-reset-icon" @click="clearIconOverride">↺ Reset to auto</button>
        </div>

        <!-- Sessions -->
        <div v-if="detail.sessions.length" class="detail-section">
          <div class="section-label">Mentioned in</div>
          <div v-for="sid in detail.sessions" :key="sid" class="session-pill">{{ sessionName(sid) }}</div>
        </div>

        <!-- Flags -->
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
.header-right { display: flex; align-items: center; gap: .5rem; }
.last-analysis { font-size: .65rem; color: var(--text-muted); }

.btn-help, .btn-icon-hdr {
  display: flex; align-items: center; gap: .25rem;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; font-weight: 600;
  padding: .28rem .5rem; cursor: pointer; transition: all var(--transition);
}
.btn-help:hover, .btn-help.active { border-color: var(--gold-border); color: var(--gold); }
.btn-icon-hdr:hover { border-color: var(--gold-border); color: var(--gold); }
.btn-icon-hdr.edit-on { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,.1); }

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

/* ── Help box ── */
.help-box {
  position: relative; background: var(--bg-elevated); border: 1px solid var(--gold-border);
  border-radius: var(--radius-md); padding: .65rem .75rem; margin-bottom: .75rem;
  border-left: 3px solid var(--gold-dim);
}
.help-close { position: absolute; top: .4rem; right: .4rem; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .15rem; }
.help-close:hover { color: var(--text-primary); }
.help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem .75rem; }
.help-item { font-size: .73rem; color: var(--text-secondary); line-height: 1.45; }
.help-key { font-weight: 700; color: var(--gold-dim); }

/* ── Empty ── */
.world-empty { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 4rem 2rem; text-align: center; color: var(--text-secondary); }
.empty-icon { color: var(--text-muted); opacity: .4; }
.muted { font-size: .82rem; color: var(--text-muted); max-width: 360px; }
.muted strong { color: var(--gold-dim); }
.btn-add-empty {
  display: flex; align-items: center; gap: .3rem;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-muted); font-family: inherit; font-size: .75rem; font-weight: 600;
  padding: .3rem .65rem; cursor: pointer; transition: all var(--transition); margin-top: .5rem;
}
.btn-add-empty:hover { border-color: var(--gold-border); color: var(--gold); }

/* ── Layout ── */
.world-layout { display: flex; gap: .75rem; height: 560px; }

/* ══ Sidebar ══ */
.world-sidebar {
  width: 185px; flex-shrink: 0;
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

.sidebar-body { flex: 1; overflow-y: auto; padding: .35rem 0; display: flex; flex-direction: column; }

.sb-section-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); padding: .4rem .7rem .15rem; }

.sb-item {
  display: flex; align-items: center; gap: .4rem;
  padding: .28rem .7rem; cursor: pointer;
  border-left: 2.5px solid transparent; transition: all var(--transition);
}
.sb-item:hover { background: rgba(201,168,76,.06); }
.sb-item.active { background: rgba(201,168,76,.1); border-left-color: var(--gold); }

.sb-icon { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }
.sb-icon-sm { width: 15px; height: 15px; }
.sb-name { font-size: .73rem; color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-item.active .sb-name { color: var(--gold); }
.sb-count { font-size: .58rem; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: .03rem .28rem; flex-shrink: 0; }
.sb-flag { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.sb-add-btn {
  display: flex; align-items: center; gap: .3rem;
  margin: .4rem .6rem .2rem; padding: .22rem .5rem;
  background: transparent; border: 1px dashed var(--border); border-radius: var(--radius-sm);
  color: var(--text-muted); font-family: inherit; font-size: .68rem;
  cursor: pointer; transition: all var(--transition);
}
.sb-add-btn:hover { border-color: var(--gold-border); color: var(--gold); }

/* ══ Canvas ══ */
.world-canvas {
  flex: 1; position: relative; border-radius: var(--radius-md); overflow: hidden;
  background: url('/map-icons/parchment.png') center/cover no-repeat;
  cursor: default;
}
.world-canvas.edit-cursor { cursor: crosshair; }
.world-canvas::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: rgba(30,15,0,.08);
  box-shadow: inset 0 0 60px rgba(30,15,0,.25);
}

/* Compass */
.map-compass {
  position: absolute; bottom: .6rem; right: .7rem;
  width: 52px; height: 52px; object-fit: contain;
  z-index: 5; opacity: .75; pointer-events: none;
}

/* Breadcrumb nav */
.map-nav {
  position: absolute; top: .55rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: .25rem; z-index: 6; white-space: nowrap;
}
.btn-crumb {
  background: rgba(60,30,5,.1); border: 1px solid rgba(60,30,5,.2);
  border-radius: 20px; color: rgba(60,30,5,.65); font-family: inherit;
  font-size: .63rem; font-weight: 700; padding: .12rem .4rem;
  cursor: pointer; transition: all var(--transition);
}
.btn-crumb:hover { background: rgba(60,30,5,.2); color: rgba(60,30,5,.9); }
.crumb-sep { font-size: .65rem; color: rgba(60,30,5,.45); }
.crumb-current {
  font-size: .68rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: rgba(60,30,5,.75); text-shadow: 0 1px 3px rgba(240,220,170,.8);
}

/* Decorations */
.deco-wrap {
  position: absolute; transform: translate(-50%, -50%);
  z-index: 3; pointer-events: auto;
}
.deco-wrap.draggable { cursor: grab; }
.deco-wrap.draggable:active { cursor: grabbing; }
.deco-img { width: var(--sz); height: var(--sz); object-fit: contain; filter: drop-shadow(0 1px 2px rgba(40,20,0,.3)); display: block; }
.deco-del {
  position: absolute; top: -5px; right: -5px;
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(180,40,40,.9); border: 1px solid rgba(220,80,80,.5);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; line-height: 1;
}
.deco-del:hover { background: #cc2222; }

/* Map layers */
.map-layer { position: absolute; inset: 0; z-index: 4; }

/* View transition */
.view-enter-active { transition: opacity .28s ease, transform .28s ease; }
.view-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-enter-from   { opacity: 0; transform: scale(.96); }
.view-leave-to     { opacity: 0; transform: scale(1.04); }

/* SVG lines */
.connections-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; }

/* ── Nodes ── */
.node-wrap {
  position: absolute; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  cursor: pointer; z-index: 5;
}
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
.node-img { object-fit: contain; filter: drop-shadow(0 2px 3px rgba(40,20,0,.45)); }
.node-center-img { width: 68px !important; height: 68px !important; }

.child-badge {
  position: absolute; top: -4px; right: -6px;
  min-width: 16px; height: 16px; border-radius: 8px;
  background: rgba(201,168,76,.95); color: rgba(40,20,0,.9);
  font-size: .58rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}
.node-flags { display: flex; gap: 2px; margin-top: 1px; }
.flag-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.node-label {
  font-size: .64rem; font-weight: 700; color: rgba(40,18,0,.85);
  text-shadow: 0 1px 3px rgba(240,220,160,1), 0 0 10px rgba(240,220,160,.9);
  max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
}
.node-label-lg { font-size: .75rem; }

/* ── Floating edit toolbar ── */
.edit-toolbar {
  position: absolute; right: .55rem; top: 50%; transform: translateY(-50%);
  z-index: 10;
  background: rgba(14, 8, 2, 0.82);
  border: 1px solid rgba(201, 168, 76, 0.35);
  border-radius: var(--radius-md);
  padding: .5rem .45rem;
  backdrop-filter: blur(6px);
  display: flex; flex-direction: column; gap: .35rem;
  max-height: 80%; overflow-y: auto;
  scrollbar-width: none;
}
.edit-toolbar::-webkit-scrollbar { display: none; }

.toolbar-section-label {
  font-size: .55rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: rgba(201,168,76,.55);
  padding: .05rem 0;
}
.toolbar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .22rem; }
.palette-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition); padding: 2px;
}
.palette-btn:hover { background: rgba(201,168,76,.12); border-color: rgba(201,168,76,.4); }
.palette-btn.active { background: rgba(201,168,76,.2); border-color: var(--gold); box-shadow: 0 0 6px rgba(201,168,76,.3); }
.palette-img { width: 22px; height: 22px; object-fit: contain; filter: brightness(0) invert(1) opacity(.7); }
.palette-btn.active .palette-img { filter: none; }
.palette-btn:hover .palette-img { filter: none; }
.toolbar-hint { font-size: .6rem; color: rgba(201,168,76,.6); text-align: center; line-height: 1.3; padding: .1rem 0; }

/* Toolbar transition */
.toolbar-enter-active { transition: opacity .2s ease, transform .2s ease; }
.toolbar-leave-active { transition: opacity .15s ease, transform .15s ease; }
.toolbar-enter-from   { opacity: 0; transform: translateY(-50%) translateX(8px); }
.toolbar-leave-to     { opacity: 0; transform: translateY(-50%) translateX(8px); }

/* ══ Detail panel ══ */
.detail-panel {
  width: 215px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex; flex-direction: column; gap: .5rem;
  padding: .65rem; overflow-y: auto;
}
.detail-header { display: flex; align-items: center; justify-content: space-between; }
.detail-icon { width: 22px; height: 22px; object-fit: contain; }

.detail-name-input {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-primary); font-family: var(--font-title); font-size: .9rem; font-weight: 700;
  padding: .2rem .4rem; width: 100%; box-sizing: border-box;
  transition: border-color var(--transition);
}
.detail-name-input:focus { outline: none; border-color: var(--gold-dim); }

.detail-kind-select {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-secondary); font-family: inherit; font-size: .72rem;
  padding: .15rem .35rem; cursor: pointer; width: 100%; box-sizing: border-box;
}
.detail-kind-select:focus { outline: none; border-color: var(--gold-dim); }

.detail-desc-input {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-secondary); font-family: inherit; font-size: .77rem; line-height: 1.45;
  padding: .25rem .4rem; width: 100%; box-sizing: border-box; resize: vertical;
  transition: border-color var(--transition);
}
.detail-desc-input:focus { outline: none; border-color: var(--gold-dim); }

.detail-section { display: flex; flex-direction: column; gap: .28rem; }
.section-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); }

.parent-select {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-secondary); font-family: inherit; font-size: .73rem;
  padding: .18rem .35rem; cursor: pointer; width: 100%;
}
.parent-select:focus { outline: none; border-color: var(--gold-dim); }

/* Icon override picker */
.icon-pick-grid { display: flex; flex-wrap: wrap; gap: .22rem; }
.icon-pick-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 2px;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition);
}
.icon-pick-btn img { width: 18px; height: 18px; object-fit: contain; }
.icon-pick-btn:hover { border-color: var(--gold-border); }
.icon-pick-btn.active { border-color: var(--gold); background: rgba(201,168,76,.15); }

.icon-pick-sublabel { font-size: .58rem; color: var(--text-muted); font-style: italic; margin-bottom: .1rem; }

.btn-reset-icon {
  font-size: .65rem; padding: .15rem .4rem; background: transparent;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all var(--transition);
  margin-top: .2rem;
}
.btn-reset-icon:hover { border-color: var(--gold-border); color: var(--gold-dim); }

.session-pill {
  font-size: .7rem; color: var(--gold-dim); background: rgba(201,168,76,.07);
  border: 1px solid var(--gold-border); border-radius: 20px;
  padding: .08rem .45rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.flags-grid { display: flex; flex-wrap: wrap; gap: .28rem; }
.flag-btn {
  font-size: .67rem; padding: .13rem .4rem; background: transparent;
  border: 1px solid var(--border); border-radius: 20px; color: var(--text-muted);
  cursor: pointer; font-family: inherit; transition: all var(--transition);
}
.flag-btn:hover, .flag-btn.active { border-color: var(--fc); color: var(--fc); background: color-mix(in srgb, var(--fc) 12%, transparent); }

.btn-del {
  display: flex; align-items: center; gap: .25rem; font-size: .68rem;
  padding: .2rem .5rem; background: transparent; border: 1px solid transparent;
  border-radius: var(--radius-sm); color: var(--text-muted); cursor: pointer;
  font-family: inherit; margin-top: auto; transition: all var(--transition);
}
.btn-del:hover { color: var(--red-light); border-color: rgba(220,50,50,.3); }

.btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .15rem; border-radius: 3px; display: flex; align-items: center; }
.btn-icon:hover { color: var(--text-primary); }

/* Spinner */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
