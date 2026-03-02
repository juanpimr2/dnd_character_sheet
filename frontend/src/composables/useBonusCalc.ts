import type { BonusEntry } from '@/types/character'

interface BonusTypeInfo {
  stacks: boolean
  appliesToTouch?: boolean
  appliesToFlat?: boolean
  category: 'ac' | 'save' | 'attack' | 'all'
}

const BONUS_TYPES: Record<string, BonusTypeInfo> = {
  // AC
  armor:       { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  shield:      { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  deflection:  { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  dodge:       { stacks: true,  appliesToTouch: true,  appliesToFlat: false, category: 'ac' },
  natural:     { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  enhancement: { stacks: false, appliesToTouch: false, appliesToFlat: true,  category: 'ac' },
  insight:     { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  luck:        { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  sacred:      { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  profane:     { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  size:        { stacks: false, appliesToTouch: true,  appliesToFlat: true,  category: 'ac' },
  // Saves
  alchemical:  { stacks: false, category: 'save' },
  morale:      { stacks: false, category: 'save' },
  resistance:  { stacks: false, category: 'save' },
  // Attack
  trait:       { stacks: false, category: 'attack' },
  // Universal
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

/** Nombre legible del tipo (para UI) */
export function bonusTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    armor: 'Armadura', shield: 'Escudo', deflection: 'Deflexión',
    dodge: 'Esquiva', natural: 'Natural', enhancement: 'Mejora',
    insight: 'Percepción', luck: 'Suerte', sacred: 'Sagrado',
    profane: 'Profano', size: 'Tamaño', alchemical: 'Alquímico',
    morale: 'Moral', resistance: 'Resistencia', trait: 'Rasgo',
    untyped: 'Sin tipo',
  }
  return labels[t] ?? t
}
