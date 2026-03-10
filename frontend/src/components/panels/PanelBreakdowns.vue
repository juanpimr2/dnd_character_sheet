<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import BonusBreakdown from '@/components/BonusBreakdown.vue'
import {
  calculateApplicableBonuses,
  ABILITY_BONUS_TYPES,
  AC_BONUS_TYPES,
  SAVE_BONUS_TYPES,
  ATTACK_BONUS_TYPES,
} from '@/composables/useBonusCalc'
import type { AbilityScores, BonusEntry } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)
function save() { charStore.scheduleAutoSave() }

type SubTab = 'stats' | 'combat' | 'saves' | 'custom'
const activeSubTab = ref<SubTab>('stats')
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'stats',  label: 'Ability Scores' },
  { id: 'combat', label: 'Combat' },
  { id: 'saves',  label: 'Saves' },
  { id: 'custom', label: 'Custom' },
]

const ABILITIES: { key: keyof AbilityScores; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'dex', label: 'Dexterity',    abbr: 'DEX' },
  { key: 'con', label: 'Constitution', abbr: 'CON' },
  { key: 'int', label: 'Intelligence', abbr: 'INT' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'cha', label: 'Charisma',     abbr: 'CHA' },
]

const openStats = ref<Set<keyof AbilityScores>>(new Set())
function toggleStat(key: keyof AbilityScores) {
  const s = new Set(openStats.value)
  s.has(key) ? s.delete(key) : s.add(key)
  openStats.value = s
}

function getBreakdown(key: keyof AbilityScores): BonusEntry[] {
  if (!char.value.abilityBreakdowns) {
    char.value.abilityBreakdowns = { str: [], dex: [], con: [], int: [], wis: [], cha: [] }
  }
  const list = char.value.abilityBreakdowns[key]
  // Auto-migrate: if empty and stat has a value, seed with current stat as Base
  if (list.length === 0 && char.value.stats[key] > 0) {
    list.push({ n: 'Base', v: char.value.stats[key], t: 'untyped' })
  }
  return list
}

function calcStat(key: keyof AbilityScores): number {
  const bd = char.value.abilityBreakdowns?.[key]
  if (!bd || bd.length === 0) return char.value.stats[key]
  return calculateApplicableBonuses(bd)
}

function onStatChange(key: keyof AbilityScores) {
  char.value.stats[key] = calcStat(key)
  save()
}

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

// Custom breakdowns
const newCustomName = ref('')
function addCustomBreakdown() {
  const name = newCustomName.value.trim()
  if (!name) return
  if (!char.value.customBreakdowns) char.value.customBreakdowns = []
  char.value.customBreakdowns.push({ name, bonuses: [] })
  newCustomName.value = ''
  save()
}
function removeCustomBreakdown(i: number) {
  if (!confirm(`Delete breakdown "${char.value.customBreakdowns[i].name}"?`)) return
  char.value.customBreakdowns.splice(i, 1)
  save()
}

const ALL_BONUS_TYPES = [...new Set([...ABILITY_BONUS_TYPES, ...AC_BONUS_TYPES, ...SAVE_BONUS_TYPES, ...ATTACK_BONUS_TYPES])]
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      Breakdowns
    </h2>

    <!-- Sub-tabs -->
    <div class="sub-tabs" role="tablist">
      <button
        v-for="t in SUB_TABS" :key="t.id"
        role="tab"
        :aria-selected="activeSubTab === t.id"
        class="sub-tab-btn"
        :class="{ active: activeSubTab === t.id }"
        @click="activeSubTab = t.id"
      >{{ t.label }}</button>
    </div>

    <!-- ══ ABILITY SCORES ══ -->
    <div v-if="activeSubTab === 'stats'" class="sub-content">
      <p class="hint">
        The total is calculated automatically by summing all active bonuses.
        Bonuses of the same type do not stack — only the highest applies.
      </p>
      <div class="stat-accordion">
        <div v-for="ab in ABILITIES" :key="ab.key" class="stat-block">
          <button class="stat-row" @click="toggleStat(ab.key)" :aria-expanded="openStats.has(ab.key)">
            <span class="sr-abbr">{{ ab.abbr }}</span>
            <span class="sr-name">{{ ab.label }}</span>
            <span class="sr-spacer"></span>
            <span class="sr-total">{{ calcStat(ab.key) }}</span>
            <span class="sr-mod">{{ fmt(mod(calcStat(ab.key))) }}</span>
            <span class="sr-chevron" :class="{ open: openStats.has(ab.key) }">▾</span>
          </button>
          <div v-show="openStats.has(ab.key)" class="stat-body">
            <BonusBreakdown
              :bonuses="getBreakdown(ab.key)"
              :bonusTypes="ABILITY_BONUS_TYPES"
              @change="onStatChange(ab.key)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ══ COMBAT ══ -->
    <div v-if="activeSubTab === 'combat'" class="sub-content">
      <h3 class="sub-title">Armor Class</h3>
      <BonusBreakdown :bonuses="char.bonuses.ac" :bonusTypes="AC_BONUS_TYPES" @change="save" />
      <h3 class="sub-title">Attacks</h3>
      <BonusBreakdown :bonuses="char.bonuses.attack" :bonusTypes="ATTACK_BONUS_TYPES" @change="save" />
    </div>

    <!-- ══ SAVES ══ -->
    <div v-if="activeSubTab === 'saves'" class="sub-content">
      <h3 class="sub-title">Fortitude</h3>
      <BonusBreakdown :bonuses="char.bonuses.fort" :bonusTypes="SAVE_BONUS_TYPES" @change="save" />
      <h3 class="sub-title">Reflex</h3>
      <BonusBreakdown :bonuses="char.bonuses.ref" :bonusTypes="SAVE_BONUS_TYPES" @change="save" />
      <h3 class="sub-title">Will</h3>
      <BonusBreakdown :bonuses="char.bonuses.will" :bonusTypes="SAVE_BONUS_TYPES" @change="save" />
      <h3 class="sub-title">General <span class="sub-title-note">(applies to selected saves)</span></h3>
      <BonusBreakdown :bonuses="char.bonuses.saveGeneral" :bonusTypes="SAVE_BONUS_TYPES" :showApplies="true" @change="save" />
    </div>

    <!-- ══ CUSTOM ══ -->
    <div v-if="activeSubTab === 'custom'" class="sub-content">
      <p class="hint">
        Create breakdowns for any special value: Caster Level, Charge Damage, Smite Evil, Charisma-to-attack…
      </p>

      <div v-if="char.customBreakdowns?.length" class="custom-list">
        <div v-for="(bd, i) in char.customBreakdowns" :key="i" class="custom-block">
          <div class="custom-header">
            <span class="custom-name">{{ bd.name }}</span>
            <span class="custom-total">Total: <strong>{{ calculateApplicableBonuses(bd.bonuses) }}</strong></span>
            <button class="btn-del" @click="removeCustomBreakdown(i)" title="Delete breakdown">✕</button>
          </div>
          <BonusBreakdown :bonuses="bd.bonuses" :bonusTypes="ALL_BONUS_TYPES" @change="save" />
        </div>
      </div>
      <p v-else class="empty-hint">No custom breakdowns yet.</p>

      <div class="add-custom">
        <input
          type="text"
          v-model="newCustomName"
          placeholder="Breakdown name (e.g.: Caster Level)"
          class="custom-input"
          @keydown.enter="addCustomBreakdown"
        />
        <button class="btn-outline" @click="addCustomBreakdown">+ Create</button>
      </div>
    </div>

  </section>
</template>

<style scoped>
/* ── Sub-tabs ── */
.sub-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.sub-tab-btn {
  flex: 1;
  min-width: 90px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.38rem 0.5rem;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.sub-tab-btn.active {
  background: linear-gradient(135deg, rgba(136,85,208,0.20), rgba(201,168,76,0.12));
  color: var(--gold-light);
  border: 1px solid var(--gold-border);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

/* ── Sub-content ── */
.sub-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
  background: rgba(136,85,208,0.07);
  border: 1px solid var(--arcane-border);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
}

.sub-title {
  font-family: var(--font-title);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gold);
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
  margin-top: 0.5rem;
}
.sub-title:first-child { margin-top: 0; }
.sub-title-note {
  font-family: var(--font-body);
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

/* ── Acordeón de características ── */
.stat-accordion {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  color: var(--text-primary);
  font-family: inherit;
  transition: background var(--transition);
  text-align: left;
}
.stat-row:hover { background: rgba(201,168,76,0.05); }

.sr-abbr {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  width: 32px;
  flex-shrink: 0;
}
.sr-name {
  font-size: 0.82rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.sr-spacer { flex: 1; }
.sr-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  width: 32px;
  text-align: right;
}
.sr-mod {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--gold);
  width: 36px;
  text-align: right;
}
.sr-chevron {
  font-size: 0.75rem;
  color: var(--text-muted);
  transition: transform var(--transition);
  margin-left: 0.25rem;
}
.sr-chevron.open { transform: rotate(180deg); }

.stat-body {
  padding: 0.6rem 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

/* ── Personalizado ── */
.custom-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.custom-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.custom-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: rgba(136,85,208,0.06);
}
.custom-name {
  font-family: var(--font-title);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--gold-light);
  flex: 1;
  letter-spacing: 0.04em;
}
.custom-total {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.custom-total strong {
  color: var(--text-primary);
  font-size: 0.9rem;
}
.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}
.btn-del:hover { color: var(--red-light); }
.custom-block > :deep(.bb) { padding: 0.6rem 0.75rem; }

.empty-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1.5rem;
}

.add-custom {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
}
.custom-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  transition: border-color var(--transition);
}
.custom-input:focus { border-color: var(--arcane); }
.custom-input::placeholder { color: var(--text-muted); opacity: 0.55; }
</style>
