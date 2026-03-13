<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { calculateApplicableBonuses } from '@/composables/useBonusCalc'
import type { AttackEntry, AttackRole } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)
function save() { charStore.scheduleAutoSave() }

// ── Stat helpers ──────────────────────────────────────────────────────────────
function statMod(key: string): number {
  const val = (char.value.stats as Record<string, number>)[key] ?? 10
  return Math.floor((val - 10) / 2)
}

const attackBonusTotal = computed(() =>
  calculateApplicableBonuses(char.value.bonuses.attack ?? [])
)

// ── TWF helpers ───────────────────────────────────────────────────────────────
const hasOffhand = computed(() =>
  char.value.attacks.some(a => a.role === 'offhand_light' || a.role === 'offhand')
)
const hasLightOffhand = computed(() =>
  char.value.attacks.some(a => a.role === 'offhand_light')
)

function primaryTWFPenalty(): number {
  if (!hasOffhand.value) return 0
  const twf = char.value.twfFeat ?? 'none'
  if (twf === 'none') return hasLightOffhand.value ? -4 : -6
  return hasLightOffhand.value ? -2 : -4
}

function offhandPenalty(isLight: boolean): number {
  const twf = char.value.twfFeat ?? 'none'
  if (twf === 'none') return isLight ? -4 : -10
  return isLight ? -2 : -4
}

// ── Attack calculation ────────────────────────────────────────────────────────
function numIterativeAttacks(bab: number): number {
  if (bab <= 0) return 1
  return Math.min(Math.floor((bab - 1) / 5) + 1, 5)
}

function calcBonuses(entry: AttackEntry): number[] | null {
  const role = entry.role ?? 'manual'
  if (role === 'manual') return null

  const atkMod  = statMod(entry.stat ?? 'str')
  const globalB = attackBonusTotal.value
  const enh     = entry.enhancement ?? 0
  const bab     = char.value.bab
  const base    = bab + atkMod + globalB + enh

  if (role === 'primary') {
    const pen = primaryTWFPenalty()
    const n   = numIterativeAttacks(bab)
    return Array.from({ length: n }, (_, i) => base + pen - i * 5)
  }

  if (role === 'offhand_light' || role === 'offhand') {
    const isLight = role === 'offhand_light'
    const pen     = offhandPenalty(isLight)
    const twf     = char.value.twfFeat ?? 'none'
    const first   = base + pen
    const result  = [first]
    if (twf === 'itwf' || twf === 'gtwf') result.push(first - 5)
    if (twf === 'gtwf') result.push(first - 10)
    return result
  }

  if (role === 'extra') {
    return [base + primaryTWFPenalty()]
  }

  return null
}

function fmtBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function fmtSequence(bonuses: number[]): string {
  return bonuses.map(fmtBonus).join(' / ')
}

// ── Full-attack summary ───────────────────────────────────────────────────────
const fullAttackSummary = computed(() => {
  return char.value.attacks
    .filter(a => a.weapon)
    .map(a => {
      const bonuses = calcBonuses(a)
      const seq = bonuses ? fmtSequence(bonuses) : (a.bonus || '?')
      return `${a.weapon}: ${seq}`
    })
    .join('  ·  ')
})

// ── CRUD ──────────────────────────────────────────────────────────────────────
function addAttack() {
  char.value.attacks.push({
    weapon: '', role: 'primary', stat: 'str', enhancement: 0,
    bonus: '', damage: '', crit: '20/×2', type: '', notes: '',
  })
  save()
}

function removeAttack(i: number) {
  char.value.attacks.splice(i, 1)
  save()
}

// ── Labels ────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<AttackRole, string> = {
  primary:      'Primary',
  offhand_light:'Off-hand (light)',
  offhand:      'Off-hand',
  extra:        'Extra (haste…)',
  manual:       'Manual',
}

const TWF_LABELS = [
  { value: 'none', label: 'No TWF' },
  { value: 'twf',  label: 'TWF feat' },
  { value: 'itwf', label: 'Improved TWF' },
  { value: 'gtwf', label: 'Greater TWF' },
]
</script>

<template>
  <section v-if="char" class="panel">

    <!-- Header -->
    <div class="panel-header">
      <h2 class="panel-title">Attacks</h2>
      <div class="header-controls">
        <label class="twf-label">TWF</label>
        <select
          :value="char.twfFeat ?? 'none'"
          @change="char.twfFeat = ($event.target as HTMLSelectElement).value as any; save()"
          class="twf-select"
        >
          <option v-for="opt in TWF_LABELS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <button class="btn-outline btn-sm" @click="addAttack">+ Add</button>
      </div>
    </div>

    <!-- Attack entries -->
    <div v-if="char.attacks.length > 0" class="attacks-list">
      <div v-for="(atk, i) in char.attacks" :key="i" class="atk-card">

        <!-- Row 1: config + calculated bonus -->
        <div class="atk-row1">
          <input
            type="text" v-model="atk.weapon" @change="save"
            placeholder="Weapon name" class="inp inp-weapon"
          />

          <select v-model="atk.role" @change="save" class="inp inp-role">
            <option v-for="(label, val) in ROLE_LABELS" :key="val" :value="val">
              {{ label }}
            </option>
          </select>

          <template v-if="(atk.role ?? 'manual') !== 'manual'">
            <select v-model="atk.stat" @change="save" class="inp inp-stat">
              <option value="str">STR</option>
              <option value="dex">DEX</option>
            </select>
            <div class="enh-wrap">
              <span class="enh-prefix">+</span>
              <input
                type="number" v-model.number="atk.enhancement" @change="save"
                min="0" max="10" class="inp inp-enh" title="Enhancement bonus"
              />
            </div>
          </template>
          <template v-else>
            <input
              type="text" v-model="atk.bonus" @change="save"
              placeholder="+5/+0" class="inp inp-manual-bonus"
            />
          </template>

          <!-- Calculated bonus display -->
          <div class="bonus-display" :class="{ manual: (atk.role ?? 'manual') === 'manual' }">
            <template v-if="(atk.role ?? 'manual') !== 'manual'">
              <span class="bonus-seq">{{ fmtSequence(calcBonuses(atk)!) }}</span>
              <span class="bonus-hint">
                BAB {{ char.bab }}
                + {{ fmtBonus(statMod(atk.stat ?? 'str')) }} {{ (atk.stat ?? 'str').toUpperCase() }}
                <template v-if="attackBonusTotal !== 0">{{ fmtBonus(attackBonusTotal) }} misc</template>
                <template v-if="(atk.enhancement ?? 0) !== 0">{{ fmtBonus(atk.enhancement ?? 0) }} enh</template>
              </span>
            </template>
            <template v-else>
              <span class="bonus-seq manual-bonus">{{ atk.bonus || '—' }}</span>
            </template>
          </div>

          <button class="btn-del" @click="removeAttack(i)" title="Remove">✕</button>
        </div>

        <!-- Row 2: damage details -->
        <div class="atk-row2">
          <label class="detail-label">Damage</label>
          <input type="text" v-model="atk.damage" @change="save" placeholder="1d8+STR" class="inp inp-detail" />
          <label class="detail-label">Crit</label>
          <input type="text" v-model="atk.crit"   @change="save" placeholder="20/×2"   class="inp inp-crit" />
          <label class="detail-label">Type</label>
          <input type="text" v-model="atk.type"   @change="save" placeholder="S/P/B"   class="inp inp-type" />
          <label class="detail-label">Notes</label>
          <input type="text" v-model="atk.notes"  @change="save" placeholder="Notes…"  class="inp inp-notes" />
        </div>

      </div>
    </div>

    <div v-else class="empty-state">No attacks — press "+ Add"</div>

    <!-- Full-attack summary -->
    <div v-if="char.attacks.length > 0 && fullAttackSummary" class="full-attack-summary">
      <span class="summary-label">Full attack</span>
      <span class="summary-text">{{ fullAttackSummary }}</span>
    </div>

  </section>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.panel-header .panel-title { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }

.header-controls { display: flex; align-items: center; gap: 0.5rem; }
.twf-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
.twf-select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  padding: 0.25rem 0.4rem;
}
.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

/* ── Attack cards ── */
.attacks-list { display: flex; flex-direction: column; gap: 0.5rem; }

.atk-card {
  background: var(--bg-card, var(--bg-input));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.atk-row1 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.atk-row2 {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.inp {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.25rem 0.45rem;
  outline: none;
  transition: border-color var(--transition);
}
.inp:focus { border-color: var(--gold-dim); }

.inp-weapon       { flex: 1 1 120px; min-width: 100px; }
.inp-role         { flex: 0 0 auto; min-width: 130px; cursor: pointer; }
.inp-stat         { flex: 0 0 auto; width: 72px; cursor: pointer; }
.enh-wrap         { display: flex; align-items: center; gap: 2px; }
.enh-prefix       { font-size: 0.8rem; color: var(--text-muted); }
.inp-enh          { width: 44px; text-align: center; }
.inp-manual-bonus { flex: 0 0 auto; width: 90px; }
.inp-detail       { flex: 1 1 80px; min-width: 70px; }
.inp-crit         { flex: 0 0 auto; width: 80px; }
.inp-type         { flex: 0 0 auto; width: 52px; }
.inp-notes        { flex: 2 1 100px; min-width: 80px; }

.detail-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Bonus display ── */
.bonus-display {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.2rem 0.5rem;
  background: color-mix(in srgb, var(--gold-dim) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--gold-dim) 25%, transparent);
  border-radius: var(--radius-sm);
  min-width: 140px;
}
.bonus-display.manual {
  background: transparent;
  border-color: transparent;
}

.bonus-seq {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--gold-light, #f0c060);
  letter-spacing: 0.02em;
}
.manual-bonus {
  color: var(--text-primary);
  font-weight: 600;
}
.bonus-hint {
  font-size: 0.62rem;
  color: var(--text-muted);
  margin-top: 1px;
}

/* ── Delete ── */
.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
  flex-shrink: 0;
}
.btn-del:hover { color: var(--red-light, #e06060); }

/* ── Full attack summary ── */
.full-attack-summary {
  margin-top: 0.75rem;
  padding: 0.45rem 0.6rem;
  background: color-mix(in srgb, var(--gold-dim) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--gold-dim) 20%, transparent);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.summary-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  white-space: nowrap;
}
.summary-text {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
