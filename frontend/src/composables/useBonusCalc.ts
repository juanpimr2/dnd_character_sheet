import type { BonusEntry } from '@/types/character'

interface BonusTypeInfo {
  stacks: boolean
  appliesToTouch?: boolean
  appliesToFlat?: boolean
  category: 'ac' | 'save' | 'attack' | 'all'
}

const BONUS_TYPES: Record<string, BonusTypeInfo> = {
  // ── Pure AC (armor slot, physical defense) ───────────────────────────────
  armor:       { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  shield:      { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  deflection:  { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  dodge:       { stacks: true,  appliesToTouch: true,  appliesToFlat: false, category: 'ac' },
  natural:     { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  // ── Save-specific ─────────────────────────────────────────────────────────
  resistance:  { stacks: false, category: 'save' },   // Cloak of Resistance, etc.
  // ── Universal (AC + saves + attacks + skills) ─────────────────────────────
  enhancement: { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'all' },
  insight:     { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'all' },
  luck:        { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'all' },
  sacred:      { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'all' },
  profane:     { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'all' },
  morale:      { stacks: false, category: 'all' },    // Heroism, Prayer, etc.
  alchemical:  { stacks: false, category: 'all' },    // Alchemist's fire, antitoxin
  size:        { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'all' },
  circumstance: { stacks: true,  category: 'all' },   // stacks from different sources
  competence:   { stacks: false, category: 'all' },
  racial:       { stacks: false, category: 'all' },
  inherent:     { stacks: false, category: 'all' },
  trait:        { stacks: false, category: 'all' },   // Pathfinder character traits
  // Untyped always stacks
  untyped:     { stacks: true,  appliesToTouch: false, appliesToFlat: true,  category: 'all' },
}

/** Aplica reglas de stacking D&D 3.5 — no-stacking usa solo el mayor del tipo */
export function calculateApplicableBonuses(bonusList: BonusEntry[]): number {
  const active = bonusList.filter(b => !b.activable || b.active)

  const byType: Record<string, number[]> = {}
  for (const b of active) {
    const t = b.t || 'untyped'
    if (!byType[t]) byType[t] = []
    byType[t].push(b.v)
  }

  let total = 0
  for (const [type, values] of Object.entries(byType)) {
    const info = BONUS_TYPES[type] ?? BONUS_TYPES.untyped
    total += info.stacks
      ? values.reduce((a, v) => a + v, 0)
      : Math.max(...values)
  }
  return total
}

export function filterToTouch(bonusList: BonusEntry[]): BonusEntry[] {
  return bonusList.filter(b => {
    if (b.activable && !b.active) return false
    const info = BONUS_TYPES[b.t] ?? BONUS_TYPES.untyped
    return info.appliesToTouch === true
  })
}

export function filterToFlat(bonusList: BonusEntry[]): BonusEntry[] {
  return bonusList.filter(b => {
    if (b.activable && !b.active) return false
    const info = BONUS_TYPES[b.t] ?? BONUS_TYPES.untyped
    return info.appliesToFlat === true
  })
}

export const AC_BONUS_TYPES = Object.entries(BONUS_TYPES)
  .filter(([, v]) => v.category === 'ac' || v.category === 'all')
  .map(([k]) => k)

export const SAVE_BONUS_TYPES = Object.entries(BONUS_TYPES)
  .filter(([, v]) => v.category === 'save' || v.category === 'all')
  .map(([k]) => k)

export const ATTACK_BONUS_TYPES = Object.entries(BONUS_TYPES)
  .filter(([, v]) => v.category === 'attack' || v.category === 'all')
  .map(([k]) => k)

export const ABILITY_BONUS_TYPES = [
  'untyped', 'enhancement', 'inherent', 'morale', 'alchemical', 'sacred', 'profane', 'size',
]

/** Human-readable label for bonus type (for UI) */
export function bonusTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    armor: 'Armor', shield: 'Shield', deflection: 'Deflection',
    dodge: 'Dodge', natural: 'Natural', enhancement: 'Enhancement',
    insight: 'Insight', luck: 'Luck', sacred: 'Sacred',
    profane: 'Profane', size: 'Size', alchemical: 'Alchemical',
    morale: 'Morale', resistance: 'Resistance', inherent: 'Inherent', trait: 'Trait',
    circumstance: 'Circumstance', competence: 'Competence', racial: 'Racial',
    untyped: 'Untyped',
  }
  return labels[t] ?? t
}
