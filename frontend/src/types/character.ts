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
  crit: string
  type: string        // damage type: C / P / S / B
  notes: string
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

/** Estado completo del personaje (mapeado desde el JSON del backend) */
export interface Character {
  // Identidad
  name: string
  race: string
  classes: string
  level: number
  xp?: number
  alignment: string
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
}
