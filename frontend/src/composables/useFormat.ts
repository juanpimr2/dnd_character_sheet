import { computed } from 'vue'
import type { GameFormat } from '@/types/character'

export interface FormatRules {
  label: string
  shortLabel: string
  // Combat
  hasCMB: boolean          // CMB/CMD system (PF1e/3.5 only)
  hasIterativeAttacks: boolean  // BAB +6/+11/+16 iterative attacks
  hasProficiencyBonus: boolean  // 5e proficiency bonus
  hasAdvantage: boolean    // 5e advantage/disadvantage
  // Saves
  savesStyle: 'three' | 'six'  // Fort/Ref/Will vs 6 ability saves
  // Skills
  skillsStyle: 'pf1e' | 'dnd35' | 'dnd5e'
  // Spells
  hasSpellSlots: boolean   // all three have slots, but 5e spell attack is different
}

const RULESETS: Record<GameFormat, FormatRules> = {
  pf1e: {
    label: 'Pathfinder 1e',
    shortLabel: 'PF1e',
    hasCMB: true,
    hasIterativeAttacks: true,
    hasProficiencyBonus: false,
    hasAdvantage: false,
    savesStyle: 'three',
    skillsStyle: 'pf1e',
    hasSpellSlots: true,
  },
  dnd35: {
    label: 'D&D 3.5e',
    shortLabel: '3.5e',
    hasCMB: false,           // 3.5 uses Grapple/Trip rules instead of CMB/CMD
    hasIterativeAttacks: true,
    hasProficiencyBonus: false,
    hasAdvantage: false,
    savesStyle: 'three',
    skillsStyle: 'dnd35',
    hasSpellSlots: true,
  },
  dnd5e: {
    label: 'D&D 5e',
    shortLabel: '5e',
    hasCMB: false,
    hasIterativeAttacks: false,
    hasProficiencyBonus: true,
    hasAdvantage: true,
    savesStyle: 'six',
    skillsStyle: 'dnd5e',
    hasSpellSlots: true,
  },
}

export const FORMAT_LIST: { id: GameFormat; label: string; shortLabel: string; desc: string }[] = [
  { id: 'pf1e',  label: 'Pathfinder 1e', shortLabel: 'PF1e', desc: 'CMB/CMD, consolidated skills, ~40 skills' },
  { id: 'dnd35', label: 'D&D 3.5e',      shortLabel: '3.5e', desc: 'Classic edition, Grapple/Trip rules, cross-class skills' },
  { id: 'dnd5e', label: 'D&D 5e',        shortLabel: '5e',   desc: 'Advantage/disadvantage, proficiency bonus, 6 ability saves' },
]

export function useFormat(format: () => GameFormat | undefined) {
  const rules = computed<FormatRules>(() => RULESETS[format() ?? 'pf1e'])
  return { rules }
}
