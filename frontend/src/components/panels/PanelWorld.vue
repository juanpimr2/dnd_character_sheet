<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { useAuthStore } from '@/stores/auth'
import type { WorldEntity, EntityKind, LoreFlag, MapDecoration, WorldPlane } from '@/types/character'
import { Globe, Loader2, X, ChevronLeft, ChevronRight, Edit2, HelpCircle, Plus } from 'lucide-vue-next'
import UpgradeGate from '@/components/UpgradeGate.vue'

const charStore = useCharacterStore()
const authStore = useAuthStore()
const char      = computed(() => charStore.activeCharacter!)
const charId    = computed(() => charStore.currentCharacterId)
const worldLore = computed(() => char.value?.worldLore ?? { entities: [] })

// ── Planes ────────────────────────────────────────────────────────
const renamingPlaneId = ref<string | null>(null)
const renameText = ref('')

function ensurePlanes() {
  if (!char.value) return
  const wl = char.value.worldLore
  if (!wl) { char.value.worldLore = { entities: [], planes: [defaultPlane()] }; return }
  if (!wl.planes || wl.planes.length === 0) {
    wl.planes = [{
      id: 'plane-1',
      name: wl.seed?.worldName || 'Material Plane',
      icon: '🌍',
      entities: wl.entities ?? [],
      decorations: wl.decorations ?? [],
      mapBg: wl.mapBg,
      seed: wl.seed,
      lastAnalysis: wl.lastAnalysis,
      lastManualAnalysis: wl.lastManualAnalysis,
    }]
    if (!wl.activePlaneId) wl.activePlaneId = 'plane-1'
    charStore.scheduleAutoSave()
  }
  if (!wl.activePlaneId && wl.planes.length > 0) {
    wl.activePlaneId = wl.planes[0].id
  }
}

function defaultPlane(): WorldPlane {
  return { id: 'plane-' + Date.now(), name: 'Material Plane', icon: '🌍', entities: [], decorations: [] }
}

const planes = computed<WorldPlane[]>(() => char.value?.worldLore?.planes ?? [])

const activePlane = computed<WorldPlane | null>(() => {
  const wl = char.value?.worldLore
  if (!wl?.planes?.length) return null
  return wl.planes.find(p => p.id === wl.activePlaneId) ?? wl.planes[0]
})

function setActivePlane(id: string) {
  if (!char.value?.worldLore) return
  char.value.worldLore.activePlaneId = id
  navStack.value = []
  detailId.value = null
}

function addPlane() {
  if (!char.value) return
  const wl = char.value.worldLore ??= { entities: [], planes: [] }
  if (!wl.planes) wl.planes = []
  const id = 'plane-' + Date.now()
  wl.planes.push({ id, name: 'New Plane', icon: '✨', entities: [], decorations: [] })
  wl.activePlaneId = id
  renamingPlaneId.value = id
  renameText.value = 'New Plane'
  charStore.scheduleAutoSave()
}

function deletePlane(id: string) {
  if (!char.value?.worldLore?.planes) return
  if (planes.value.length <= 1) return
  if (!confirm('Delete this plane and all its entities?')) return
  char.value.worldLore.planes = char.value.worldLore.planes.filter(p => p.id !== id)
  if (char.value.worldLore.activePlaneId === id) {
    char.value.worldLore.activePlaneId = char.value.worldLore.planes[0]?.id
  }
  charStore.scheduleAutoSave()
}

function startRenamePlane(plane: WorldPlane) {
  renamingPlaneId.value = plane.id
  renameText.value = plane.name
}

function commitRenamePlane() {
  if (!renamingPlaneId.value || !char.value?.worldLore?.planes) return
  const plane = char.value.worldLore.planes.find(p => p.id === renamingPlaneId.value)
  if (plane && renameText.value.trim()) {
    plane.name = renameText.value.trim()
    charStore.scheduleAutoSave()
  }
  renamingPlaneId.value = null
}

watch(() => char.value, (c) => {
  if (c) ensurePlanes()
}, { immediate: true })

const entities  = computed<WorldEntity[]>(() => activePlane.value?.entities ?? [])
const decorations = computed<MapDecoration[]>(() => activePlane.value?.decorations ?? [])

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '') }

// ── Icon helpers ──────────────────────────────────────────────────
const GI = (n: string) => `/map-icons/gi/${n}.png`  // game-icons.net (white/transparent)

// SVG data URI helper for inline dungeon icons (white on transparent, 32×32)
function DS(body: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`)}`
}

// Is this a white-on-transparent icon? (GI files or inline SVG data URIs)
function isGI(path: string) { return path.includes('/gi/') || path.startsWith('data:') }

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
const PALETTE_CHARS = [
  { icon: GI('person'),               label: 'Person'    },
  { icon: GI('wizard-face'),          label: 'Mage'      },
  { icon: GI('ankh'),                 label: 'Priest'    },
  { icon: GI('battle-axe'),           label: 'Warrior'   },
  { icon: GI('crossed-swords'),       label: 'Fighter'   },
  { icon: GI('hood'),                 label: 'Rogue'     },
  { icon: GI('crown'),                label: 'Noble'     },
  { icon: GI('coins'),                label: 'Merchant'  },
  { icon: GI('captain-hat-profile'),  label: 'Captain'   },
  { icon: GI('flag-objective'),       label: 'Faction'   },
  { icon: GI('scroll-unfurled'),      label: 'Scholar'   },
]
const PALETTE_PLACES = [
  { icon: '/map-icons/city.png',      label: 'City'      },
  { icon: GI('pin'),                  label: 'Location'  },
]

// ── Dungeon palette (inline SVG, no extra files) ───────────────────
const PALETTE_DUNGEON = [
  // Architecture
  { icon: DS('<rect x="3" y="3" width="26" height="26" fill="none" stroke="white" stroke-width="2.5"/>'), label: 'Room' },
  { icon: DS('<rect x="3" y="11" width="26" height="10" fill="none" stroke="white" stroke-width="2.5"/>'), label: 'Corridor' },
  { icon: DS('<rect x="10" y="4" width="12" height="24" fill="none" stroke="white" stroke-width="2"/><circle cx="19.5" cy="16" r="2" fill="white"/>'), label: 'Door' },
  { icon: DS('<rect x="10" y="4" width="12" height="24" fill="none" stroke="white" stroke-width="2" stroke-dasharray="3,2"/><circle cx="19.5" cy="16" r="2" fill="white"/>'), label: 'Secret Door' },
  { icon: DS('<polyline points="3,29 3,23 8,23 8,17 13,17 13,11 18,11 18,5 23,5 23,3" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'), label: 'Stairs' },
  { icon: DS('<rect x="11" y="3" width="10" height="26" fill="none" stroke="white" stroke-width="2"/><rect x="7" y="3" width="18" height="4.5" fill="white"/><rect x="7" y="24.5" width="18" height="4.5" fill="white"/>'), label: 'Pillar' },
  // Objects
  { icon: DS('<rect x="5" y="15" width="22" height="12" fill="none" stroke="white" stroke-width="2"/><path d="M5,15 Q5,5 16,5 Q27,5 27,15" fill="none" stroke="white" stroke-width="2"/><rect x="13" y="18" width="6" height="5" rx="1" fill="none" stroke="white" stroke-width="1.5"/>'), label: 'Chest' },
  { icon: DS('<line x1="16" y1="28" x2="16" y2="17" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M11,17 Q13,7 16,10 Q19,7 21,17 Q19,21 16,19 Q13,21 11,17Z" fill="white"/>'), label: 'Torch' },
  { icon: DS('<ellipse cx="16" cy="9" rx="8" ry="6" fill="none" stroke="white" stroke-width="2"/><ellipse cx="16" cy="24" rx="8" ry="5" fill="none" stroke="white" stroke-width="2"/><line x1="8" y1="9" x2="8" y2="24" stroke="white" stroke-width="2"/><line x1="24" y1="9" x2="24" y2="24" stroke="white" stroke-width="2"/><line x1="9" y1="16.5" x2="23" y2="16.5" stroke="white" stroke-width="1.2"/>'), label: 'Barrel' },
  { icon: DS('<path d="M8,28 L8,11 Q8,4 16,4 Q24,4 24,11 L24,28" fill="none" stroke="white" stroke-width="2"/><line x1="6" y1="28" x2="26" y2="28" stroke="white" stroke-width="3" stroke-linecap="round"/>'), label: 'Altar' },
  // Hazards
  { icon: DS('<polygon points="16,3 4,27 28,27" fill="none" stroke="white" stroke-width="2"/><line x1="16" y1="11" x2="16" y2="19" stroke="white" stroke-width="2.5"/><circle cx="16" cy="23.5" r="2" fill="white"/>'), label: 'Trap' },
  { icon: DS('<ellipse cx="16" cy="16" rx="11" ry="7" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4,2"/><line x1="10" y1="13" x2="14" y2="19" stroke="white" stroke-width="1.5"/><line x1="22" y1="13" x2="18" y2="19" stroke="white" stroke-width="1.5"/>'), label: 'Pit' },
  { icon: DS('<line x1="5" y1="28" x2="16" y2="4" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="27" y1="28" x2="16" y2="4" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="28" x2="27" y2="28" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="20" x2="23" y2="20" stroke="white" stroke-width="1.5"/>'), label: 'Spike Trap' },
  // Enemies
  { icon: DS('<ellipse cx="16" cy="10" rx="8" ry="7" fill="none" stroke="white" stroke-width="2"/><rect x="10" y="16" width="12" height="8" rx="2" fill="none" stroke="white" stroke-width="1.5"/><line x1="13" y1="16" x2="13" y2="24" stroke="white" stroke-width="1.2"/><line x1="19" y1="16" x2="19" y2="24" stroke="white" stroke-width="1.2"/><circle cx="12.5" cy="9" r="2" fill="white"/><circle cx="19.5" cy="9" r="2" fill="white"/>'), label: 'Skull' },
  { icon: DS('<circle cx="16" cy="13" r="5" fill="white"/><line x1="5" y1="8" x2="12" y2="11" stroke="white" stroke-width="2"/><line x1="4" y1="13" x2="11" y2="13" stroke="white" stroke-width="2"/><line x1="5" y1="18" x2="12" y2="15" stroke="white" stroke-width="2"/><line x1="27" y1="8" x2="20" y2="11" stroke="white" stroke-width="2"/><line x1="28" y1="13" x2="21" y2="13" stroke="white" stroke-width="2"/><line x1="27" y1="18" x2="20" y2="15" stroke="white" stroke-width="2"/>'), label: 'Spider' },
  { icon: DS('<path d="M16,26 Q8,20 7,11 Q10,4 16,7 Q22,4 25,11 Q24,20 16,26Z" fill="none" stroke="white" stroke-width="2"/><path d="M7,11 Q2,6 4,3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M25,11 Q30,6 28,3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="13" cy="12" r="2" fill="white"/><circle cx="19" cy="12" r="2" fill="white"/>'), label: 'Dragon' },
  { icon: DS('<path d="M8,24 Q7,16 10,10 Q13,4 16,5 Q19,4 22,10 Q25,16 24,24" fill="none" stroke="white" stroke-width="2"/><circle cx="16" cy="11" r="4" fill="white"/><line x1="8" y1="24" x2="5" y2="29" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="24" x2="27" y2="29" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="21" x2="16" y2="28" stroke="white" stroke-width="2" stroke-linecap="round"/>'), label: 'Monster' },
  { icon: DS('<path d="M7,16 Q7,8 16,6 Q25,8 25,16 Q25,24 16,26 Q7,24 7,16Z" fill="none" stroke="white" stroke-width="2"/><path d="M10,10 L14,14 M22,10 L18,14 M10,22 L14,18 M22,22 L18,18" stroke="white" stroke-width="1.8" stroke-linecap="round"/>'), label: 'Boss' },
]

const ALL_ICONS = [...PALETTE_TERRAIN, ...PALETTE_CHARS, ...PALETTE_PLACES, ...PALETTE_DUNGEON]

// ── Icon selection (respects override) ────────────────────────────
function iconFor(entity: WorldEntity): string {
  if (entity.iconOverride) return entity.iconOverride
  if (entity.kind === 'quest') return GI('scroll-unfurled')
  if (entity.kind === 'city') return '/map-icons/city.png'
  if (entity.kind === 'npc') {
    const n = entity.name.toLowerCase()
    if (/mage|wizard|mago|brujo|hechicero|sorcerer|witch|arcanist|arcano/.test(n))    return GI('wizard-face')
    if (/priest|cleric|sacerdote|cura|padre|bishop|obispo|monje|monk/.test(n))        return GI('ankh')
    if (/rogue|thief|assassin|ladr[oó]n|asesino|spy|esp[ií]a|smuggler/.test(n))      return GI('hood')
    if (/pirate|captain|sailor|pirata|marino|capit[aá]n|navegante/.test(n))           return GI('captain-hat-profile')
    if (/lord|noble|king|queen|duke|count|rey|reina|duque|conde|baron|prince/.test(n)) return GI('crown')
    if (/merchant|trader|tendero|mercader|comerciante|tabernero/.test(n))              return GI('coins')
    if (/warrior|fighter|knight|guerrero|caballero|paladin|soldier|soldado/.test(n))  return GI('battle-axe')
    return GI('person')  // generic NPC — neutral silhouette
  }
  if (entity.kind === 'faction') {
    const n = entity.name.toLowerCase()
    if (/church|iglesia|holy|sagrado|orden|religion|cult|faith|dios|god/.test(n))         return '/map-icons/loc-temple.png'
    if (/guild|gremio|commerce|comercio|merchant|trade|asamblea|assembly|market/.test(n)) return '/map-icons/loc-tavern.png'
    if (/army|ejér|militar|guard|guardia|legi[oó]n|soldier|fuerza/.test(n))               return '/map-icons/loc-tower.png'
    if (/house|casa|noble|dynasty|familia|family|clan|linaje/.test(n))                    return '/map-icons/city.png'
    if (/thiev|ladr|shadow|sombra|dark|oscur|secre|underground/.test(n))                  return '/map-icons/loc-ruins.png'
    return GI('flag-objective')  // generic faction — banner/flag
  }
  // kind === 'location'
  const n = entity.name.toLowerCase()
  if (/cueva|cave|dungeon|mine|cavern|mina|glaciar|glacier|black ice/.test(n)) return '/map-icons/loc-cave.png'
  if (/bosque|forest|wood|grove|arboleda/.test(n))                             return '/map-icons/loc-forest.png'
  if (/ruinas|ruin|ancient|antiguo/.test(n))                                   return '/map-icons/loc-ruins.png'
  if (/templo|iglesia|temple|church|shrine|catedral/.test(n))                  return '/map-icons/loc-temple.png'
  if (/torre|tower|keep|fortaleza/.test(n))                                    return '/map-icons/loc-tower.png'
  if (/taberna|tavern|inn|posada|laboratorio|lab|workshop|taller/.test(n))     return '/map-icons/loc-tavern.png'
  if (/monta[ñn]a|mountain|peak|cima|sierra|cordillera/.test(n))               return '/map-icons/loc-mountain.png'
  if (/cementerio|grave|tomb|catacumb/.test(n))                                return '/map-icons/loc-graveyard.png'
  if (/puerto|port|harbor|dock|muelle/.test(n))                                return '/map-icons/loc-port.png'
  if (/badlands|wasteland|desierto|desert|yermo|páramo|paramo|blight|desolation|maldici/.test(n)) return '/map-icons/loc-danger.png'
  if (/pueblo|village|aldea|hamlet|town|avanzada|outpost|settlement/.test(n))  return '/map-icons/city.png'
  if (/vault|b[oó]veda|santuario|sanctuary|chamber|c[aá]mara/.test(n))        return '/map-icons/loc-ruins.png'
  if (/reino|kingdom|empire|imperio|naci[oó]n|nation|realm|principado/.test(n)) return '/map-icons/city.png'
  return GI('pin')  // generic location
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
      { icon: GI('person'),              label: 'Generic NPC'   },
      { icon: GI('wizard-face'),         label: 'Mage/Wizard'   },
      { icon: GI('ankh'),                label: 'Priest/Cleric' },
      { icon: GI('battle-axe'),          label: 'Warrior'       },
      { icon: GI('crossed-swords'),      label: 'Fighter'       },
      { icon: GI('hood'),                label: 'Rogue/Spy'     },
      { icon: GI('crown'),               label: 'Noble/Lord'    },
      { icon: GI('coins'),               label: 'Merchant'      },
      { icon: GI('captain-hat-profile'), label: 'Captain/Sailor'},
      { icon: GI('scroll-unfurled'),     label: 'Scholar'       },
    ]
    case 'faction':  return [
      { icon: GI('flag-objective'),      label: 'Generic Org'   },
      { icon: '/map-icons/loc-temple.png', label: 'Religious'   },
      { icon: '/map-icons/loc-tavern.png', label: 'Trade/Guild' },
      { icon: '/map-icons/city.png',       label: 'Noble House' },
      { icon: '/map-icons/loc-tower.png',  label: 'Military'    },
      { icon: '/map-icons/loc-ruins.png',  label: 'Thieves'     },
    ]
    case 'location': return PALETTE_TERRAIN
    case 'quest':    return [
      { icon: GI('scroll-unfurled'), label: 'Quest/Task' },
      { icon: GI('flag-objective'),  label: 'Objective'  },
    ]
    default:         return ALL_ICONS
  }
}

const KIND_SIZE: Record<EntityKind, number> = { city: 56, location: 42, npc: 38, faction: 38, quest: 38 }

// ── Multi-level navigation (navStack) ─────────────────────────────
const navStack = ref<WorldEntity[]>([])
const currentParent = computed<WorldEntity | null>(() => navStack.value[navStack.value.length - 1] ?? null)

// NPCs never appear on the map canvas — only in the sidebar entity tree + detail panel.
// The map is for places, organizations, and quests-as-hints. People live in the sidebar.
const MAP_HIDDEN_KINDS = new Set<EntityKind>(['npc', 'quest'])

const visibleNodes = computed<WorldEntity[]>(() => {
  const kindOk = (e: WorldEntity) => !MAP_HIDDEN_KINDS.has(e.kind) && !hiddenKinds.value.has(e.kind)
  if (!currentParent.value) {
    return entities.value.filter(e => !e.parent && kindOk(e))
  }
  const pn = norm(currentParent.value.name)
  return entities.value.filter(e => e.parent && norm(e.parent) === pn && kindOk(e))
})

// ── Quest helpers ─────────────────────────────────────────────────
const allQuests = computed<WorldEntity[]>(() => entities.value.filter(e => e.kind === 'quest'))

function questsFor(entity: WorldEntity): WorldEntity[] {
  const n = norm(entity.name)
  return allQuests.value.filter(q => q.parent && norm(q.parent) === n)
}

function navigateToQuestParent(quest: WorldEntity) {
  if (!quest.parent) { openDetail(quest); return }
  const parent = entities.value.find(e => norm(e.name) === norm(quest.parent!))
  if (parent) navigateTo(parent)
  openDetail(quest)
}

function childrenOf(entity: WorldEntity): WorldEntity[] {
  const n = norm(entity.name)
  // Quests are never counted as children — they appear in the Quest Log only
  return entities.value.filter(e => e.parent && norm(e.parent) === n && e.kind !== 'quest')
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
  const plane = activePlane.value
  if (!plane) return
  if (!plane.decorations) plane.decorations = []
  plane.decorations.push({
    id: Date.now(),
    icon: pendingIcon.value,
    x: Math.max(3, Math.min(95, x)),
    y: Math.max(5, Math.min(93, y)),
    size: 36,
    scope: currentScope.value,
  })
  pendingIcon.value = null   // deselect after placing — user expects to be in move/inspect mode
  charStore.scheduleAutoSave()
}
function deleteDecoration(id: number) {
  const plane = activePlane.value
  if (!plane?.decorations) return
  plane.decorations = plane.decorations.filter(d => d.id !== id)
  charStore.scheduleAutoSave()
}

// ── Edit mode ─────────────────────────────────────────────────────
const editMode    = ref(false)
const pendingIcon = ref<string | null>(null)

function toggleEdit() {
  editMode.value = !editMode.value
  if (!editMode.value) { pendingIcon.value = null }
  else { mapBgInput.value = activePlane.value?.mapBg ?? '' }
}
function selectPalette(icon: string) {
  pendingIcon.value = pendingIcon.value === icon ? null : icon
}

// ── Add entity manually ───────────────────────────────────────────
function addEntity() {
  if (!char.value) return
  const plane = activePlane.value
  if (!plane) return
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
  plane.entities.push(newEnt)
  detailId.value = newEnt.id
  charStore.scheduleAutoSave()
}

// ── World Seed ────────────────────────────────────────────────────
const showSeedForm = ref(false)
const seedForm = reactive({
  worldName: '',
  genre: '',
  notes: '',
})

function openSeedForm() {
  const seed = activePlane.value?.seed ?? {}
  seedForm.worldName = seed.worldName ?? ''
  seedForm.genre = seed.genre ?? ''
  seedForm.notes = seed.notes ?? ''
  showSeedForm.value = true
}

function saveSeed() {
  const plane = activePlane.value
  if (!plane) return
  plane.seed = {
    worldName: seedForm.worldName || undefined,
    genre: seedForm.genre || undefined,
    notes: seedForm.notes || undefined,
  }
  charStore.scheduleAutoSave()
  showSeedForm.value = false
}

// Conflicts removed — AI context is too limited to reliably detect them

// ── Reset & Analyze ───────────────────────────────────────────────
function resetLore() {
  if (!activePlane.value) return
  if (!confirm('Reset all entities in this plane?')) return
  activePlane.value.entities = []
  activePlane.value.decorations = []
  navStack.value = []; detailId.value = null
  charStore.scheduleAutoSave()
}

const analyzing       = ref(false)
const analyzeError    = ref('')
const cooldownSecs    = ref(0)
const extractionLog   = ref<Array<{
  name: string; kind: string; parent: string | null
  parentClarity: string; planeHint: string | null
  assignedPlane: string; warning: string | null
}>>([])
const showExtractionLog = ref(false)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(secs: number) {
  cooldownSecs.value = secs
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (--cooldownSecs.value <= 0) { clearInterval(cooldownTimer!); cooldownTimer = null }
  }, 1000)
}

async function analyzeNotes() {
  if (analyzing.value) return
  const plane = activePlane.value
  if (!plane) return
  analyzing.value = true; analyzeError.value = ''
  try {
    const res = await fetch(`/api/characters/${charId.value}/extract-lore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.getToken()}` },
      body: JSON.stringify({ manual: true, planeId: plane.id }),
    })
    const json = await res.json()
    if (res.status === 429) { startCooldown(json.remaining); return }
    if (!res.ok) { analyzeError.value = json.error ?? 'Error'; return }

    // Helper: strip any entity that matches the world name (AI sometimes creates it accidentally)
    const worldName = activePlane.value?.seed?.worldName ?? ''
    const stripWorldName = (ents: WorldEntity[]) =>
      worldName ? ents.filter(e => norm(e.name) !== norm(worldName)) : ents

    // Sync ALL planes that were updated (multi-plane routing)
    if (json.worldLore?.planes && char.value?.worldLore?.planes) {
      for (const updatedPlane of json.worldLore.planes as WorldPlane[]) {
        const localPlane = char.value.worldLore.planes.find(p => p.id === updatedPlane.id)
        if (localPlane) {
          localPlane.entities = stripWorldName(updatedPlane.entities ?? localPlane.entities)
          localPlane.lastAnalysis = updatedPlane.lastAnalysis
          if (updatedPlane.lastManualAnalysis) localPlane.lastManualAnalysis = updatedPlane.lastManualAnalysis
        }
      }
    } else if (json.worldLore?.entities && activePlane.value) {
      // Legacy fallback
      activePlane.value.entities = stripWorldName(json.worldLore.entities)
      activePlane.value.lastAnalysis = json.worldLore.lastAnalysis
    }

    if (json.extractionLog) {
      extractionLog.value = json.extractionLog
      showExtractionLog.value = json.extractionLog.some((e: any) => e.warning)
    }
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
  const plane = activePlane.value
  if (!plane) return
  plane.entities = plane.entities.filter(e => e.id !== id)
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

// ── Kind visibility filter ────────────────────────────────────────
const hiddenKinds = ref<Set<EntityKind>>(new Set())
function toggleKind(kind: EntityKind) {
  const s = new Set(hiddenKinds.value)
  s.has(kind) ? s.delete(kind) : s.add(kind)
  hiddenKinds.value = s
}

// ── Plane theme ───────────────────────────────────────────────────
const planeBgClass = computed(() => {
  const name = (activePlane.value?.name ?? '').toLowerCase()
  if (/hell|inferno|avernus|nine hells|baator|devil|diablo|infierno/.test(name)) return 'theme-hells'
  if (/underdark|abyss|abismo|underground|drow|subterr/.test(name))               return 'theme-underdark'
  if (/astral|ethereal|ethereo|astral sea|silver sea/.test(name))                  return 'theme-astral'
  if (/feywild|faerie|fey|hada|summer court|winter court|seelie/.test(name))       return 'theme-feywild'
  if (/shadowfell|shadow realm|sombra|darkness|gloom/.test(name))                  return 'theme-shadow'
  if (/spelljammer|wildspace|outer plane|far realm|realmspace/.test(name))         return 'theme-space'
  if (/vault|pocket dimension|demiplane|extradimensional/.test(name))              return 'theme-vault'
  if (/mechanus|clockwork|modron|order/.test(name))                                return 'theme-mechanus'
  return 'theme-material'
})

// ── Grid ──────────────────────────────────────────────────────────
const showGrid = ref(true)
const gridSize = ref<'fine' | 'normal' | 'coarse'>('normal')
const GRID_SIZES = { fine: '5%', normal: '6.25%', coarse: '10%' } as const

// ── Map background ────────────────────────────────────────────────
const mapBgInput = ref('')
function applyMapBg() {
  const url = mapBgInput.value.trim()
  const plane = activePlane.value
  if (!plane) return
  plane.mapBg = url || undefined
  charStore.scheduleAutoSave()
}

// Curated preset map backgrounds (public domain / free)
const PRESET_MAPS = [
  {
    label: 'Carta Marina',
    hint: '1539 • Sea monsters & kingdoms',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Carta_Marina.jpeg',
    swatch: 'linear-gradient(135deg,#8B6520,#C4922A,#7A5010)',
  },
  {
    label: 'Ortelius 1570',
    hint: 'Renaissance world map',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Ortelius_1570_world_map.jpg',
    swatch: 'linear-gradient(135deg,#9E7A3A,#C8A84A,#6E5018)',
  },
  {
    label: 'Fra Mauro',
    hint: '1450 • Illuminated medieval',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Fra_Mauro_1450.jpg',
    swatch: 'linear-gradient(135deg,#5C4820,#8A6C2A,#3C3010)',
  },
  {
    label: 'Hubble Deep Field',
    hint: 'NASA • Space / Astral',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hubble_ultra_deep_field.jpg/1280px-Hubble_ultra_deep_field.jpg',
    swatch: 'linear-gradient(135deg,#04020e,#180840,#08040c)',
  },
  {
    label: 'Pillars of Creation',
    hint: 'NASA • Feywild / Astral',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg/800px-Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg',
    swatch: 'linear-gradient(135deg,#0a0420,#2a1040,#0e0818)',
  },
  {
    label: 'Custom URL',
    hint: 'Paste your own (Midjourney, etc.)',
    url: '__custom__',
    swatch: 'repeating-linear-gradient(45deg,#1a1208 0px,#1a1208 4px,#221a10 4px,#221a10 8px)',
  },
]

function applyPreset(preset: typeof PRESET_MAPS[0]) {
  if (preset.url === '__custom__') {
    // Focus the URL input
    const el = document.querySelector('.toolbar-bg-input') as HTMLInputElement | null
    el?.focus()
    return
  }
  mapBgInput.value = preset.url
  applyMapBg()
}
function clearMapBg() {
  mapBgInput.value = ''
  const plane = activePlane.value
  if (plane) { plane.mapBg = undefined; charStore.scheduleAutoSave() }
}

// ── Sidebar ───────────────────────────────────────────────────────
const sidebarOpen = ref(true)
const sidebarTab  = ref<'entities' | 'quests'>('entities')

interface SBNode { entity: WorldEntity; depth: number }

const sidebarNodes = computed<SBNode[]>(() => {
  const result: SBNode[] = []
  function traverse(ent: WorldEntity, depth: number) {
    result.push({ entity: ent, depth })
    childrenOf(ent).forEach(child => traverse(child, depth + 1))  // childrenOf already excludes quests
  }
  // Exclude quests from entity tree — they live in the Quest Log tab only
  entities.value.filter(e => !e.parent && e.kind !== 'quest').forEach(e => traverse(e, 0))
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
        <span class="last-analysis">{{ fmtTime(activePlane?.lastAnalysis) }}</span>
        <button class="btn-icon-hdr" @click="openSeedForm" :class="{ 'edit-on': showSeedForm || activePlane?.seed?.worldName }" title="World setup">
          <span style="font-size:.9em">⚙</span>
          <span>World</span>
        </button>
        <button class="btn-help" @click="showHelp = !showHelp" :class="{ active: showHelp }" title="Help">
          <HelpCircle :size="13" />
        </button>
        <!-- Edit button: everyone can move/delete existing pins -->
        <button class="btn-icon-hdr" :class="{ 'edit-on': editMode }" @click="toggleEdit" :title="editMode ? 'Exit edit mode' : 'Edit map'">
          <Edit2 :size="13" />
          <span>{{ editMode ? 'Done' : 'Edit' }}</span>
        </button>
        <template v-if="authStore.isPremium">
          <button v-if="entities.length > 0" class="btn-reset" @click="resetLore">↺ Reset</button>
          <button class="btn-analyze" :disabled="analyzing || cooldownSecs > 0" @click="analyzeNotes">
            <Loader2 v-if="analyzing" :size="13" class="spin" />
            <Globe v-else :size="13" />
            <template v-if="cooldownSecs > 0">{{ cooldownSecs }}s</template>
            <template v-else-if="analyzing">Analyzing…</template>
            <template v-else>Analyze notes</template>
          </button>
        </template>
        <template v-else>
          <UpgradeGate
            feature="AI analysis"
            reason="Extract world lore automatically from session notes."
            :inline="true"
          />
        </template>
      </div>
    </div>
    <div v-if="authStore.isPremium && analyzeError" class="analyze-error">{{ analyzeError }}</div>
    <div v-if="authStore.isPremium && (activePlane?.lastAnalysis || activePlane?.lastManualAnalysis)" class="ai-disclaimer">
      AI-generated — review and edit as needed.
    </div>

    <!-- ── Extraction log ── -->
    <Transition name="seed-form">
      <div v-if="showExtractionLog && extractionLog.length" class="extraction-log">
        <div class="elog-header">
          <span class="elog-title">⚠ Extraction report — {{ extractionLog.filter(e => e.warning).length }} item{{ extractionLog.filter(e => e.warning).length > 1 ? 's' : '' }} need review</span>
          <button class="elog-close" @click="showExtractionLog = false">✕</button>
        </div>
        <div class="elog-body">
          <div v-for="(entry, i) in extractionLog" :key="i" class="elog-row" :class="{ 'elog-warn': entry.warning }">
            <span class="elog-kind">{{ { city:'🏙', location:'📍', npc:'👤', faction:'⚔', quest:'📜' }[entry.kind] ?? '?' }}</span>
            <span class="elog-name">{{ entry.name }}</span>
            <span class="elog-parent">{{ entry.parent ? `→ ${entry.parent}` : '— no parent' }}</span>
            <span v-if="entry.planeHint" class="elog-plane">✦ {{ entry.planeHint }}</span>
            <span v-if="entry.warning" class="elog-warning-txt" :title="entry.warning">⚠</span>
          </div>
        </div>
        <div class="elog-footer">Assign missing parents in the detail panel → "Belongs to"</div>
      </div>
    </Transition>

    <!-- ── Seed form ── -->
    <Transition name="seed-form">
      <div v-if="showSeedForm" class="seed-panel">
        <div class="seed-row">
          <label class="seed-label">World name</label>
          <input v-model="seedForm.worldName" class="seed-input" placeholder="e.g. Faerûn, Golarion, Midgard…" maxlength="60" />
        </div>
        <div class="seed-row">
          <label class="seed-label">Genre</label>
          <select v-model="seedForm.genre" class="seed-select">
            <option value="">— choose —</option>
            <option value="high-fantasy">High Fantasy</option>
            <option value="dark-fantasy">Dark Fantasy</option>
            <option value="sword-sorcery">Sword &amp; Sorcery</option>
            <option value="sci-fi">Sci-Fi / Spelljammer</option>
            <option value="historical">Historical</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="seed-row seed-row--col">
          <label class="seed-label">World notes <span class="seed-hint">(tone, themes, key facts — up to 300 chars)</span></label>
          <textarea v-model="seedForm.notes" class="seed-textarea" rows="3" maxlength="300" placeholder="e.g. A world of ancient ruins and corrupt gods. The party is wanted by the Thieves Guild…" />
        </div>
        <div class="seed-actions">
          <button class="seed-cancel" @click="showSeedForm = false">Cancel</button>
          <button class="seed-save" @click="saveSeed">Save world context</button>
        </div>
      </div>
    </Transition>

    <!-- ── Help overlay ── -->
    <div v-if="showHelp" class="help-box">
      <button class="help-close" @click="showHelp = false"><X :size="12" /></button>
      <div class="help-grid">
        <div class="help-item"><span class="help-key">Click entity</span> Open details or drill in (badge = has children)</div>
        <div class="help-item"><span class="help-key">Drag entity</span> Reposition on world map</div>
        <div class="help-item"><span class="help-key">Breadcrumb</span> Navigate back up the hierarchy</div>
        <div class="help-item"><span class="help-key">Edit mode</span> Place terrain icons — click palette → click map. Drag decorations to move.</div>
        <div class="help-item"><span class="help-key">+ Add</span> Create a new entity manually</div>
        <div class="help-item"><span class="help-key">Analyze notes</span> AI extracts entities from session logs (15 min cooldown) — results may contain errors, always review</div>
      </div>
    </div>

    <!-- ── Plane tabs ── -->
    <div v-if="planes.length > 0" class="plane-tabs">
      <div class="plane-tabs-list">
        <div
          v-for="plane in planes" :key="plane.id"
          class="plane-tab"
          :class="{ active: plane.id === worldLore.activePlaneId }"
          @click="setActivePlane(plane.id)"
          @dblclick="startRenamePlane(plane)"
        >
          <template v-if="renamingPlaneId === plane.id">
            <input
              v-model="renameText"
              class="plane-rename-input"
              @keydown.enter="commitRenamePlane"
              @keydown.escape="renamingPlaneId = null"
              @blur="commitRenamePlane"
              @click.stop
              autofocus
            />
          </template>
          <template v-else>
            <span class="plane-icon">{{ plane.icon || '🌍' }}</span>
            <span class="plane-name">{{ plane.name }}</span>
            <button
              v-if="planes.length > 1"
              class="plane-del"
              @click.stop="deletePlane(plane.id)"
              title="Delete plane"
            >×</button>
          </template>
        </div>
        <button class="plane-add" @click="addPlane" title="Add plane">＋</button>
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
          <template v-if="sidebarOpen">
            <button class="sb-tab" :class="{ active: sidebarTab === 'entities' }" @click="sidebarTab = 'entities'">Entities</button>
            <button class="sb-tab" :class="{ active: sidebarTab === 'quests' }" @click="sidebarTab = 'quests'">
              📜 <span>Quests</span>
              <span v-if="allQuests.length" class="sb-quest-count">{{ allQuests.length }}</span>
            </button>
          </template>
          <button class="btn-toggle" @click="sidebarOpen = !sidebarOpen">
            <ChevronLeft v-if="sidebarOpen" :size="13" />
            <ChevronRight v-else :size="13" />
          </button>
        </div>

        <!-- ENTITIES TAB -->
        <div v-if="sidebarOpen && sidebarTab === 'entities'" class="sidebar-body">
          <div
            v-for="{ entity, depth } in sidebarNodes" :key="entity.id"
            class="sb-item"
            :class="{ active: detailId === entity.id }"
            :style="{ paddingLeft: `calc(0.7rem + ${depth} * 0.85rem)` }"
            @click="navigateTo(entity)"
          >
            <img :src="iconFor(entity)" :class="['sb-icon', { 'sb-icon-sm': depth > 0 }, isGI(iconFor(entity)) ? 'gi' : '']" />
            <span class="sb-name">{{ entity.name }}</span>
            <!-- ⚠ parent unclear: NPC/faction at root with no parent -->
            <span
              v-if="depth === 0 && !entity.parent && (entity.kind === 'npc' || entity.kind === 'faction')"
              class="sb-warn"
              title="Parent unclear — assign a location in the detail panel"
            >⚠</span>
            <span v-if="questsFor(entity).length" class="sb-quest-pip">{{ questsFor(entity).length }}</span>
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
          <button class="sb-add-btn" @click="addEntity"><Plus :size="11" /> New entity</button>
        </div>

        <!-- QUEST LOG TAB (WoW-style) -->
        <div v-if="sidebarOpen && sidebarTab === 'quests'" class="sidebar-body quest-log">
          <div v-if="allQuests.length === 0" class="quest-empty">
            <span class="quest-empty-icon">📜</span>
            <p>No active quests.</p>
            <p class="quest-empty-hint">Analyze session notes to extract quests automatically.</p>
          </div>
          <div
            v-for="quest in allQuests" :key="quest.id"
            class="quest-item"
            :class="{ active: detailId === quest.id, done: quest.flags?.some(f => f.type === 'visit') }"
            @click="navigateToQuestParent(quest)"
          >
            <div class="quest-item-header">
              <span class="quest-excl" :class="{ done: quest.flags?.some(f => f.type === 'visit') }">!</span>
              <span class="quest-name">{{ quest.name }}</span>
            </div>
            <div v-if="quest.parent" class="quest-location">
              <span class="quest-pin">📍</span>
              <span>{{ quest.parent }}</span>
            </div>
            <div v-if="quest.description" class="quest-desc">{{ quest.description }}</div>
            <div v-if="quest.flags?.length" class="quest-flags">
              <span v-for="f in quest.flags.slice(0,2)" :key="f.type" class="quest-flag-pill" :style="{ borderColor: flagColor(f.type), color: flagColor(f.type) }">{{ f.type }}</span>
            </div>
          </div>
          <button class="sb-add-btn" @click="addEntity"><Plus :size="11" /> New quest</button>
        </div>
      </aside>

      <!-- ── Canvas ── -->
      <div
        ref="canvasRef"
        class="world-canvas"
        :class="[planeBgClass, { 'edit-cursor': editMode && pendingIcon }]"
      >
        <div v-if="editMode && !authStore.isPremium" class="free-edit-hint">
          Move or delete existing pins — upgrade to add new ones
        </div>
        <!-- Custom map background image -->
        <div
          v-if="activePlane?.mapBg"
          class="map-bg"
          :style="{ backgroundImage: `url('${activePlane.mapBg}')` }"
        />

        <!-- Grid overlay -->
        <div
          v-if="showGrid"
          class="grid-overlay"
          :style="{ backgroundSize: `${GRID_SIZES[gridSize]} ${GRID_SIZES[gridSize]}` }"
        />

        <!-- Compass -->
        <img src="/map-icons/compass.png" class="map-compass" alt="" />

        <!-- Map legend + controls -->
        <div class="map-legend">
          <div class="legend-section legend-entities">
            <span class="legend-title">Show/Hide</span>
            <!-- NPCs never appear on the canvas — legend only shows map-visible kinds -->
            <button
              v-for="k in (['city','location','faction'] as EntityKind[])" :key="k"
              class="legend-btn" :class="{ hidden: hiddenKinds.has(k) }"
              @click="toggleKind(k)"
              :title="(hiddenKinds.has(k) ? 'Show ' : 'Hide ') + { city:'Cities', location:'Locations', faction:'Factions' }[k]"
            >
              <span class="legend-icon">{{ { city:'🏙', location:'📍', faction:'⚔' }[k] }}</span>
              <span class="legend-label">{{ { city:'Cities', location:'Places', faction:'Factions' }[k] }}</span>
            </button>
          </div>
          <div class="legend-sep"></div>
          <div class="legend-section legend-grid">
            <span class="legend-title">Grid</span>
            <button class="legend-btn" :class="{ active: showGrid }" @click="showGrid = !showGrid" title="Toggle grid overlay">
              <span class="legend-icon">▦</span>
              <span class="legend-label">{{ showGrid ? 'On' : 'Off' }}</span>
            </button>
            <template v-if="showGrid">
              <button
                v-for="[sz, label] in ([['fine','Fine'],['normal','Med'],['coarse','Large']] as const)" :key="sz"
                class="legend-btn grid-sz-btn" :class="{ active: gridSize === sz }"
                @click="gridSize = sz" :title="`Grid size: ${sz} (${{ fine:'~32 cells', normal:'~16 cells', coarse:'~10 cells' }[sz]})`"
              >{{ label }}</button>
            </template>
          </div>
        </div>

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
          <button v-if="editMode" class="deco-del" @mousedown.stop @click.stop="deleteDecoration(deco.id)"><X :size="9" /></button>
        </div>

        <!-- ══ WORLD VIEW ══ -->
        <Transition name="view" mode="out-in">
          <div v-if="navStack.length === 0" key="world" class="map-layer" @click.self="onCanvasClick">
            <div
              v-for="entity in visibleNodes" :key="entity.id"
              class="node-wrap"
              :style="{ left: entity.x + '%', top: entity.y + '%' }"
              @mousedown="startDragEntity($event, entity)"
              @click.stop="onEntityClick(entity)"
            >
              <div class="node-img-wrap" :class="{ selected: detailId === entity.id, drillable: hasChildren(entity) }">
                <img :src="iconFor(entity)" :class="['node-img', isGI(iconFor(entity)) ? 'gi' : 'kenney']" :style="{ width: KIND_SIZE[entity.kind] + 'px', height: KIND_SIZE[entity.kind] + 'px' }" :alt="entity.name" />
                <span v-if="hasChildren(entity)" class="child-badge">{{ childrenOf(entity).length }}</span>
              </div>
              <div v-if="entity.flags?.length" class="node-flags">
                <span v-for="f in entity.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ entity.name }}</span>
              <!-- Quest hint: subtle "! N" under the label, doesn't compete with child-badge -->
              <span v-if="questsFor(entity).length" class="node-quest-hint" @click.stop="() => { sidebarTab = 'quests'; sidebarOpen = true; openDetail(questsFor(entity)[0]) }">
                ✦ {{ questsFor(entity).length }} quest{{ questsFor(entity).length > 1 ? 's' : '' }}
              </span>
            </div>
          </div>

          <!-- ══ DRILL-DOWN VIEW (top-down tree layout) ══ -->
          <div v-else :key="navStack[navStack.length-1].id" class="map-layer" @click.self="onCanvasClick">
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
                <img :src="iconFor(navStack[navStack.length-1])" :class="['node-img node-center-img', isGI(iconFor(navStack[navStack.length-1])) ? 'gi' : 'kenney']" :alt="navStack[navStack.length-1].name" />
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
                <img :src="iconFor(child)" :class="['node-img', isGI(iconFor(child)) ? 'gi' : 'kenney']" :style="{ width: KIND_SIZE[child.kind] + 'px', height: KIND_SIZE[child.kind] + 'px' }" :alt="child.name" />
                <span v-if="hasChildren(child)" class="child-badge">{{ childrenOf(child).length }}</span>
              </div>
              <div v-if="child.flags?.length" class="node-flags">
                <span v-for="f in child.flags.slice(0,3)" :key="f.type" class="flag-dot" :style="{ background: flagColor(f.type) }" />
              </div>
              <span class="node-label">{{ child.name }}</span>
              <span v-if="questsFor(child).length" class="node-quest-hint" @click.stop="() => { sidebarTab = 'quests'; sidebarOpen = true; openDetail(questsFor(child)[0]) }">
                ✦ {{ questsFor(child).length }} quest{{ questsFor(child).length > 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </Transition>

        <!-- ── Floating edit toolbar (premium only — add new pins + map bg) ── -->
        <Transition name="toolbar">
          <div v-if="editMode && authStore.isPremium" class="edit-toolbar">
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
            <div class="toolbar-section-label">Characters</div>
            <div class="toolbar-grid">
              <button
                v-for="item in PALETTE_CHARS" :key="item.icon"
                class="palette-btn" :class="{ active: pendingIcon === item.icon }"
                :title="item.label" @click="selectPalette(item.icon)"
              >
                <img :src="item.icon" class="palette-img" />
              </button>
            </div>
            <div class="toolbar-section-label">Places</div>
            <div class="toolbar-grid">
              <button
                v-for="item in PALETTE_PLACES" :key="item.icon"
                class="palette-btn" :class="{ active: pendingIcon === item.icon }"
                :title="item.label" @click="selectPalette(item.icon)"
              >
                <img :src="item.icon" class="palette-img" />
              </button>
            </div>
            <div class="toolbar-section-label">Dungeon</div>
            <div class="toolbar-grid">
              <button
                v-for="item in PALETTE_DUNGEON" :key="item.label"
                class="palette-btn" :class="{ active: pendingIcon === item.icon }"
                :title="item.label" @click="selectPalette(item.icon)"
              >
                <img :src="item.icon" class="palette-img" />
              </button>
            </div>
            <div v-if="pendingIcon" class="toolbar-hint">Click map to place</div>
            <div v-else class="toolbar-hint">Select an icon above</div>
            <!-- Map background section -->
            <div class="toolbar-section-label" style="margin-top:.2rem">Map background</div>
            <div class="preset-grid">
              <button
                v-for="p in PRESET_MAPS" :key="p.label"
                class="preset-btn"
                :class="{ active: p.url !== '__custom__' && activePlane?.mapBg === p.url }"
                :style="{ '--sw': p.swatch }"
                :title="p.hint"
                @click="applyPreset(p)"
              >{{ p.label }}</button>
            </div>
            <input
              v-model="mapBgInput"
              class="toolbar-bg-input"
              type="url"
              placeholder="Or paste any image URL…"
              @blur="applyMapBg"
              @keydown.enter.prevent="applyMapBg"
            />
            <div v-if="activePlane?.mapBg" class="toolbar-hint" style="color:rgba(120,200,120,.7)">✓ Custom map active</div>
            <button v-if="activePlane?.mapBg" class="toolbar-clear-btn" @click="clearMapBg">✕ Remove map</button>
          </div>
        </Transition>
      </div>

      <!-- ── Detail panel ── -->
      <aside v-if="detail" class="detail-panel">
        <div class="detail-header">
          <img :src="iconFor(detail)" :class="['detail-icon', isGI(iconFor(detail)) ? 'gi' : '']" />
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
          <option value="quest">Quest / Mission</option>
        </select>

        <!-- Editable description -->
        <textarea
          class="detail-desc-input"
          :value="detail.description"
          placeholder="Description…"
          @blur="updateDesc(($event.target as HTMLTextAreaElement).value)"
          rows="5"
        />

        <!-- Parent assignment -->
        <div class="detail-section">
          <div class="section-label">
            Belongs to
            <span v-if="detail.kind === 'npc' && !detail.parent" class="parent-warn" title="NPCs without a parent appear on the root map and can clutter it. Assign a location or city.">⚠ unassigned</span>
          </div>
          <select
            :value="detail.parent ?? ''"
            @change="assignParent(($event.target as HTMLSelectElement).value)"
            class="parent-select"
            :class="{ 'parent-warn-select': detail.kind === 'npc' && !detail.parent }"
          >
            <option value="">— top-level (no parent) —</option>
            <option v-for="opt in parentOptions" :key="opt.id" :value="opt.name">{{ opt.name }}</option>
          </select>
          <div v-if="detail.parent" class="parent-current">
            📍 {{ detail.parent }}
          </div>
        </div>

        <!-- Icon override — grouped by category -->
        <div class="detail-section">
          <div class="section-label">Icon</div>
          <div class="icon-pick-sublabel">Best for {{ detail.kind }}</div>
          <div class="icon-pick-grid">
            <button
              v-for="item in recommendedForKind(detail.kind)" :key="item.icon"
              :class="['icon-pick-btn', isGI(item.icon) ? 'gi' : '', { active: (detail.iconOverride ?? iconFor(detail)) === item.icon }]"
              :title="item.label"
              @click="applyIconOverride(item.icon)"
            >
              <img :src="item.icon" />
            </button>
          </div>
          <details class="icon-more-details">
            <summary class="icon-pick-sublabel icon-more-summary">More icons ▸</summary>
            <div class="icon-pick-sublabel" style="margin-top:.4rem">Terrain</div>
            <div class="icon-pick-grid">
              <button v-for="item in PALETTE_TERRAIN" :key="item.icon+'_t'"
                :class="['icon-pick-btn', { active: (detail.iconOverride ?? iconFor(detail)) === item.icon }]"
                :title="item.label" @click="applyIconOverride(item.icon)">
                <img :src="item.icon" />
              </button>
            </div>
            <div class="icon-pick-sublabel" style="margin-top:.3rem">Characters</div>
            <div class="icon-pick-grid">
              <button v-for="item in PALETTE_CHARS" :key="item.icon+'_c'"
                :class="['icon-pick-btn gi', { active: (detail.iconOverride ?? iconFor(detail)) === item.icon }]"
                :title="item.label" @click="applyIconOverride(item.icon)">
                <img :src="item.icon" />
              </button>
            </div>
            <div class="icon-pick-sublabel" style="margin-top:.3rem">Dungeon</div>
            <div class="icon-pick-grid">
              <button v-for="item in PALETTE_DUNGEON" :key="item.label+'_d'"
                :class="['icon-pick-btn gi', { active: (detail.iconOverride ?? iconFor(detail)) === item.icon }]"
                :title="item.label" @click="applyIconOverride(item.icon)">
                <img :src="item.icon" />
              </button>
            </div>
          </details>
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
.world-panel { user-select: none; display: flex; flex-direction: column; height: 100%; }

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
.ai-disclaimer {
  font-size: .68rem;
  color: var(--text-muted);
  padding: .2rem .85rem .35rem;
  opacity: .7;
}

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
.world-layout { display: flex; gap: .75rem; flex: 1; min-height: 500px; }

/* ══ Sidebar ══ */
.world-sidebar {
  width: 185px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--bg-elevated); display: flex; flex-direction: column;
  transition: width .2s ease; overflow: hidden;
}
.world-sidebar.collapsed { width: 36px; }

.sidebar-header {
  display: flex; align-items: center; gap: .2rem;
  padding: .35rem .4rem .35rem .5rem; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.sidebar-title { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); }

/* Sidebar tabs */
.sb-tab {
  display: flex; align-items: center; gap: .22rem;
  background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm);
  color: var(--text-muted); font-family: inherit; font-size: .63rem; font-weight: 600;
  padding: .18rem .4rem; cursor: pointer; transition: all var(--transition);
  flex-shrink: 0;
}
.sb-tab:hover { color: var(--text-secondary); }
.sb-tab.active { background: rgba(201,168,76,.1); border-color: var(--gold-border); color: var(--gold); }
.sb-quest-count {
  background: #f5a623; color: rgba(40,20,0,.9); border-radius: 10px;
  font-size: .52rem; font-weight: 800; padding: 0 .28rem; min-width: 14px; text-align: center;
}
.sb-quest-pip {
  background: linear-gradient(135deg, #f5d020, #f5a623);
  color: rgba(40,20,0,.9); border-radius: 10px;
  font-size: .5rem; font-weight: 800; padding: 0 .22rem; min-width: 13px;
  text-align: center; flex-shrink: 0; margin-left: .1rem;
}
.btn-toggle { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: .1rem; display: flex; align-items: center; }
.btn-toggle:hover { color: var(--gold); }

.sidebar-body { flex: 1; overflow-y: auto; padding: .35rem 0; display: flex; flex-direction: column; overscroll-behavior: contain; }

.sb-section-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); padding: .4rem .7rem .15rem; }

.sb-item {
  display: flex; align-items: center; gap: .4rem;
  padding: .28rem .7rem; cursor: pointer;
  border-left: 2.5px solid transparent; transition: all var(--transition);
}
.sb-item:hover { background: rgba(201,168,76,.06); }
.sb-item.active { background: rgba(201,168,76,.1); border-left-color: var(--gold); }

.sb-icon {
  width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;
  /* Kenney colored icons → invert to warm white so they show on dark bg */
  filter: brightness(0) invert(0.88) sepia(0.15);
}
.sb-icon.gi {
  /* GI icons are already white — just slight gold tint */
  filter: sepia(0.35) hue-rotate(15deg) brightness(1.05) opacity(0.88);
}
.sb-icon-sm { width: 15px; height: 15px; }
.sb-name { font-size: .73rem; color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-item.active .sb-name { color: var(--gold); }
.sb-count { font-size: .58rem; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: .03rem .28rem; flex-shrink: 0; }
.sb-warn { font-size: .6rem; color: rgba(220,160,30,.85); flex-shrink: 0; cursor: help; line-height: 1; }
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
  /* Material Plane: illustrated fantasy map — terrain zones over parchment */
  background:
    /* Forests — deep greens, scattered */
    radial-gradient(ellipse 30% 24% at 17% 32%, rgba(22,88,22,0.55) 0%, transparent 55%),
    radial-gradient(ellipse 26% 20% at 73% 60%, rgba(28,100,24,0.50) 0%, transparent 52%),
    radial-gradient(ellipse 20% 17% at 40% 78%, rgba(30,85,18,0.45) 0%, transparent 48%),
    radial-gradient(ellipse 16% 13% at 88% 38%, rgba(25,78,18,0.38) 0%, transparent 44%),
    /* Mountains — warm grey-ochre ridges */
    radial-gradient(ellipse 34% 26% at 64% 16%, rgba(125,105,68,0.52) 0%, transparent 56%),
    radial-gradient(ellipse 20% 26% at 7% 57%, rgba(115,95,62,0.44) 0%, transparent 50%),
    radial-gradient(ellipse 16% 13% at 50% 44%, rgba(135,112,72,0.30) 0%, transparent 44%),
    /* Seas & lakes — deep cobalt */
    radial-gradient(ellipse 26% 20% at 89% 82%, rgba(28,78,165,0.42) 0%, transparent 55%),
    radial-gradient(ellipse 16% 20% at 26% 3%,  rgba(32,82,158,0.34) 0%, transparent 48%),
    radial-gradient(ellipse 11% 9%  at 61% 92%, rgba(38,88,152,0.28) 0%, transparent 40%),
    /* Badlands / plains — warm ochre */
    radial-gradient(ellipse 28% 20% at 43% 20%, rgba(185,145,58,0.26) 0%, transparent 50%),
    /* Warm overall parchment tone */
    radial-gradient(ellipse 110% 90% at 50% 50%, rgba(195,162,90,0.12) 0%, transparent 80%),
    url('/map-icons/parchment.png') center/cover no-repeat;
  cursor: default;
}
.world-canvas.edit-cursor { cursor: crosshair; }

/* ── Plane themes ── */

/* Nine Hells — hellfire & burning darkness */
.world-canvas.theme-hells {
  background:
    /* Lava pockets glowing from below */
    radial-gradient(circle 14% at 18% 82%, rgba(255,110,0,0.32) 0%, transparent 60%),
    radial-gradient(circle 10% at 76% 65%, rgba(240,80,0,0.26) 0%, transparent 55%),
    radial-gradient(circle 7%  at 44% 28%, rgba(220,55,0,0.20) 0%, transparent 50%),
    radial-gradient(circle 5%  at 88% 14%, rgba(200,40,0,0.16) 0%, transparent 45%),
    /* Hellfire glow from the abyss below */
    radial-gradient(ellipse 100% 55% at 50% 115%, rgba(230,55,5,0.70) 0%, transparent 58%),
    /* Blood-red smoke ceiling */
    radial-gradient(ellipse 110% 40% at 50% -12%, rgba(150,12,0,0.60) 0%, transparent 55%),
    /* Base: near-black with deep crimson */
    linear-gradient(175deg, #130202 0%, #1e0404 30%, #190303 60%, #0f0101 100%);
}
.world-canvas.theme-hells .node-label { color: rgba(255,205,145,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.9), 0 0 14px rgba(200,65,8,0.65); }
.world-canvas.theme-hells .btn-crumb,
.world-canvas.theme-hells .crumb-sep { color: rgba(225,140,78,0.72); }
.world-canvas.theme-hells .crumb-current { color: rgba(245,162,80,0.88); text-shadow: none; }
.world-canvas.theme-hells .node-img.gi { filter: invert(1) sepia(1) saturate(3) hue-rotate(340deg) brightness(0.68) drop-shadow(0 2px 6px rgba(200,45,0,.65)); }

/* Underdark — bioluminescent cave darkness */
.world-canvas.theme-underdark {
  background:
    /* Bioluminescent glow spots */
    radial-gradient(circle 9%  at 14% 24%, rgba(35,115,205,0.35) 0%, transparent 60%),
    radial-gradient(circle 7%  at 66% 76%, rgba(80,38,188,0.30) 0%, transparent 55%),
    radial-gradient(circle 5%  at 83% 14%, rgba(55,175,118,0.25) 0%, transparent 50%),
    radial-gradient(circle 4%  at 34% 89%, rgba(98,45,200,0.22) 0%, transparent 45%),
    radial-gradient(circle 6%  at 51% 47%, rgba(18,78,160,0.20) 0%, transparent 44%),
    /* Deep cave atmosphere */
    radial-gradient(ellipse 68% 48% at 32% 68%, rgba(8,18,88,0.40) 0%, transparent 65%),
    radial-gradient(ellipse 58% 42% at 74% 26%, rgba(48,6,72,0.34) 0%, transparent 58%),
    linear-gradient(158deg, #020308 0%, #050710 42%, #030408 100%);
}
.world-canvas.theme-underdark .node-label { color: rgba(178,202,255,0.88); text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 12px rgba(58,80,210,0.45); }
.world-canvas.theme-underdark .btn-crumb,
.world-canvas.theme-underdark .crumb-sep { color: rgba(138,162,222,0.62); }
.world-canvas.theme-underdark .crumb-current { color: rgba(158,182,255,0.82); text-shadow: none; }
.world-canvas.theme-underdark .node-img.gi { filter: invert(1) sepia(0.5) saturate(1.5) hue-rotate(200deg) brightness(0.72) drop-shadow(0 2px 5px rgba(0,0,90,.55)); }

/* Astral Plane — nebula & silver sea */
.world-canvas.theme-astral {
  background:
    /* Nebula clouds */
    radial-gradient(ellipse 58% 38% at 28% 62%, rgba(105,38,208,0.32) 0%, transparent 65%),
    radial-gradient(ellipse 48% 34% at 76% 22%, rgba(38,82,228,0.26) 0%, transparent 60%),
    radial-gradient(ellipse 38% 28% at 56% 86%, rgba(125,28,158,0.24) 0%, transparent 55%),
    /* Bright nebula core */
    radial-gradient(ellipse 22% 18% at 46% 36%, rgba(168,82,255,0.22) 0%, transparent 52%),
    /* Faint silver shimmer */
    radial-gradient(ellipse 85% 32% at 50% 52%, rgba(165,145,225,0.08) 0%, transparent 72%),
    linear-gradient(145deg, #030110 0%, #07051a 38%, #05030e 68%, #010008 100%);
}
.world-canvas.theme-astral .node-label { color: rgba(215,192,255,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.9), 0 0 14px rgba(125,82,228,0.55); }
.world-canvas.theme-astral .btn-crumb,
.world-canvas.theme-astral .crumb-sep { color: rgba(182,152,242,0.62); }
.world-canvas.theme-astral .crumb-current { color: rgba(202,172,255,0.88); text-shadow: none; }
.world-canvas.theme-astral .node-img.gi { filter: invert(1) sepia(0.3) saturate(2) hue-rotate(240deg) brightness(0.78) drop-shadow(0 2px 5px rgba(88,42,188,.55)); }

/* Feywild — enchanted forest twilight */
.world-canvas.theme-feywild {
  background:
    /* Magical light sparks */
    radial-gradient(circle 7%  at 24% 19%, rgba(175,255,95,0.24) 0%, transparent 55%),
    radial-gradient(circle 5%  at 79% 67%, rgba(148,255,78,0.20) 0%, transparent 50%),
    radial-gradient(circle 4%  at 51% 87%, rgba(98,255,148,0.18) 0%, transparent 46%),
    /* Enchanted canopy */
    radial-gradient(ellipse 72% 55% at 44% 36%, rgba(18,105,18,0.45) 0%, transparent 65%),
    radial-gradient(ellipse 52% 42% at 82% 72%, rgba(28,115,22,0.36) 0%, transparent 58%),
    radial-gradient(ellipse 35% 28% at 12% 58%, rgba(22,95,15,0.30) 0%, transparent 52%),
    /* Ethereal underglow */
    radial-gradient(ellipse 95% 42% at 50% 105%, rgba(82,205,58,0.22) 0%, transparent 58%),
    linear-gradient(162deg, #010802 0%, #030e04 42%, #020a03 100%);
}
.world-canvas.theme-feywild .node-label { color: rgba(162,245,162,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.88), 0 0 14px rgba(38,165,38,0.55); }
.world-canvas.theme-feywild .btn-crumb,
.world-canvas.theme-feywild .crumb-sep { color: rgba(118,202,98,0.62); }
.world-canvas.theme-feywild .crumb-current { color: rgba(138,222,118,0.88); text-shadow: none; }
.world-canvas.theme-feywild .node-img.gi { filter: invert(1) sepia(1) saturate(2) hue-rotate(90deg) brightness(0.62) drop-shadow(0 2px 5px rgba(0,85,0,.55)); }

/* Shadowfell — ashen void, dying light */
.world-canvas.theme-shadow {
  background:
    /* Dying light sources — muted purples */
    radial-gradient(circle 11% at 24% 34%, rgba(82,62,125,0.26) 0%, transparent 60%),
    radial-gradient(circle 7%  at 69% 74%, rgba(62,42,108,0.22) 0%, transparent 55%),
    radial-gradient(circle 5%  at 44% 12%, rgba(52,32,88,0.18) 0%, transparent 48%),
    /* Ashen fog layers */
    radial-gradient(ellipse 95% 52% at 50% 18%, rgba(28,18,48,0.42) 0%, transparent 65%),
    radial-gradient(ellipse 72% 42% at 28% 82%, rgba(38,28,62,0.32) 0%, transparent 60%),
    radial-gradient(ellipse 60% 45% at 78% 40%, rgba(22,15,38,0.28) 0%, transparent 55%),
    linear-gradient(168deg, #040408 0%, #08070e 42%, #050408 100%);
}
.world-canvas.theme-shadow .node-label { color: rgba(182,172,205,0.85); text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 8px rgba(80,60,120,0.35); }
.world-canvas.theme-shadow .btn-crumb,
.world-canvas.theme-shadow .crumb-sep { color: rgba(152,142,182,0.62); }
.world-canvas.theme-shadow .crumb-current { color: rgba(172,162,202,0.82); text-shadow: none; }
.world-canvas.theme-shadow .node-img.gi { filter: grayscale(0.65) invert(0.82) brightness(0.68) drop-shadow(0 2px 4px rgba(0,0,0,.65)); }

/* Spelljammer / Wildspace — deep space with stars */
.world-canvas.theme-space {
  background:
    /* Simulated star clusters */
    radial-gradient(circle 2%  at 18% 14%, rgba(255,255,255,0.18) 0%, transparent 50%),
    radial-gradient(circle 1%  at 52% 7%,  rgba(205,222,255,0.15) 0%, transparent 45%),
    radial-gradient(circle 1%  at 79% 44%, rgba(222,202,255,0.12) 0%, transparent 40%),
    radial-gradient(circle 2%  at 33% 72%, rgba(182,222,255,0.10) 0%, transparent 38%),
    radial-gradient(circle 1%  at 65% 88%, rgba(255,245,202,0.14) 0%, transparent 42%),
    radial-gradient(circle 2%  at 90% 28%, rgba(255,255,225,0.12) 0%, transparent 44%),
    radial-gradient(circle 1%  at 8%  92%, rgba(202,218,255,0.10) 0%, transparent 38%),
    /* Nebula colour clouds */
    radial-gradient(ellipse 52% 36% at 24% 62%, rgba(18,8,88,0.48) 0%, transparent 65%),
    radial-gradient(ellipse 42% 32% at 74% 28%, rgba(52,4,82,0.42) 0%, transparent 58%),
    radial-gradient(ellipse 30% 24% at 50% 80%, rgba(8,22,68,0.35) 0%, transparent 52%),
    linear-gradient(148deg, #010108 0%, #020110 38%, #010108 100%);
}
.world-canvas.theme-space .node-label { color: rgba(202,222,255,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 10px rgba(102,152,255,0.45); }
.world-canvas.theme-space .btn-crumb,
.world-canvas.theme-space .crumb-sep { color: rgba(162,182,232,0.62); }
.world-canvas.theme-space .crumb-current { color: rgba(182,202,255,0.88); text-shadow: none; }
.world-canvas.theme-space .node-img.gi { filter: invert(1) sepia(0.2) saturate(1.5) hue-rotate(200deg) brightness(0.82) drop-shadow(0 2px 7px rgba(80,122,255,.48)); }

/* Wandering Vault / Pocket Dimension — gilded mystery */
.world-canvas.theme-vault {
  background:
    /* Gold light sources */
    radial-gradient(circle 14% at 50% 50%, rgba(205,162,18,0.28) 0%, transparent 62%),
    radial-gradient(circle 9%  at 18% 28%, rgba(188,142,12,0.22) 0%, transparent 55%),
    radial-gradient(circle 7%  at 76% 72%, rgba(205,158,8,0.18) 0%, transparent 50%),
    radial-gradient(circle 5%  at 85% 18%, rgba(182,138,8,0.15) 0%, transparent 45%),
    /* Gilded haze layers */
    radial-gradient(ellipse 82% 62% at 50% 38%, rgba(125,92,6,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 52% 42% at 18% 82%, rgba(105,78,4,0.26) 0%, transparent 62%),
    linear-gradient(162deg, #050302 0%, #0c0802 38%, #080502 100%);
}
.world-canvas.theme-vault .node-label { color: rgba(242,212,132,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.9), 0 0 14px rgba(165,122,18,0.48); }
.world-canvas.theme-vault .btn-crumb,
.world-canvas.theme-vault .crumb-sep { color: rgba(202,172,78,0.62); }
.world-canvas.theme-vault .crumb-current { color: rgba(222,192,102,0.88); text-shadow: none; }
.world-canvas.theme-vault .node-img.gi { filter: invert(1) sepia(1) saturate(2.5) hue-rotate(10deg) brightness(0.62) drop-shadow(0 2px 5px rgba(125,82,0,.55)); }

/* Mechanus / Clockwork — cold steel blueprint */
.world-canvas.theme-mechanus {
  background:
    /* Circuit / gear highlights */
    radial-gradient(circle 11% at 50% 50%, rgba(58,122,205,0.24) 0%, transparent 56%),
    radial-gradient(circle 8%  at 20% 74%, rgba(38,102,185,0.20) 0%, transparent 50%),
    radial-gradient(circle 6%  at 79% 26%, rgba(48,112,192,0.18) 0%, transparent 46%),
    radial-gradient(circle 4%  at 32% 22%, rgba(55,118,198,0.14) 0%, transparent 42%),
    /* Cold steel atmosphere */
    radial-gradient(ellipse 82% 58% at 50% 28%, rgba(12,32,82,0.42) 0%, transparent 70%),
    radial-gradient(ellipse 62% 48% at 22% 78%, rgba(18,42,105,0.32) 0%, transparent 62%),
    radial-gradient(ellipse 50% 38% at 75% 65%, rgba(10,28,72,0.26) 0%, transparent 55%),
    linear-gradient(162deg, #030510 0%, #060a1a 38%, #040810 100%);
}
.world-canvas.theme-mechanus .node-label { color: rgba(162,202,242,0.92); text-shadow: 0 1px 4px rgba(0,0,0,.9), 0 0 12px rgba(38,102,182,0.48); }
.world-canvas.theme-mechanus .btn-crumb,
.world-canvas.theme-mechanus .crumb-sep { color: rgba(122,162,212,0.62); }
.world-canvas.theme-mechanus .crumb-current { color: rgba(142,182,232,0.88); text-shadow: none; }
.world-canvas.theme-mechanus .node-img.gi { filter: invert(1) sepia(0.4) saturate(1.5) hue-rotate(180deg) brightness(0.78) drop-shadow(0 2px 5px rgba(18,62,145,.55)); }

/* For all dark themes: grid lines need to be lighter */
.world-canvas.theme-hells .grid-overlay,
.world-canvas.theme-underdark .grid-overlay,
.world-canvas.theme-astral .grid-overlay,
.world-canvas.theme-feywild .grid-overlay,
.world-canvas.theme-shadow .grid-overlay,
.world-canvas.theme-space .grid-overlay,
.world-canvas.theme-vault .grid-overlay,
.world-canvas.theme-mechanus .grid-overlay {
  background-image:
    linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
}

.free-edit-hint {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 8, 4, 0.75);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.68rem;
  padding: 0.25rem 0.75rem;
  pointer-events: none;
  white-space: nowrap;
  z-index: 20;
}
.world-canvas::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: rgba(30,15,0,.06);
  box-shadow: inset 0 0 80px rgba(30,15,0,.30), inset 0 0 20px rgba(30,15,0,.15);
}
/* Inner decorative border — parchment map frame feel */
.world-canvas::after {
  content: ''; position: absolute; inset: 6px; pointer-events: none; z-index: 1;
  border: 1px solid rgba(100,65,20,.18);
  border-radius: calc(var(--radius-md) - 4px);
  box-shadow: inset 0 0 0 1px rgba(240,210,140,.08);
}

/* Custom map background */
.map-bg {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-size: cover; background-position: center; background-repeat: no-repeat;
}

/* Grid overlay */
.grid-overlay {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background-image:
    linear-gradient(rgba(80,50,10,.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,50,10,.16) 1px, transparent 1px);
}

/* Compass */
.map-compass {
  position: absolute; bottom: .6rem; right: .7rem;
  width: 52px; height: 52px; object-fit: contain;
  z-index: 5; opacity: .75; pointer-events: none;
}

/* Map legend */
.map-legend {
  position: absolute; bottom: .6rem; left: .6rem;
  display: flex; align-items: flex-end; gap: .4rem; z-index: 7;
  flex-wrap: wrap; max-width: 85%;
}
.legend-section {
  display: flex; align-items: center; gap: .25rem;
  background: rgba(10, 6, 2, 0.82);
  border: 1px solid rgba(201,168,76,.25);
  border-radius: var(--radius-md);
  padding: .25rem .35rem;
  backdrop-filter: blur(4px);
  flex-wrap: wrap;
}
.legend-title {
  font-size: .52rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: rgba(201,168,76,.45);
  white-space: nowrap; padding-right: .2rem;
  border-right: 1px solid rgba(201,168,76,.2);
  margin-right: .1rem;
}
.legend-sep { width: 1px; height: 28px; background: rgba(201,168,76,.15); }
.legend-btn {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  background: transparent; border: 1px solid transparent;
  border-radius: var(--radius-sm); color: var(--text-muted);
  cursor: pointer; padding: .18rem .3rem; min-width: 34px;
  transition: all var(--transition);
  font-family: inherit;
}
.legend-btn:hover { background: rgba(201,168,76,.1); border-color: rgba(201,168,76,.35); }
.legend-btn.active {
  background: rgba(201,168,76,.18); border-color: rgba(201,168,76,.6);
  color: rgba(201,168,76,.95);
}
.legend-btn.hidden { opacity: .45; filter: grayscale(.8); }
.legend-btn.hidden:hover { opacity: .7; filter: none; }
.legend-icon { font-size: .9rem; line-height: 1; }
.legend-label { font-size: .52rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: inherit; white-space: nowrap; }
.legend-btn.active .legend-label { color: rgba(201,168,76,.9); }
.grid-sz-btn { min-width: 30px; }
.grid-sz-btn .legend-icon { font-size: .68rem; font-weight: 700; font-family: inherit; }

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

/* Decorations — z-index 6 = above map-layer (4) so clicks reach them */
.deco-wrap {
  position: absolute; transform: translate(-50%, -50%);
  z-index: 6; pointer-events: auto;
  transition: transform .15s ease;
}
.deco-wrap:not(.draggable):hover { transform: translate(-50%, -50%) scale(1.15) translateY(-2px); }
.deco-wrap.draggable { cursor: grab; }
.deco-wrap.draggable:hover { transform: translate(-50%, -50%) scale(1.1) translateY(-2px); }
.deco-wrap.draggable:active { cursor: grabbing; transform: translate(-50%, -50%) scale(1.05); }
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
/* Canvas icons — Kenney (colored): warm drop-shadow; GI (white): invert to dark sepia */
.node-img { object-fit: contain; }
.node-img.kenney { filter: drop-shadow(0 2px 3px rgba(40,20,0,.45)); }
.node-img.gi     { filter: invert(1) sepia(1) saturate(2) hue-rotate(350deg) brightness(0.55) drop-shadow(0 2px 3px rgba(40,20,0,.4)); }
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

/* Quest hint: subtle text under entity label — no conflict with child-badge */
.node-quest-hint {
  font-size: .5rem;
  font-weight: 700;
  color: #f0c040;
  text-shadow: 0 1px 3px rgba(0,0,0,.9);
  letter-spacing: .03em;
  cursor: pointer;
  opacity: .85;
  transition: opacity .15s;
  white-space: nowrap;
}
.node-quest-hint:hover { opacity: 1; }

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
  width: 175px;
  max-height: 80%; overflow-y: auto;
  scrollbar-width: none;
}
.edit-toolbar::-webkit-scrollbar { display: none; }

.toolbar-section-label {
  font-size: .55rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: rgba(201,168,76,.55);
  padding: .05rem 0;
}
.toolbar-grid { display: grid; grid-template-columns: repeat(auto-fill, 30px); gap: .22rem; justify-content: start; }
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

/* Preset map buttons */
.preset-grid { display: flex; flex-direction: column; gap: .22rem; margin-bottom: .3rem; }
.preset-btn {
  display: flex; align-items: center; gap: .4rem;
  width: 100%; padding: .28rem .45rem;
  background: var(--sw, rgba(255,255,255,.04));
  border: 1px solid rgba(255,255,255,.12); border-radius: var(--radius-sm);
  color: rgba(220,200,160,.85); font-family: inherit; font-size: .62rem; font-weight: 600;
  cursor: pointer; transition: all var(--transition); text-align: left;
}
.preset-btn:hover { border-color: rgba(201,168,76,.5); color: rgba(245,225,180,.95); filter: brightness(1.15); }
.preset-btn.active { border-color: var(--gold); box-shadow: 0 0 0 1px rgba(201,168,76,.3); }

.toolbar-bg-input {
  width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.15);
  border-radius: var(--radius-sm); color: rgba(220,200,160,.9);
  font-family: inherit; font-size: .62rem; padding: .25rem .35rem;
  outline: none; transition: border-color var(--transition);
}
.toolbar-bg-input::placeholder { color: rgba(201,168,76,.35); }
.toolbar-bg-input:focus { border-color: rgba(201,168,76,.5); }

.toolbar-clear-btn {
  font-size: .6rem; padding: .18rem .4rem; background: transparent;
  border: 1px solid rgba(220,80,80,.35); border-radius: var(--radius-sm);
  color: rgba(220,100,100,.7); cursor: pointer; font-family: inherit;
  transition: all var(--transition); width: 100%;
}
.toolbar-clear-btn:hover { border-color: rgba(220,80,80,.7); color: rgba(220,100,100,1); background: rgba(220,80,80,.08); }

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
  padding: .65rem; overflow-y: auto; overscroll-behavior: contain;
}
.detail-header { display: flex; align-items: center; justify-content: space-between; }
.detail-icon {
  width: 22px; height: 22px; object-fit: contain;
  filter: brightness(0) invert(0.88) sepia(0.15);
}
.detail-icon.gi { filter: sepia(0.35) hue-rotate(15deg) brightness(1.05) opacity(0.88); }

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
.parent-select.parent-warn-select { border-color: rgba(200,140,30,.5); }
.parent-warn {
  font-size: .6rem; color: rgba(200,140,30,.9); font-weight: 600;
  text-transform: none; letter-spacing: 0; margin-left: .3rem;
}
.parent-current {
  font-size: .65rem; color: var(--gold-dim);
  padding: .15rem .3rem; background: rgba(201,168,76,.06);
  border-radius: var(--radius-sm); border: 1px solid var(--gold-border);
}

/* Icon override picker */
.icon-pick-grid { display: flex; flex-wrap: wrap; gap: .22rem; }
.icon-pick-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 2px;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition);
}
.icon-pick-btn img {
  width: 18px; height: 18px; object-fit: contain;
  filter: brightness(0) invert(0.85) sepia(0.1);
}
.icon-pick-btn.gi img { filter: sepia(0.3) hue-rotate(15deg) brightness(1.0) opacity(0.88); }
.icon-pick-btn.active img { filter: none; }
.icon-pick-btn:hover { border-color: var(--gold-border); }
.icon-pick-btn.active { border-color: var(--gold); background: rgba(201,168,76,.15); }

.icon-pick-sublabel { font-size: .58rem; color: var(--text-muted); font-style: italic; margin-bottom: .1rem; }

.icon-more-details { margin-top: .2rem; }
.icon-more-details[open] .icon-more-summary { color: var(--gold-dim); }
.icon-more-summary {
  list-style: none; cursor: pointer;
  font-size: .58rem; color: var(--text-muted); font-style: italic;
  padding: .1rem 0; user-select: none;
  transition: color var(--transition);
}
.icon-more-summary::-webkit-details-marker { display: none; }
.icon-more-summary:hover { color: var(--gold-dim); }

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

/* ── Seed form ── */
.seed-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  padding: .75rem .85rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  margin-bottom: .4rem;
  border-left: 3px solid var(--gold-dim);
}
.seed-row { display: flex; align-items: center; gap: .6rem; }
.seed-row--col { flex-direction: column; align-items: stretch; gap: .25rem; }
.seed-label { font-size: .68rem; font-weight: 700; color: var(--text-muted); white-space: nowrap; min-width: 70px; }
.seed-hint { font-weight: 400; font-size: .62rem; color: var(--text-muted); opacity: .7; }
.seed-input, .seed-select {
  flex: 1; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit;
  font-size: .8rem; padding: .28rem .5rem; outline: none;
  transition: border-color var(--transition);
}
.seed-input:focus, .seed-select:focus { border-color: var(--gold-dim); }
.seed-textarea {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-primary); font-family: inherit; font-size: .8rem;
  padding: .35rem .5rem; outline: none; resize: vertical; transition: border-color var(--transition);
  line-height: 1.45;
}
.seed-textarea:focus { border-color: var(--gold-dim); }
.seed-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .15rem; }
.seed-cancel {
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-muted); font-family: inherit; font-size: .72rem; padding: .25rem .65rem; cursor: pointer;
  transition: all var(--transition);
}
.seed-cancel:hover { border-color: var(--border-hover); color: var(--text-secondary); }
.seed-save {
  background: var(--gold); border: none; border-radius: var(--radius-sm);
  color: rgba(20,10,0,.9); font-family: inherit; font-size: .72rem; font-weight: 700;
  padding: .25rem .75rem; cursor: pointer; transition: background var(--transition);
}
.seed-save:hover { background: var(--gold-bright, #e8c84a); }
.seed-form-enter-active, .seed-form-leave-active { transition: opacity .2s ease, transform .2s ease; }
.seed-form-enter-from, .seed-form-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Conflicts bar ── */
.conflicts-bar {
  border: 1px solid rgba(220, 170, 50, 0.4);
  border-left: 3px solid rgba(220, 170, 50, 0.8);
  border-radius: var(--radius-md);
  background: rgba(50, 35, 5, 0.5);
  margin-bottom: .4rem;
  overflow: hidden;
}
.conflicts-header {
  display: flex; align-items: center; gap: .5rem;
  padding: .4rem .75rem; cursor: pointer; user-select: none;
  transition: background var(--transition);
}
.conflicts-header:hover { background: rgba(220, 170, 50, 0.06); }
.conflicts-icon { font-size: .85rem; color: rgba(220, 170, 50, .9); flex-shrink: 0; }
.conflicts-title { font-size: .75rem; font-weight: 700; color: rgba(220, 170, 50, .9); white-space: nowrap; }
.conflicts-sub { font-size: .63rem; color: var(--text-muted); flex: 1; }
.conflicts-chevron { font-size: .6rem; color: var(--text-muted); flex-shrink: 0; }
.conflicts-dismiss {
  background: transparent; border: none; color: var(--text-muted); cursor: pointer;
  font-size: .7rem; padding: .1rem .2rem; flex-shrink: 0; transition: color var(--transition);
}
.conflicts-dismiss:hover { color: var(--text-primary); }

.conflicts-body { padding: .3rem .75rem .55rem; display: flex; flex-direction: column; gap: .5rem; }

.conflict-item {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  padding: .4rem .6rem;
  display: flex; flex-direction: column; gap: .3rem;
}
.conflict-entity { display: flex; align-items: center; gap: .5rem; }
.conflict-name { font-size: .8rem; font-weight: 700; color: var(--text-primary); }
.conflict-field {
  font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  background: rgba(220,170,50,.12); color: rgba(220,170,50,.8);
  border: 1px solid rgba(220,170,50,.25); border-radius: 20px; padding: .08rem .4rem;
}
.conflict-values { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; }
.conflict-val { display: flex; flex-direction: column; gap: .1rem; }
.cv-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); }
.conflict-val.old .cv-label { color: rgba(120,200,120,.7); }
.conflict-val.new .cv-label { color: rgba(220,170,50,.7); }
.cv-text { font-size: .72rem; color: var(--text-secondary); line-height: 1.4; }
.conflict-actions { display: flex; gap: .4rem; justify-content: flex-end; margin-top: .1rem; }
.conf-btn {
  font-family: inherit; font-size: .68rem; font-weight: 600;
  border-radius: var(--radius-sm); padding: .2rem .55rem; cursor: pointer;
  transition: all var(--transition);
}
.conf-btn.keep { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
.conf-btn.keep:hover { border-color: rgba(120,200,120,.4); color: rgba(120,200,120,.9); }
.conf-btn.accept { background: rgba(220,170,50,.12); border: 1px solid rgba(220,170,50,.35); color: rgba(220,170,50,.9); }
.conf-btn.accept:hover { background: rgba(220,170,50,.22); border-color: rgba(220,170,50,.6); }

.conflicts-enter-active, .conflicts-leave-active { transition: opacity .25s ease, transform .25s ease; }
.conflicts-enter-from, .conflicts-leave-to { opacity: 0; transform: translateY(-4px); }
.conflicts-body-enter-active, .conflicts-body-leave-active { transition: opacity .2s ease; }
.conflicts-body-enter-from, .conflicts-body-leave-to { opacity: 0; }

/* ── Plane tabs ── */
.plane-tabs {
  margin-bottom: .4rem;
}
.plane-tabs-list {
  display: flex; align-items: flex-end; gap: .2rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.plane-tabs-list::-webkit-scrollbar { display: none; }

.plane-tab {
  display: flex; align-items: center; gap: .3rem;
  padding: .3rem .65rem .35rem;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  font-size: .78rem;
  white-space: nowrap;
  transition: all var(--transition);
  position: relative;
  bottom: -1px;
  user-select: none;
}
.plane-tab:hover { background: rgba(201,168,76,.06); color: var(--text-secondary); }
.plane-tab.active {
  background: var(--bg-card);
  border-color: var(--border);
  border-bottom-color: var(--bg-card);
  color: var(--gold);
  font-weight: 600;
}
.plane-icon { font-size: .85rem; line-height: 1; }
.plane-name { font-size: .78rem; }
.plane-del {
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; font-size: .7rem; padding: 0 .1rem;
  line-height: 1; opacity: 0; transition: opacity var(--transition), color var(--transition);
}
.plane-tab:hover .plane-del { opacity: 1; }
.plane-del:hover { color: var(--red-light); }
.plane-rename-input {
  background: var(--bg-input); border: 1px solid var(--gold-dim);
  border-radius: var(--radius-sm); color: var(--text-primary);
  font-family: inherit; font-size: .78rem; padding: .05rem .3rem;
  width: 120px; outline: none;
}
.plane-add {
  background: transparent; border: 1px solid var(--border);
  border-bottom: none; border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  color: var(--text-muted); cursor: pointer; font-size: .9rem;
  padding: .2rem .5rem .3rem; transition: all var(--transition);
  position: relative; bottom: -1px;
}
.plane-add:hover { background: rgba(201,168,76,.1); color: var(--gold); border-color: var(--gold-border); }

/* ── Quest Log (WoW-style) ── */
.quest-log { padding-top: .2rem; }
.quest-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 2rem 1rem; gap: .4rem; text-align: center;
}
.quest-empty-icon { font-size: 2rem; opacity: .5; }
.quest-empty p { font-size: .73rem; color: var(--text-muted); margin: 0; }
.quest-empty-hint { font-size: .65rem; color: var(--text-muted); opacity: .7; }

.quest-item {
  padding: .5rem .65rem .45rem;
  border-bottom: 1px solid rgba(201,168,76,.08);
  cursor: pointer;
  transition: background var(--transition);
  display: flex; flex-direction: column; gap: .2rem;
}
.quest-item:hover { background: rgba(201,168,76,.06); }
.quest-item.active { background: rgba(201,168,76,.1); border-left: 2px solid var(--gold); }
.quest-item.done { opacity: .5; }
.quest-item.done .quest-excl { background: #888; color: #ccc; }

.quest-item-header {
  display: flex; align-items: flex-start; gap: .4rem;
}
.quest-excl {
  flex-shrink: 0;
  width: 16px; height: 16px; border-radius: 50%;
  background: linear-gradient(135deg, #f5d020, #f5a623);
  color: rgba(40,20,0,.9);
  font-size: .62rem; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.4), 0 0 6px rgba(245,190,30,.3);
  margin-top: 1px;
}
.quest-name {
  font-size: .75rem; font-weight: 700; color: var(--gold-light);
  line-height: 1.3; flex: 1;
}
.quest-item.done .quest-name { color: var(--text-muted); text-decoration: line-through; }

.quest-location {
  display: flex; align-items: center; gap: .25rem;
  font-size: .63rem; color: var(--text-muted); padding-left: 1.4rem;
}
.quest-pin { font-size: .7rem; }

.quest-desc {
  font-size: .65rem; color: var(--text-secondary); line-height: 1.4;
  padding-left: 1.4rem;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}

.quest-flags {
  display: flex; gap: .25rem; padding-left: 1.4rem; flex-wrap: wrap;
}
.quest-flag-pill {
  font-size: .55rem; font-weight: 700; text-transform: uppercase;
  border: 1px solid; border-radius: 20px; padding: .05rem .3rem;
  letter-spacing: .05em;
}

/* ── Extraction log ── */
.extraction-log {
  background: rgba(40,28,4,.55);
  border: 1px solid rgba(220,165,30,.35);
  border-left: 3px solid rgba(220,165,30,.75);
  border-radius: var(--radius-md);
  margin-bottom: .5rem;
  overflow: hidden;
}
.elog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .35rem .7rem; border-bottom: 1px solid rgba(220,165,30,.15);
}
.elog-title { font-size: .72rem; font-weight: 700; color: rgba(220,175,40,.92); }
.elog-close {
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; font-size: .72rem; padding: .1rem .2rem;
  transition: color var(--transition);
}
.elog-close:hover { color: var(--text-primary); }
.elog-body { padding: .25rem .4rem; display: flex; flex-direction: column; gap: .08rem; max-height: 180px; overflow-y: auto; overscroll-behavior: contain; }
.elog-row {
  display: flex; align-items: center; gap: .35rem;
  padding: .12rem .3rem; border-radius: var(--radius-sm);
  font-size: .67rem;
}
.elog-row.elog-warn { background: rgba(220,140,20,.10); }
.elog-kind { font-size: .75rem; flex-shrink: 0; line-height: 1; }
.elog-name { font-weight: 600; color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.elog-parent { color: var(--text-muted); font-size: .62rem; flex-shrink: 0; }
.elog-plane { color: rgba(160,130,220,.75); font-size: .6rem; flex-shrink: 0; }
.elog-warning-txt { color: rgba(220,160,30,.9); flex-shrink: 0; font-size: .7rem; cursor: help; margin-left: auto; }
.elog-footer {
  font-size: .62rem; color: var(--text-muted); padding: .25rem .7rem;
  border-top: 1px solid rgba(220,165,30,.12); font-style: italic;
}
</style>
