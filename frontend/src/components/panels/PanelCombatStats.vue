<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { AbilityScores } from '@/types/character'
import {
  calculateApplicableBonuses,
  filterToTouch,
  filterToFlat,
  AC_BONUS_TYPES,
  bonusTypeLabel,
} from '@/composables/useBonusCalc'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const acStatMod = computed(() => {
  const stat = (char.value.acStat ?? 'dex') as keyof AbilityScores
  return mod(char.value.stats?.[stat] ?? 10)
})

// Combina bonuses permanentes (breakdowns) + temporales (acQuick) para cálculo
const allAcBonuses = computed(() => [
  ...(char.value.bonuses?.ac ?? []),
  ...(char.value.bonuses?.acQuick ?? []),
])

const acNormal = computed(() =>
  10 + acStatMod.value + calculateApplicableBonuses(allAcBonuses.value)
)
const acTouch = computed(() =>
  10 + acStatMod.value + calculateApplicableBonuses(filterToTouch(allAcBonuses.value))
)
const acFlat = computed(() =>
  10 + calculateApplicableBonuses(filterToFlat(allAcBonuses.value))
)

// ── AC Temp bonuses ───────────────────────────────────────────────────────────
const addingAcQuick = ref(false)
const newAcQuick = ref({ n: '', v: 2, t: 'dodge' })

function addAcQuick() {
  if (!newAcQuick.value.n.trim()) return
  if (!char.value.bonuses.acQuick) char.value.bonuses.acQuick = []
  char.value.bonuses.acQuick.push({
    n: newAcQuick.value.n.trim(),
    v: newAcQuick.value.v,
    t: newAcQuick.value.t,
    activable: true,
    active: true,
  })
  newAcQuick.value = { n: '', v: 2, t: 'dodge' }
  addingAcQuick.value = false
  save()
}

function toggleAcQuick(i: number) {
  const b = char.value.bonuses.acQuick![i]
  b.active = !b.active
  save()
}

function removeAcQuick(i: number) {
  char.value.bonuses.acQuick!.splice(i, 1)
  save()
}

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

        <!-- Temp bonuses (in-session) -->
        <div class="temp-section">
          <div class="temp-header">
            <span class="temp-label">Temp Bonuses</span>
            <button class="btn-add-temp" @click="addingAcQuick = !addingAcQuick">
              {{ addingAcQuick ? '✕ Cancel' : '+ Add' }}
            </button>
          </div>

          <div
            v-for="(b, i) in (char.bonuses.acQuick ?? [])" :key="i"
            class="quick-row" :class="{ inactive: b.active === false }"
          >
            <button class="quick-toggle" @click="toggleAcQuick(i)" :title="b.active !== false ? 'Deactivate' : 'Activate'">
              {{ b.active !== false ? '●' : '○' }}
            </button>
            <span class="quick-name">{{ b.n }}</span>
            <span class="quick-val">{{ b.v >= 0 ? '+' : '' }}{{ b.v }}</span>
            <span class="quick-type">{{ bonusTypeLabel(b.t) }}</span>
            <button class="quick-del" @click="removeAcQuick(i)" title="Remove">✕</button>
          </div>

          <div v-if="addingAcQuick" class="quick-add-form">
            <input v-model="newAcQuick.n" placeholder="Source (e.g. Shield of Faith)" class="qa-input" @keydown.enter="addAcQuick" />
            <input type="number" v-model.number="newAcQuick.v" class="qa-val" @keydown.enter="addAcQuick" />
            <select v-model="newAcQuick.t" class="qa-type">
              <option v-for="t in AC_BONUS_TYPES" :key="t" :value="t">{{ bonusTypeLabel(t) }}</option>
            </select>
            <button class="btn-confirm-add" @click="addAcQuick">Add</button>
          </div>
        </div>

        <p class="ac-note">Permanent bonuses (armor, feats…) → Breakdowns panel › AC tab.</p>
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

/* ── AC Temp bonuses ── */
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
.btn-add-temp:hover { border-color: var(--gold-dim); color: var(--gold-light); }
.quick-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
}
.quick-row.inactive { opacity: 0.45; }
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
.quick-name { flex: 1; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.quick-val { font-weight: 700; color: var(--text-primary); min-width: 24px; text-align: right; flex-shrink: 0; }
.quick-type { font-size: 0.6rem; color: var(--text-muted); flex-shrink: 0; }
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
.quick-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.qa-input, .qa-val, .qa-type {
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
.qa-input:focus, .qa-val:focus, .qa-type:focus { border-color: var(--gold-dim); }
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
.btn-confirm-add:hover { background: rgba(201,168,76,0.22); }
.ac-note {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-align: center;
  margin: 0;
  padding-top: 0.2rem;
}

@media (max-width: 600px) {
  .combat-grid { grid-template-columns: 1fr 1fr; }
  .block-hp { grid-column: 1 / -1; }
  .block-ac  { grid-column: 1 / -1; }
}
</style>

