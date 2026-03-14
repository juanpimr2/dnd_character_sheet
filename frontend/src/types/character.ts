// ─── Tipos que espeja exactamente el state de character.js ───────────────────

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface SaveThrow {
  base: number
  stat: string   // any ability key — e.g. 'con', 'dex', 'wis', or 'cha' with Steadfast Determination
  total: number
  quick?: BonusEntry[]  // temporary in-session bonuses (Heroism, Aid, etc.)
}

export interface BonusEntry {
  n: string       // nombre/fuente
  v: number       // valor
  t: string       // tipo (armor, dodge, etc.)
  activable?: boolean
  active?: boolean
  applies?: string // para saveGeneral: 'All' | 'fort' | 'ref' | 'will'
}

export interface AbilityBreakdowns {
  str: BonusEntry[]
  dex: BonusEntry[]
  con: BonusEntry[]
  int: BonusEntry[]
  wis: BonusEntry[]
  cha: BonusEntry[]
}

export type AttackRole = 'primary' | 'offhand_light' | 'offhand' | 'extra' | 'manual'

export interface AttackEntry {
  weapon: string
  bonus: string       // manual bonus text (used when role = 'manual' or undefined)
  damage: string
  crit: string        // legacy free-text crit (e.g. "19-20/×2") — used as fallback
  critRange?: number  // lowest threat number: 20 = only 20, 19 = 19-20, 18 = 18-20
  critMult?: number   // critical multiplier: 2, 3, 4, 5
  type: string        // damage type: C / P / S / B
  notes: string
  range?: 'melee' | 'ranged'   // attack type (absent = legacy, treat as melee)
  rangeInc?: string            // range increment text, ranged only (e.g. "110 ft")
  // Auto-calc fields (optional — absent = legacy manual entry)
  role?: AttackRole
  stat?: 'str' | 'dex'  // attack stat
  enhancement?: number   // weapon enhancement bonus
}

export interface SkillEntry {
  n: string       // nombre
  s: string       // stat key
  r: number       // ranks
  m: number       // misc modifier
  cs: boolean     // class skill
}

export interface InventoryItem {
  n: string
  q: number       // quantity
  c?: number      // charges
  cl?: number     // caster level
  dc?: number
  note?: string
}

export interface AbilityEntry {
  n: string
  d: string
}

export type SpellSchool = 'Abjur' | 'Conj' | 'Div' | 'Ench' | 'Evoc' | 'Illus' | 'Necro' | 'Trans' | 'Univ' | ''

export interface SpellEntry {
  id: number
  name: string
  level: number       // 0–9
  school: SpellSchool
  prepared: number    // slots prepared today (prepared casters) — irrelevant for spontaneous
  notes: string
}

export interface SpellcastingBlock {
  spellClass: string                        // 'Wizard', 'Cleric', 'Sorcerer'…
  type: 'prepared' | 'spontaneous'
  stat: 'int' | 'wis' | 'cha'
  casterLevel: number
  concentrationBonus: number                // manual misc bonus to concentration
  slotsPerDay: number[]                     // [lvl0..lvl9] base slots from class table
  slotsUsed: number[]                       // [lvl0..lvl9] used today (resets on rest)
  spells: SpellEntry[]
}

export interface EventEntry {
  t: string       // timestamp
  txt: string
  id: number
}

export interface SessionGroup {
  id: number
  name: string       // "Sesión 1", "La Cueva del Dragón", etc.
  date: string       // "2026-03-02"
  entries: EventEntry[]
  finalized?: boolean
}

/** Resumen para tarjetas en la pantalla de selección de personaje */
export interface CharacterSummary {
  id: string
  name: string
  race: string
  classes: string
  level: number
  portrait?: string | null
}

// ─── World Lore ───────────────────────────────────────────────────────────────

export type EntityKind = 'city' | 'location' | 'npc' | 'faction'

export interface LoreFlag {
  type: 'visit' | 'danger' | 'ally' | 'enemy' | 'quest' | 'note'
  note?: string
}

export interface WorldEntity {
  id: number
  name: string
  kind: EntityKind
  description: string
  parent?: string        // name of parent entity (supports multi-level hierarchy)
  sessions: number[]     // session IDs that mention this entity
  x: number              // canvas position (%) — used only in world/parent view
  y: number
  flags: LoreFlag[]
  iconOverride?: string  // user-selected icon path (overrides auto-detection)
}

export interface MapDecoration {
  id: number
  icon: string           // '/map-icons/...'
  x: number             // % on canvas
  y: number
  size?: number          // px, default 36
  scope: string | null   // null = world view, entity name = shown in that entity's drill-down
}

export interface WorldLore {
  entities: WorldEntity[]
  decorations?: MapDecoration[]
  lastAnalysis?: string  // ISO timestamp of last AI analysis
  lastManualAnalysis?: string  // ISO timestamp of last manual-triggered analysis
  mapBg?: string         // URL of custom map background image
}

export type GameFormat = 'pf1e' | 'dnd35' | 'dnd5e'

/** Estado completo del personaje (mapeado desde el JSON del backend) */
export interface Character {
  // Identidad
  name: string
  race: string
  classes: string
  level: number
  xp?: number
  alignment: string
  format?: GameFormat   // ruleset: 'pf1e' | 'dnd35' | 'dnd5e' (default pf1e)
  deity: string
  height: string
  portrait: string | null

  // Stats base
  stats: AbilityScores
  abilityBreakdowns?: AbilityBreakdowns

  // HP
  maxHP: number
  damage: number
  nonLethal: number
  tempHP: number

  // Defensa
  ac: number
  acStat: string
  dr: string
  sr: number

  // Combate
  bab: number
  speed: number
  init: { bonus: number; stat: string }
  twfFeat?: 'none' | 'twf' | 'itwf' | 'gtwf'  // Two-Weapon Fighting progression
  cmbMisc?: number   // misc bonus to CMB (feats, size mods, etc.)
  cmdMisc?: number   // misc bonus to CMD

  // Tiradas de salvación
  saves: {
    fort: SaveThrow
    ref: SaveThrow
    will: SaveThrow
  }

  // Bonus breakdowns
  bonuses: {
    ac: BonusEntry[]
    acQuick?: BonusEntry[]      // temp in-session AC bonuses (same pattern as saves.quick)
    fort: BonusEntry[]
    ref: BonusEntry[]
    will: BonusEntry[]
    attack: BonusEntry[]
    saveGeneral?: BonusEntry[]  // legacy — no longer used in UI
  }

  // Contenido
  attacks: AttackEntry[]
  equipment: Record<string, string>
  skills: SkillEntry[]
  languages: string[]
  inventory: InventoryItem[]
  abilities: AbilityEntry[]
  feats: string[]
  events: EventEntry[]
  sessions: SessionGroup[]
  customBreakdowns: Array<{ name: string; bonuses: BonusEntry[] }>
  spellcasting?: SpellcastingBlock | SpellcastingBlock[]  // array desde v2; objeto legacy migrado en PanelSpells
  worldLore?: WorldLore
}
