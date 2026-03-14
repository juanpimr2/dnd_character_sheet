<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { calculateApplicableBonuses } from '@/composables/useBonusCalc'
import type { AbilityScores } from '@/types/character'
import { HelpCircle, X } from 'lucide-vue-next'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

const emit = defineEmits<{ goToBreakdowns: [] }>()

function save() { charStore.scheduleAutoSave() }

function hasBreakdown(key: keyof AbilityScores): boolean {
  return (charStore.activeCharacter?.abilityBreakdowns?.[key]?.length ?? 0) > 0
}
function statValue(key: keyof AbilityScores): number {
  const character = charStore.activeCharacter!
  const bd = character.abilityBreakdowns?.[key]
  if (bd && bd.length > 0) return calculateApplicableBonuses(bd)
  return character.stats[key]
}

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const ABILITIES: { key: keyof AbilityScores; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'dex', label: 'Dexterity',    abbr: 'DEX' },
  { key: 'con', label: 'Constitution', abbr: 'CON' },
  { key: 'int', label: 'Intelligence', abbr: 'INT' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'cha', label: 'Charisma',     abbr: 'CHA' },
]

// Banner: show when character is fresh (all stats at 10, no breakdowns set)
const isNewCharacter = computed(() => {
  const stats = char.value.stats
  const bds   = char.value.abilityBreakdowns
  const allDefault = ABILITIES.every(ab => (stats[ab.key] ?? 10) === 10)
  const noBreakdowns = ABILITIES.every(ab => !(bds?.[ab.key]?.length))
  return allDefault && noBreakdowns
})

// Tooltip toggle
const openTooltip = ref<keyof AbilityScores | null>(null)
function toggleTooltip(key: keyof AbilityScores, e: MouseEvent) {
  e.stopPropagation()
  openTooltip.value = openTooltip.value === key ? null : key
}
function closeTooltips() { openTooltip.value = null }
onMounted(() => document.addEventListener('click', closeTooltips))
onUnmounted(() => document.removeEventListener('click', closeTooltips))

// ── Quick Setup Modal ────────────────────────────────────────────────
const showQuickSetup = ref(false)
type Method = 'pointbuy' | 'array' | 'manual' | 'roll'
const method = ref<Method>('pointbuy')

const METHODS: { id: Method; label: string }[] = [
  { id: 'pointbuy', label: 'Point Buy' },
  { id: 'array',    label: 'Standard Array' },
  { id: 'manual',   label: 'Manual' },
  { id: 'roll',     label: 'Roll 4d6' },
]

const draftStats = reactive<Record<keyof AbilityScores, number>>({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
})

// ── Point Buy ──────────────────────────────────────────────────────
// Cumulative cost FROM 10 (negative = gain points by going below 10)
const PB_COST: Record<number, number> = {
  7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 7, 17: 10, 18: 13,
}
const PB_BUDGET = 25
const pbCost   = (v: number) => PB_COST[v] ?? 0
const pbSpent  = computed(() => ABILITIES.reduce((s, ab) => s + pbCost(draftStats[ab.key]), 0))
const pbLeft   = computed(() => PB_BUDGET - pbSpent.value)

function pbAdjust(key: keyof AbilityScores, delta: number) {
  const cur  = draftStats[key]
  const next = cur + delta
  if (next < 7 || next > 18) return
  const diff = pbCost(next) - pbCost(cur)
  if (diff > 0 && pbLeft.value < diff) return
  draftStats[key] = next
}

// ── Standard Array ─────────────────────────────────────────────────
const ARRAY_VALS = [15, 14, 13, 12, 10, 8]

function initArray() {
  ABILITIES.forEach((ab, i) => { draftStats[ab.key] = ARRAY_VALS[i] })
}
function arrayUsed(excludeKey?: keyof AbilityScores): number[] {
  return ABILITIES.filter(ab => ab.key !== excludeKey).map(ab => draftStats[ab.key])
}
function arrayOptions(key: keyof AbilityScores): number[] {
  const used = arrayUsed(key)
  return ARRAY_VALS.filter(v => !used.includes(v) || draftStats[key] === v)
}
const arrayUnassigned = computed(() => {
  const assigned = new Set(ABILITIES.map(ab => draftStats[ab.key]))
  return ARRAY_VALS.filter(v => !assigned.has(v))
})

// ── Roll 4d6 drop lowest ───────────────────────────────────────────
const rollResults = reactive<Record<keyof AbilityScores, number[]>>({
  str: [], dex: [], con: [], int: [], wis: [], cha: [],
})
function roll4d6(): number[] {
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  dice.sort((a, b) => a - b)
  return dice
}
function rollAll() {
  ABILITIES.forEach(ab => {
    const dice = roll4d6()
    rollResults[ab.key] = dice
    draftStats[ab.key] = dice.slice(1).reduce((a, b) => a + b, 0)
  })
}

// ── Method switch ──────────────────────────────────────────────────
function switchMethod(m: Method) {
  method.value = m
  if (m === 'pointbuy') ABILITIES.forEach(ab => { draftStats[ab.key] = 10 })
  else if (m === 'array') initArray()
  else if (m === 'manual') ABILITIES.forEach(ab => { draftStats[ab.key] = 10 })
  else if (m === 'roll') rollAll()
}

function openModal() {
  switchMethod('pointbuy')
  showQuickSetup.value = true
}

// ── Apply ──────────────────────────────────────────────────────────
function applySetup() {
  if (!char.value) return
  const bds = char.value.abilityBreakdowns ??= { str: [], dex: [], con: [], int: [], wis: [], cha: [] }
  ABILITIES.forEach(ab => {
    bds[ab.key] = [{ n: 'Base score', v: draftStats[ab.key], t: 'untyped' }]
  })
  charStore.scheduleAutoSave()
  showQuickSetup.value = false
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Ability Scores</h2>

    <!-- New character banner -->
    <Transition name="banner">
      <div v-if="isNewCharacter" class="new-char-banner">
        <span class="banner-icon">🎲</span>
        <div class="banner-text">
          <strong>New character?</strong>
          <button class="banner-cta" @click="openModal">Quick Setup</button>
          <span class="banner-or">or set scores manually in</span>
          <button class="banner-link" @click="emit('goToBreakdowns')">Breakdowns →</button>
        </div>
      </div>
    </Transition>

    <!-- Stat grid -->
    <div class="ability-grid">
      <div v-for="ab in ABILITIES" :key="ab.key" class="ability-box" :class="{ locked: hasBreakdown(ab.key) }" :title="ab.label">
        <div class="ab-label">{{ ab.abbr }}</div>
        <input
          v-if="!hasBreakdown(ab.key)"
          type="number"
          class="ab-score-input"
          v-model.number="char.stats[ab.key]"
          @change="save"
          min="1" max="60"
        />
        <div v-else class="ab-score-readonly">{{ statValue(ab.key) }}</div>
        <div class="ab-mod">{{ fmt(mod(statValue(ab.key))) }}</div>
        <div v-if="hasBreakdown(ab.key)" class="ab-lock-hint" @click.stop>
          <button class="ab-lock-icon" @click="toggleTooltip(ab.key, $event)" :aria-label="`View breakdown for ${ab.label}`">
            <HelpCircle :size="13" />
          </button>
          <div class="ab-tooltip" :class="{ visible: openTooltip === ab.key }">
            Calculated from your Breakdown.<br/>
            Edit it in
            <button class="tooltip-link" @click="emit('goToBreakdowns'); closeTooltips()">Breakdowns →</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Quick Setup Modal ── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showQuickSetup" class="qs-overlay" @click.self="showQuickSetup = false">
        <div class="qs-modal">

          <!-- Header -->
          <div class="qs-header">
            <span class="qs-title">Quick Setup — Ability Scores</span>
            <button class="qs-close" @click="showQuickSetup = false"><X :size="14" /></button>
          </div>

          <!-- Method tabs -->
          <div class="qs-tabs">
            <button
              v-for="m in METHODS" :key="m.id"
              class="qs-tab" :class="{ active: method === m.id }"
              @click="switchMethod(m.id)"
            >{{ m.label }}</button>
          </div>

          <!-- Point Buy budget bar -->
          <div v-if="method === 'pointbuy'" class="qs-budget">
            <div class="budget-bar-wrap">
              <div class="budget-bar" :style="{ width: Math.min(100, (pbSpent / PB_BUDGET) * 100) + '%' }" :class="{ over: pbLeft < 0 }" />
            </div>
            <span class="budget-label" :class="{ over: pbLeft < 0 }">
              {{ pbLeft >= 0 ? pbLeft : 0 }} pts left
              <span v-if="pbLeft < 0" class="budget-over"> ({{ -pbLeft }} over budget)</span>
            </span>
          </div>

          <!-- Standard Array pool -->
          <div v-if="method === 'array'" class="qs-array-pool">
            <span class="pool-label">Unassigned:</span>
            <span v-for="v in arrayUnassigned" :key="v" class="pool-val">{{ v }}</span>
            <span v-if="arrayUnassigned.length === 0" class="pool-done">✓ All assigned</span>
          </div>

          <!-- Roll hint -->
          <div v-if="method === 'roll'" class="qs-roll-hint">
            <button class="btn-roll-all" @click="rollAll">🎲 Re-roll all (4d6 drop lowest)</button>
          </div>

          <!-- Stat rows -->
          <div class="qs-stats">
            <div v-for="ab in ABILITIES" :key="ab.key" class="qs-row">
              <span class="qs-stat-label">{{ ab.abbr }}</span>

              <!-- Point Buy -->
              <template v-if="method === 'pointbuy'">
                <button class="pb-btn" @click="pbAdjust(ab.key, -1)" :disabled="draftStats[ab.key] <= 7">−</button>
                <span class="qs-val">{{ draftStats[ab.key] }}</span>
                <button class="pb-btn" @click="pbAdjust(ab.key, +1)" :disabled="draftStats[ab.key] >= 18 || (pbCost(draftStats[ab.key] + 1) - pbCost(draftStats[ab.key])) > pbLeft">+</button>
                <span class="qs-cost">{{ pbCost(draftStats[ab.key]) >= 0 ? '+' : '' }}{{ pbCost(draftStats[ab.key]) }} pt</span>
              </template>

              <!-- Standard Array -->
              <template v-else-if="method === 'array'">
                <select class="qs-select" v-model.number="draftStats[ab.key]">
                  <option v-for="v in arrayOptions(ab.key)" :key="v" :value="v">{{ v }}</option>
                </select>
              </template>

              <!-- Manual -->
              <template v-else-if="method === 'manual'">
                <input class="qs-input" type="number" v-model.number="draftStats[ab.key]" min="3" max="25" />
              </template>

              <!-- Roll -->
              <template v-else>
                <span class="qs-val">{{ draftStats[ab.key] }}</span>
                <span class="qs-dice" :title="`Dice: ${rollResults[ab.key].join(', ')} (dropped ${rollResults[ab.key][0]})`">
                  {{ rollResults[ab.key].length ? rollResults[ab.key].slice(1).join('+') : '—' }}
                </span>
              </template>

              <span class="qs-mod-preview">{{ fmt(mod(draftStats[ab.key])) }}</span>
            </div>
          </div>

          <!-- Apply -->
          <button
            class="qs-apply"
            :disabled="method === 'pointbuy' && pbLeft < 0"
            @click="applySetup"
          >
            Apply & seed breakdowns
          </button>
          <p class="qs-note">
            This sets each stat as a "Base score" entry in Breakdowns. You can add racial bonuses, items and level-ups there afterward.
          </p>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Necesario para que el tooltip escape el overflow:hidden del .panel global */
section.panel { overflow: visible; }

.ability-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
}

.ability-box {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.3rem;
  text-align: center;
  transition: border-color var(--transition);
}
.ability-box:focus-within { border-color: var(--gold-dim); }
.ability-box.locked { border-color: rgba(136, 85, 208, 0.35); }

.ab-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.ab-score-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  font-family: inherit;
  padding: 0.1rem 0;
  outline: none;
  -moz-appearance: textfield;
}
.ab-score-input::-webkit-inner-spin-button,
.ab-score-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.ab-score-input:focus { border-bottom-color: var(--gold); }

.ab-mod {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--gold);
  margin-top: 0.25rem;
}

.ab-score-readonly {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
  padding: 0.1rem 0;
  border-bottom: 1px solid rgba(136, 85, 208, 0.3);
  margin-bottom: 0;
  line-height: 1.4;
}

.ab-lock-hint {
  position: absolute;
  top: 4px;
  right: 4px;
}
.ab-lock-icon {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--arcane-light);
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  transition: opacity var(--transition), color var(--transition);
}
.ab-lock-icon:hover { opacity: 1; color: var(--gold-light); }

.ab-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  right: -4px;
  background: var(--bg-elevated);
  border: 1px solid var(--arcane-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.75rem;
  font-size: 0.73rem;
  color: var(--text-secondary);
  white-space: nowrap;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  line-height: 1.6;
}
.ab-tooltip.visible { display: block; }

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

/* ── New character banner ── */
.new-char-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(136,85,208,0.12), rgba(201,168,76,0.08));
  border: 1px solid var(--gold-border);
  border-left: 3px solid var(--gold);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.banner-icon { font-size: 1.1rem; flex-shrink: 0; }
.banner-text { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; flex: 1; }

.banner-cta {
  background: var(--gold);
  border: none;
  border-radius: var(--radius-sm);
  color: rgba(20,10,0,0.9);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.18rem 0.55rem;
  cursor: pointer;
  transition: background var(--transition);
  letter-spacing: 0.02em;
}
.banner-cta:hover { background: var(--gold-bright); }

.banner-or { color: var(--text-muted); font-size: 0.7rem; }

.banner-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 0.7rem;
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition);
}
.banner-link:hover { color: var(--gold-dim); }

.banner-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.banner-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.banner-enter-from   { opacity: 0; transform: translateY(-6px); }
.banner-leave-to     { opacity: 0; transform: translateY(-6px); }

@media (max-width: 500px) {
  .ability-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>

<!-- ── Quick Setup Modal (global — teleported to body) ── -->
<style>
.qs-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(3px);
}

.qs-modal {
  background: var(--bg-card);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg, 10px);
  padding: 1.25rem 1.35rem 1rem;
  width: 420px; max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  display: flex; flex-direction: column; gap: 0.8rem;
}

.qs-header {
  display: flex; align-items: center; justify-content: space-between;
}
.qs-title {
  font-family: var(--font-title, serif);
  font-size: 1rem; font-weight: 700;
  color: var(--gold-light); letter-spacing: 0.04em;
}
.qs-close {
  background: transparent; border: none;
  color: var(--text-muted); cursor: pointer; padding: 0.2rem;
  display: flex; align-items: center; border-radius: 4px;
  transition: color var(--transition);
}
.qs-close:hover { color: var(--text-primary); }

/* Method tabs */
.qs-tabs {
  display: flex; gap: 0.3rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  padding: 0.2rem;
}
.qs-tab {
  flex: 1; padding: 0.3rem 0.4rem;
  background: transparent; border: none; border-radius: var(--radius-sm);
  color: var(--text-muted); font-family: inherit; font-size: 0.72rem; font-weight: 600;
  cursor: pointer; transition: all var(--transition); white-space: nowrap;
}
.qs-tab:hover { color: var(--text-secondary); }
.qs-tab.active { background: var(--bg-card); color: var(--gold-light); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

/* Point Buy budget */
.qs-budget { display: flex; align-items: center; gap: 0.6rem; }
.budget-bar-wrap {
  flex: 1; height: 5px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden;
}
.budget-bar {
  height: 100%; background: var(--gold);
  border-radius: 3px; transition: width 0.2s ease, background 0.2s;
}
.budget-bar.over { background: var(--red-light, #e05555); }
.budget-label { font-size: 0.72rem; color: var(--gold-dim); white-space: nowrap; font-weight: 600; }
.budget-label.over { color: var(--red-light, #e05555); }
.budget-over { font-weight: 400; }

/* Array pool */
.qs-array-pool {
  display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
  padding: 0.35rem 0.5rem;
  background: var(--bg-elevated); border-radius: var(--radius-sm);
  font-size: 0.72rem;
}
.pool-label { color: var(--text-muted); }
.pool-val {
  min-width: 26px; text-align: center;
  background: var(--bg-card); border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm); color: var(--gold-light);
  font-weight: 700; padding: 0.05rem 0.25rem; font-size: 0.75rem;
}
.pool-done { color: rgba(100,200,100,0.8); font-size: 0.7rem; }

/* Roll hint */
.qs-roll-hint { display: flex; justify-content: center; }
.btn-roll-all {
  background: var(--bg-elevated); border: 1px solid var(--gold-border);
  border-radius: var(--radius-md); color: var(--gold-light);
  font-family: inherit; font-size: 0.75rem; font-weight: 600;
  padding: 0.3rem 0.8rem; cursor: pointer; transition: all var(--transition);
}
.btn-roll-all:hover { background: rgba(201,168,76,0.12); border-color: var(--gold); }

/* Stat rows */
.qs-stats { display: flex; flex-direction: column; gap: 0.4rem; }
.qs-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: var(--bg-elevated); border-radius: var(--radius-sm);
}
.qs-stat-label {
  width: 32px; font-size: 0.65rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); flex-shrink: 0;
}

.qs-val {
  min-width: 36px; text-align: center;
  font-size: 1.15rem; font-weight: 700; color: var(--text-primary);
}
.qs-mod-preview {
  margin-left: auto; min-width: 30px; text-align: right;
  font-size: 0.82rem; font-weight: 600; color: var(--gold);
}
.qs-cost {
  font-size: 0.63rem; color: var(--text-muted);
  min-width: 38px;
}
.qs-dice {
  font-size: 0.62rem; color: var(--text-muted);
  margin-left: 2px; font-family: monospace;
}

/* Point Buy +/- buttons */
.pb-btn {
  width: 24px; height: 24px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text-secondary);
  font-size: 1rem; font-weight: 700; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition); flex-shrink: 0;
}
.pb-btn:hover:not(:disabled) { border-color: var(--gold-border); color: var(--gold-light); }
.pb-btn:disabled { opacity: 0.3; cursor: default; }

/* Array dropdown */
.qs-select {
  flex: 1; background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text-primary);
  font-family: inherit; font-size: 0.85rem; font-weight: 700;
  padding: 0.18rem 0.3rem; cursor: pointer; text-align: center;
}
.qs-select:focus { outline: none; border-color: var(--gold-dim); }

/* Manual input */
.qs-input {
  flex: 1; background: var(--bg-card); border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary); font-family: inherit;
  font-size: 1.15rem; font-weight: 700; text-align: center;
  padding: 0.1rem 0.2rem; outline: none;
  -moz-appearance: textfield;
  transition: border-color var(--transition);
}
.qs-input:focus { border-bottom-color: var(--gold); }
.qs-input::-webkit-inner-spin-button,
.qs-input::-webkit-outer-spin-button { -webkit-appearance: none; }

/* Apply button */
.qs-apply {
  background: var(--gold);
  border: none; border-radius: var(--radius-md);
  color: rgba(20,10,0,0.9); font-family: inherit;
  font-size: 0.82rem; font-weight: 800;
  padding: 0.55rem 1rem; cursor: pointer;
  transition: background var(--transition); letter-spacing: 0.02em;
  margin-top: 0.2rem;
}
.qs-apply:hover:not(:disabled) { background: var(--gold-bright, #e8c84a); }
.qs-apply:disabled { opacity: 0.4; cursor: default; }

.qs-note {
  font-size: 0.65rem; color: var(--text-muted);
  text-align: center; line-height: 1.45; margin: 0;
}

/* Modal transition */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .qs-modal { animation: modal-pop 0.22s ease; }
@keyframes modal-pop {
  from { transform: scale(0.95) translateY(8px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);   opacity: 1; }
}
</style>
