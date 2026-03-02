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
  stat: string   // 'con' | 'dex' | 'wis'
  total: number
}

export interface BonusEntry {
  n: string       // nombre/fuente
  v: number       // valor
  t: string       // tipo (armor, dodge, etc.)
  activable?: boolean
  active?: boolean
  applies?: string // para saveGeneral: 'All' | 'fort' | 'ref' | 'will'
}

export interface AttackEntry {
  weapon: string
  bonus: string
  damage: string
  crit: string
  type: string
  notes: string
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
  alignment: string
  deity: string
  height: string
  portrait: string | null

  // Stats base
  stats: AbilityScores

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

  // Tiradas de salvación
  saves: {
    fort: SaveThrow
    ref: SaveThrow
    will: SaveThrow
  }

  // Bonus breakdowns
  bonuses: {
    ac: BonusEntry[]
    fort: BonusEntry[]
    ref: BonusEntry[]
    will: BonusEntry[]
    attack: BonusEntry[]
    saveGeneral: BonusEntry[]
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
}
