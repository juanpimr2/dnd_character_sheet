<script setup lang="ts">
import { computed, watch } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { AbilityScores } from '@/types/character'
import {
  calculateApplicableBonuses,
  filterToTouch,
  filterToFlat,
  AC_BONUS_TYPES,
} from '@/composables/useBonusCalc'
import BonusBreakdown from '@/components/BonusBreakdown.vue'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const acStatMod = computed(() => {
  const stat = (char.value.acStat ?? 'dex') as keyof AbilityScores
  return mod(char.value.stats?.[stat] ?? 10)
})

const acNormal = computed(() =>
  10 + acStatMod.value + calculateApplicableBonuses(char.value.bonuses?.ac ?? [])
)
const acTouch = computed(() =>
  10 + acStatMod.value + calculateApplicableBonuses(filterToTouch(char.value.bonuses?.ac ?? []))
)
const acFlat = computed(() =>
  10 + calculateApplicableBonuses(filterToFlat(char.value.bonuses?.ac ?? []))
)

// Mantener char.ac sincronizado con el valor calculado
watch(acNormal, v => { char.value.ac = v })

const currentHP = computed(() =>
  Math.max(0, (char.value.maxHP ?? 0) - (char.value.damage ?? 0))
)
const hpPct = computed(() => {
  if (!char.value.maxHP) return 100
  return Math.max(0, Math.min(100, (currentHP.value / char.value.maxHP) * 100))
})
const hpColor = computed(() => {
  const p = hpPct.value
  if (p > 50) return '#45c070'
  if (p > 25) return '#c09030'
  return '#c95252'
})

const initTotal = computed(() => {
  const stat = (char.value.init?.stat ?? 'dex') as keyof typeof char.value.stats
  return mod(char.value.stats?.[stat] ?? 10) + (char.value.init?.bonus ?? 0)
})

const STATS = ['str','dex','con','int','wis','cha'] as const

function applyDamage(delta: number) {
  char.value.damage = Math.max(0, (char.value.damage ?? 0) + delta)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Combat</h2>

    <div class="combat-grid">

      <!-- HP Block -->
      <div class="block block-hp">
        <div class="block-label">Hit Points</div>
        <div class="hp-row">
          <div class="hp-field">
            <label>Max</label>
            <input type="number" v-model.number="char.maxHP" @change="save" min="0" />
          </div>
          <div class="hp-current">
            <span class="hp-val">{{ currentHP }}</span>
            <span class="hp-sep">/ {{ char.maxHP }}</span>
          </div>
          <div class="hp-dmg-btns">
            <button @click="applyDamage(-1)" title="-1 damage">−1</button>
            <button @click="applyDamage(1)"  title="+1 damage">+1</button>
            <button @click="applyDamage(-5)" title="-5 damage">−5</button>
            <button @click="applyDamage(5)"  title="+5 damage">+5</button>
          </div>
        </div>
        <div class="hp-bar-track">
          <div class="hp-bar-fill" :style="{ width: hpPct + '%', background: hpColor }"></div>
        </div>
        <div class="hp-extra">
          <div class="hp-mini">
            <label>Damage taken</label>
            <input type="number" v-model.number="char.damage" @change="save" min="0" />
          </div>
          <div class="hp-mini">
            <label>Temp HP</label>
            <input type="number" v-model.number="char.tempHP" @change="save" min="0" />
          </div>
          <div class="hp-mini">
            <label>Nonlethal</label>
            <input type="number" v-model.number="char.nonLethal" @change="save" min="0" />
          </div>
        </div>
      </div>

      <!-- AC Block -->
      <div class="block block-ac">
        <div class="block-label">Armor Class</div>

        <!-- 3 valores de AC -->
        <div class="ac-values">
          <div class="ac-val">
            <div class="ac-num">{{ acNormal }}</div>
            <div class="ac-lbl">AC</div>
          </div>
          <div class="ac-val ac-val-secondary">
            <div class="ac-num">{{ acTouch }}</div>
            <div class="ac-lbl">Touch AC</div>
          </div>
          <div class="ac-val ac-val-secondary">
            <div class="ac-num">{{ acFlat }}</div>
            <div class="ac-lbl">Flat-Footed</div>
          </div>
        </div>

        <!-- Stat base -->
        <div class="sub-field">
          <label>Stat base</label>
          <select v-model="char.acStat" @change="save">
            <option v-for="s in STATS" :key="s" :value="s">{{ s.toUpperCase() }}</option>
          </select>
          <span class="computed-note">{{ fmt(acStatMod) }}</span>
        </div>

        <!-- Desglose de bonificadores -->
        <details class="breakdown-wrap">
          <summary class="breakdown-toggle">AC Bonuses</summary>
          <BonusBreakdown
            :bonuses="char.bonuses.ac"
            :bonus-types="AC_BONUS_TYPES"
            @change="save"
          />
        </details>
      </div>

      <!-- Iniciativa Block -->
      <div class="block">
        <div class="block-label">Initiative</div>
        <div class="init-total">{{ fmt(initTotal) }}</div>
        <div class="sub-field">
          <label>Stat</label>
          <select v-model="char.init.stat" @change="save">
            <option v-for="s in STATS" :key="s" :value="s">{{ s.toUpperCase() }}</option>
          </select>
        </div>
        <div class="sub-field">
          <label>Bonus misc</label>
          <input type="number" v-model.number="char.init.bonus" @change="save" />
        </div>
      </div>

      <!-- BAB + Velocidad -->
      <div class="block">
        <div class="block-label">BAB</div>
        <input type="number" class="block-input big" v-model.number="char.bab" @change="save" />
      </div>

      <div class="block">
        <div class="block-label">Speed (ft)</div>
        <input type="number" class="block-input big" v-model.number="char.speed" @change="save" step="5" min="0" />
      </div>

      <!-- DR / SR -->
      <div class="block">
        <div class="block-label">RD</div>
        <input type="text" class="block-input" v-model="char.dr" @change="save" placeholder="e.g. 5/magic" />
      </div>

      <div class="block">
        <div class="block-label">RM</div>
        <input type="number" class="block-input big" v-model.number="char.sr" @change="save" min="0" />
      </div>

    </div>
  </section>
</template>

<style scoped>
.combat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
}

.block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.block-hp { grid-column: 1 / -1; }

.block-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.block-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.5rem;
  width: 100%;
  outline: none;
  transition: border-color var(--transition);
}
.block-input:focus { border-color: var(--gold-dim); }
.block-input.big {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  padding: 0.2rem;
}

/* HP */
.hp-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hp-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.hp-field label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; }
.hp-field input {
  width: 70px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.5rem;
  outline: none;
  text-align: center;
}
.hp-field input:focus { border-color: var(--gold-dim); }

.hp-current {
  font-size: 1.8rem;
  font-weight: 800;
  color: v-bind(hpColor);
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  flex: 1;
  justify-content: center;
}
.hp-sep { font-size: 0.9rem; color: var(--text-muted); }

.hp-dmg-btns {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.hp-dmg-btns button {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-family: inherit;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all var(--transition);
}
.hp-dmg-btns button:hover {
  border-color: var(--gold-border);
  color: var(--gold);
}

.hp-bar-track {
  height: 6px;
  background: var(--bg-surface);
  border-radius: 3px;
  overflow: hidden;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease, background 0.4s ease;
}

.hp-extra {
  display: flex;
  gap: 1rem;
}
.hp-mini {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.hp-mini label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; }
.hp-mini input {
  width: 70px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.5rem;
  outline: none;
  text-align: center;
}
.hp-mini input:focus { border-color: var(--gold-dim); }

/* Iniciativa */
.init-total {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
}

.sub-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sub-field label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  white-space: nowrap;
}
.sub-field select,
.sub-field input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.2rem 0.4rem;
  outline: none;
  flex: 1;
}
.sub-field select:focus,
.sub-field input:focus { border-color: var(--gold-dim); }

.computed-note {
  font-size: 0.7rem;
  color: var(--gold-dim);
  text-align: center;
}

/* ── AC Block ── */
.block-ac {
  grid-column: span 2;
}

.ac-values {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 0.25rem 0;
}

.ac-val {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}
.ac-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.ac-val-secondary .ac-num {
  font-size: 1.1rem;
  color: var(--text-secondary);
}
.ac-lbl {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

/* ── Desglose colapsable ── */
.breakdown-wrap {
  margin-top: 0.2rem;
  border-top: 1px dashed var(--border);
  padding-top: 0.35rem;
}
.breakdown-toggle {
  font-size: 0.7rem;
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

details[open] > .breakdown-toggle { margin-bottom: 0.35rem; }

@media (max-width: 600px) {
  .combat-grid { grid-template-columns: 1fr 1fr; }
  .block-hp { grid-column: 1 / -1; }
  .block-ac  { grid-column: 1 / -1; }
}
</style>

