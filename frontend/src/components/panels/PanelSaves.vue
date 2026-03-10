<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { AbilityScores } from '@/types/character'
import {
  calculateApplicableBonuses,
  SAVE_BONUS_TYPES,
} from '@/composables/useBonusCalc'
import BonusBreakdown from '@/components/BonusBreakdown.vue'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const STATS = ['str','dex','con','int','wis','cha'] as const

const SAVES = [
  { key: 'fort' as const, label: 'Fortitude', color: '#e8d183' },
  { key: 'ref'  as const, label: 'Reflex',    color: '#6ec6a0' },
  { key: 'will' as const, label: 'Will',      color: '#a08ec8' },
]

function saveTotal(key: 'fort' | 'ref' | 'will') {
  const sv = char.value.saves?.[key]
  if (!sv) return 0
  const stat = (sv.stat ?? 'con') as keyof AbilityScores
  const statMod = mod(char.value.stats?.[stat] ?? 10)

  // Bonuses específicos de esta salvación
  const specificBonuses = char.value.bonuses?.[key] ?? []
  const specificTotal = calculateApplicableBonuses(specificBonuses)

  // Bonuses generales que aplican a esta salvación
  const generalBonuses = (char.value.bonuses?.saveGeneral ?? []).filter(b => {
    if (b.activable && !b.active) return false
    if (!b.applies || b.applies === 'All') return true
    return b.applies.toLowerCase().includes(key)
  })
  const generalTotal = calculateApplicableBonuses(generalBonuses)

  return (sv.base ?? 0) + statMod + specificTotal + generalTotal
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Saving Throws</h2>

    <div class="saves-grid">
      <div v-for="sv in SAVES" :key="sv.key" class="save-block">
        <div class="save-label" :style="{ color: sv.color }">{{ sv.label }}</div>

        <div class="save-total">{{ fmt(saveTotal(sv.key)) }}</div>

        <div class="save-fields">
          <div class="sf">
            <label>Base</label>
            <input type="number" v-model.number="char.saves[sv.key].base" @change="save" />
          </div>
          <div class="sf">
            <label>Stat</label>
            <select v-model="char.saves[sv.key].stat" @change="save">
              <option v-for="s in STATS" :key="s" :value="s">{{ s.toUpperCase() }}</option>
            </select>
          </div>
        </div>

        <div class="save-hint">
          base {{ char.saves[sv.key].base ?? 0 }}
          + {{ char.saves[sv.key].stat?.toUpperCase() }} {{ fmt(mod(char.stats[(char.saves[sv.key].stat ?? 'con') as keyof AbilityScores] ?? 10)) }}
          = {{ fmt(saveTotal(sv.key)) }}
        </div>

        <!-- Desglose de bonificadores específicos -->
        <details class="breakdown-wrap">
          <summary class="breakdown-toggle">Bonuses</summary>
          <BonusBreakdown
            :bonuses="char.bonuses[sv.key]"
            :bonus-types="SAVE_BONUS_TYPES"
            @change="save"
          />
        </details>
      </div>
    </div>

    <!-- Bonuses generales de salvación -->
    <details class="general-saves-wrap">
      <summary class="breakdown-toggle general-toggle">General Saving Throw Bonuses</summary>
      <div class="general-saves-body">
        <p class="general-hint">Apply to one or more saves according to the "Applies to" column.</p>
        <BonusBreakdown
          :bonuses="char.bonuses.saveGeneral"
          :bonus-types="SAVE_BONUS_TYPES"
          :show-applies="true"
          @change="save"
        />
      </div>
    </details>

  </section>
</template>

<style scoped>
.saves-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.save-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.save-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.save-total {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  line-height: 1;
}

.save-fields {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sf {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sf label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  white-space: nowrap;
  width: 55px;
  flex-shrink: 0;
}
.sf input,
.sf select {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.25rem 0.4rem;
  outline: none;
  width: 0;
}
.sf input:focus,
.sf select:focus { border-color: var(--gold-dim); }

.save-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-align: center;
  padding-top: 0.2rem;
  border-top: 1px solid var(--border);
}

/* ── Breakdowns colapsables ── */
.breakdown-wrap {
  border-top: 1px dashed var(--border);
  padding-top: 0.3rem;
}

.breakdown-toggle {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--gold-dim);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  list-style: none;
  outline: none;
  user-select: none;
}
.breakdown-toggle::-webkit-details-marker { display: none; }
.breakdown-toggle::before { content: '▶ '; font-size: 0.55rem; }
details[open] .breakdown-toggle::before { content: '▼ '; }

/* ── General saves ── */
.general-saves-wrap {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}

.general-toggle {
  font-size: 0.7rem;
}

.general-saves-body {
  margin-top: 0.5rem;
}

.general-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

@media (max-width: 500px) {
  .saves-grid { grid-template-columns: 1fr; }
}
</style>
