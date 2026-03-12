<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { AbilityScores, BonusEntry } from '@/types/character'
import {
  calculateApplicableBonuses,
  SAVE_BONUS_TYPES,
  bonusTypeLabel,
} from '@/composables/useBonusCalc'
import { HelpCircle } from 'lucide-vue-next'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

const emit = defineEmits<{ goToBreakdowns: [] }>()

function save() { charStore.scheduleAutoSave() }

// Tooltip del icono de ayuda
const tooltipOpen = ref(false)
function toggleTooltip(e: MouseEvent) { e.stopPropagation(); tooltipOpen.value = !tooltipOpen.value }
function closeTooltip() { tooltipOpen.value = false }
onMounted(() => document.addEventListener('click', closeTooltip))
onUnmounted(() => document.removeEventListener('click', closeTooltip))

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const STATS = ['str','dex','con','int','wis','cha'] as const

const SAVES = [
  { key: 'fort' as const, label: 'Fortitude', color: '#e8d183' },
  { key: 'ref'  as const, label: 'Reflex',    color: '#6ec6a0' },
  { key: 'will' as const, label: 'Will',      color: '#a08ec8' },
]

// ── Cálculo del total ─────────────────────────────────────────────────────────
function saveTotal(key: 'fort' | 'ref' | 'will') {
  const sv = char.value.saves?.[key]
  if (!sv) return 0
  const stat = (sv.stat ?? 'con') as keyof AbilityScores
  const statMod = mod(char.value.stats?.[stat] ?? 10)
  // Combinar bonuses permanentes (breakdowns) + temporales (quick) para stacking correcto
  const allBonuses: BonusEntry[] = [
    ...(char.value.bonuses?.[key] ?? []),
    ...(sv.quick ?? []),
  ]
  return (sv.base ?? 0) + statMod + calculateApplicableBonuses(allBonuses)
}

function savePermBonus(key: 'fort' | 'ref' | 'will') {
  return calculateApplicableBonuses(char.value.bonuses?.[key] ?? [])
}

// ── Temp bonuses ──────────────────────────────────────────────────────────────
const newQuick = ref<Record<string, { n: string; v: number; t: string }>>({
  fort: { n: '', v: 2, t: 'morale' },
  ref:  { n: '', v: 2, t: 'morale' },
  will: { n: '', v: 2, t: 'morale' },
})
const addingQuick = ref<Record<string, boolean>>({ fort: false, ref: false, will: false })

function toggleAddForm(key: string) {
  addingQuick.value[key] = !addingQuick.value[key]
}

function addQuick(key: 'fort' | 'ref' | 'will') {
  const q = newQuick.value[key]
  if (!q.n.trim()) return
  const sv = char.value.saves[key]
  if (!sv.quick) sv.quick = []
  sv.quick.push({ n: q.n.trim(), v: q.v, t: q.t, activable: true, active: true })
  q.n = ''
  q.v = 2
  addingQuick.value[key] = false
  save()
}

function toggleQuick(key: 'fort' | 'ref' | 'will', i: number) {
  const b = char.value.saves[key].quick![i]
  b.active = !b.active
  save()
}

function removeQuick(key: 'fort' | 'ref' | 'will', i: number) {
  char.value.saves[key].quick!.splice(i, 1)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-title-row">
      <h2 class="panel-title">Saving Throws</h2>
      <div class="help-wrap" @click.stop>
        <button class="help-icon" @click="toggleTooltip" aria-label="Help: permanent bonuses">
          <HelpCircle :size="14" />
        </button>
        <div class="help-tooltip" :class="{ visible: tooltipOpen }">
          Permanent bonuses (feats, equipment, spells) belong in
          <button class="tooltip-link" @click="emit('goToBreakdowns'); closeTooltip()">Breakdowns →</button>
          <br/>Use <em>Temp Bonuses</em> below for in-session buffs.
        </div>
      </div>
    </div>

    <div class="saves-grid">
      <div v-for="sv in SAVES" :key="sv.key" class="save-block">

        <!-- Cabecera: label + total -->
        <div class="save-label" :style="{ color: sv.color }">{{ sv.label }}</div>
        <div class="save-total">{{ fmt(saveTotal(sv.key)) }}</div>

        <!-- Campos base + stat -->
        <div class="save-fields">
          <div class="sf">
            <label>Base</label>
            <input type="number" v-model.number="char.saves[sv.key].base" @change="save" />
          </div>
          <div class="sf">
            <label>Ability</label>
            <select v-model="char.saves[sv.key].stat" @change="save">
              <option v-for="s in STATS" :key="s" :value="s">{{ s.toUpperCase() }}</option>
            </select>
          </div>
        </div>

        <!-- Fórmula explicativa -->
        <div class="save-hint">
          base {{ char.saves[sv.key].base ?? 0 }}
          + {{ char.saves[sv.key].stat?.toUpperCase() }}
          {{ fmt(mod(char.stats[(char.saves[sv.key].stat ?? 'con') as keyof AbilityScores] ?? 10)) }}
          <template v-if="savePermBonus(sv.key) !== 0">
            + perm {{ fmt(savePermBonus(sv.key)) }}
          </template>
          = {{ fmt(saveTotal(sv.key)) }}
        </div>

        <!-- ── Temp bonuses ─────────────────────────────────── -->
        <div class="temp-section">
          <div class="temp-header">
            <span class="temp-label">Temp Bonuses</span>
            <button class="btn-add-temp" @click="toggleAddForm(sv.key)">
              {{ addingQuick[sv.key] ? '✕ Cancel' : '+ Add' }}
            </button>
          </div>

          <!-- Lista de temp bonuses activos -->
          <div
            v-for="(b, i) in (char.saves[sv.key].quick ?? [])"
            :key="i"
            class="quick-row"
            :class="{ inactive: b.active === false }"
          >
            <button class="quick-toggle" @click="toggleQuick(sv.key, i)" :title="b.active !== false ? 'Deactivate' : 'Activate'">
              {{ b.active !== false ? '●' : '○' }}
            </button>
            <span class="quick-name">{{ b.n }}</span>
            <span class="quick-val">{{ fmt(b.v) }}</span>
            <span class="quick-type">{{ bonusTypeLabel(b.t) }}</span>
            <button class="quick-del" @click="removeQuick(sv.key, i)" title="Remove">✕</button>
          </div>

          <!-- Formulario de añadir -->
          <div v-if="addingQuick[sv.key]" class="quick-add-form">
            <input
              v-model="newQuick[sv.key].n"
              placeholder="Source (e.g. Heroism)"
              class="qa-input"
              @keydown.enter="addQuick(sv.key)"
            />
            <input
              type="number"
              v-model.number="newQuick[sv.key].v"
              class="qa-val"
              @keydown.enter="addQuick(sv.key)"
            />
            <select v-model="newQuick[sv.key].t" class="qa-type">
              <option v-for="t in SAVE_BONUS_TYPES" :key="t" :value="t">{{ bonusTypeLabel(t) }}</option>
            </select>
            <button class="btn-confirm-add" @click="addQuick(sv.key)">Add</button>
          </div>
        </div>

      </div>
    </div>

    <p class="panel-note">
      Permanent bonuses (equipment, feats, spells) →
      <button class="note-link" @click="emit('goToBreakdowns')">Breakdowns</button>
      panel › Saves tab.
    </p>

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
  gap: 0.45rem;
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
  padding: 0.25rem 0;
  border-top: 1px solid var(--border);
}

/* ── Temp bonuses ── */
.temp-section {
  border-top: 1px dashed var(--border);
  padding-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.temp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.temp-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.btn-add-temp {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--gold-dim);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-add-temp:hover {
  border-color: var(--gold-dim);
  color: var(--gold-light);
}

.quick-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
}
.quick-row.inactive {
  opacity: 0.45;
}

.quick-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--gold);
  font-size: 0.6rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}
.quick-name {
  flex: 1;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-val {
  font-weight: 700;
  color: var(--text-primary);
  min-width: 24px;
  text-align: right;
  flex-shrink: 0;
}
.quick-type {
  font-size: 0.6rem;
  color: var(--text-muted);
  flex-shrink: 0;
  display: none;  /* hidden on small cards, visible in wider layout */
}
.quick-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.58rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  transition: color var(--transition);
}
.quick-del:hover { color: var(--red-light, #e87070); }

/* ── Add form ── */
.quick-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.qa-input,
.qa-val,
.qa-type {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.78rem;
  padding: 0.25rem 0.4rem;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.qa-input::placeholder { color: var(--text-muted); opacity: 0.55; }
.qa-input:focus,
.qa-val:focus,
.qa-type:focus { border-color: var(--gold-dim); }
.qa-val { width: 70px; }

.btn-confirm-add {
  background: rgba(201,168,76,0.12);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm);
  color: var(--gold-light);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.28rem 0.5rem;
  cursor: pointer;
  transition: all var(--transition);
  align-self: flex-end;
}
.btn-confirm-add:hover {
  background: rgba(201,168,76,0.22);
}

/* ── Title row ── */
section.panel { overflow: visible; }

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.panel-title-row .panel-title {
  margin-bottom: 0;
}

.help-wrap {
  position: relative;
}
.help-icon {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  color: var(--arcane-light);
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  transition: opacity var(--transition), color var(--transition);
}
.help-icon:hover { opacity: 1; color: var(--gold-light); }

.help-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--arcane-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.75rem;
  font-size: 0.73rem;
  color: var(--text-secondary);
  white-space: nowrap;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  line-height: 1.7;
}
.help-tooltip.visible { display: block; }

.tooltip-link {
  background: none;
  border: none;
  color: var(--gold-light);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition);
}
.tooltip-link:hover { color: var(--gold); }

/* ── Note ── */
.panel-note {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.4rem 0.75rem;
  background: rgba(136,85,208,0.05);
  border: 1px dashed var(--arcane-border);
  border-radius: var(--radius-sm);
}
.note-link {
  background: none;
  border: none;
  color: var(--gold-dim);
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition);
}
.note-link:hover { color: var(--gold-light); }

@media (max-width: 500px) {
  .saves-grid { grid-template-columns: 1fr; }
  .quick-type { display: inline; }
}
</style>
