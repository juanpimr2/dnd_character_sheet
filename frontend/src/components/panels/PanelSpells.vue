<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { SpellEntry, SpellcastingBlock, SpellSchool } from '@/types/character'
import type { AbilityScores } from '@/types/character'
import { Plus, Trash2, RotateCcw, Wand2, Info, X } from 'lucide-vue-next'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)
function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)

// ── Default block ──────────────────────────────────────────────────
function makeBlock(): SpellcastingBlock {
  return {
    spellClass: '',
    type: 'prepared',
    stat: 'int',
    casterLevel: 1,
    concentrationBonus: 0,
    slotsPerDay: Array(10).fill(0),
    slotsUsed:   Array(10).fill(0),
    spells: [],
  }
}

// ── Normalize spellcasting to always be SpellcastingBlock[] ───────
// Old data may have a single object; we migrate it silently on load.
function ensureBlocks(): SpellcastingBlock[] {
  const raw = char.value.spellcasting
  if (!raw) {
    char.value.spellcasting = [makeBlock()]
  } else if (!Array.isArray(raw)) {
    char.value.spellcasting = [raw as SpellcastingBlock]
  }
  return char.value.spellcasting as SpellcastingBlock[]
}

const scBlocks = computed<SpellcastingBlock[]>(() => ensureBlocks())

// ── Active tab ─────────────────────────────────────────────────────
const activeIdx = ref(0)
const sc = computed<SpellcastingBlock>(() =>
  scBlocks.value[Math.min(activeIdx.value, scBlocks.value.length - 1)]
)

function addBlock() {
  scBlocks.value.push(makeBlock())
  activeIdx.value = scBlocks.value.length - 1
  save()
}

function removeBlock(i: number) {
  if (scBlocks.value.length <= 1) return
  scBlocks.value.splice(i, 1)
  if (activeIdx.value >= scBlocks.value.length) activeIdx.value = scBlocks.value.length - 1
  save()
}

// ── Ability modifier ───────────────────────────────────────────────
const abilityMod = computed(() => {
  const stat = sc.value.stat as keyof AbilityScores
  return mod(char.value.stats?.[stat] ?? 10)
})

// ── Bonus spells per day (D&D 3.5 SRD) ───────────────────────────
function bonusSlots(level: number): number {
  if (level === 0) return 0
  const m = abilityMod.value
  if (m < level) return 0
  return Math.floor((m - level) / 4) + 1
}

const totalSlots = (level: number) => (sc.value.slotsPerDay[level] ?? 0) + bonusSlots(level)
const remaining  = (level: number) => Math.max(0, totalSlots(level) - (sc.value.slotsUsed[level] ?? 0))
const spellDC    = (level: number) => 10 + level + abilityMod.value

const concentrationBonus = computed(() =>
  sc.value.casterLevel + abilityMod.value + (sc.value.concentrationBonus ?? 0)
)

// Touch attack bonus: BAB + DEX mod (ranged touch — rays, etc.)
// Melee touch uses BAB + STR mod but ranged is more common for offensive spells
const touchAttackBonus = computed(() => {
  const bab = char.value.bab ?? 0
  const dex = Math.floor(((char.value.stats?.dex ?? 10) - 10) / 2)
  return bab + dex
})

// ── Slot controls ──────────────────────────────────────────────────
function useSlot(level: number) {
  const used = sc.value.slotsUsed[level] ?? 0
  if (used >= totalSlots(level)) return
  sc.value.slotsUsed[level] = used + 1
  save()
}
function recoverSlot(level: number) {
  const used = sc.value.slotsUsed[level] ?? 0
  if (used <= 0) return
  sc.value.slotsUsed[level] = used - 1
  save()
}
function resetDay() {
  sc.value.slotsUsed = Array(10).fill(0)
  if (sc.value.type === 'prepared') {
    for (const sp of sc.value.spells) sp.prepared = 0
  }
  save()
}

// ── Active levels ──────────────────────────────────────────────────
const activeLevels = computed(() => {
  const withSlots  = sc.value.slotsPerDay.map((v, i) => v > 0 || bonusSlots(i) > 0 ? i : -1).filter(i => i >= 0)
  const withSpells = [...new Set(sc.value.spells.map(s => s.level))]
  return [...new Set([...withSlots, ...withSpells])].sort((a, b) => a - b)
})

// ── Add spell ──────────────────────────────────────────────────────
const newSpell = ref<{ name: string; level: number; school: SpellSchool; notes: string }>({
  name: '', level: 1, school: '', notes: '',
})
const showAddForm = ref(false)

function openAddForm(level?: number) {
  newSpell.value = { name: '', level: level ?? 1, school: '', notes: '' }
  showAddForm.value = true
}

function addSpell() {
  if (!newSpell.value.name.trim()) return
  sc.value.spells.push({
    id: Date.now(),
    name:     newSpell.value.name.trim(),
    level:    newSpell.value.level,
    school:   newSpell.value.school,
    prepared: 0,
    notes:    newSpell.value.notes.trim(),
  })
  sc.value.spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
  showAddForm.value = false
  save()
}

function removeSpell(id: number) {
  sc.value.spells = sc.value.spells.filter(s => s.id !== id)
  save()
}

function incPrepared(sp: SpellEntry) {
  const preparedAtLevel = sc.value.spells.filter(s => s.level === sp.level).reduce((a, s) => a + (s.prepared ?? 0), 0)
  if (preparedAtLevel >= totalSlots(sp.level)) return
  sp.prepared = (sp.prepared ?? 0) + 1
  save()
}
function decPrepared(sp: SpellEntry) {
  if ((sp.prepared ?? 0) <= 0) return
  sp.prepared = (sp.prepared ?? 0) - 1
  save()
}

function spellsAtLevel(level: number): SpellEntry[] {
  return sc.value.spells.filter(s => s.level === level)
}

const SCHOOLS: SpellSchool[] = ['', 'Abjur', 'Conj', 'Div', 'Ench', 'Evoc', 'Illus', 'Necro', 'Trans', 'Univ']
const SCHOOL_COLORS: Record<string, string> = {
  Abjur: '#6ea8d0', Conj: '#a87ad0', Div: '#d0c06e', Ench: '#d07ea8',
  Evoc: '#d07e6e', Illus: '#8ed0a8', Necro: '#a0a0a0', Trans: '#7ed0a0', Univ: '#c9a84c',
}
const schoolColor = (school: string) => SCHOOL_COLORS[school] ?? '#888'
const LEVEL_NAMES = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">
      <Wand2 :size="16" />
      Spells
    </h2>

    <!-- ── Class tabs ──────────────────────────────────────────────── -->
    <div class="class-tabs">
      <button
        v-for="(block, i) in scBlocks" :key="i"
        :class="['tab', { active: i === activeIdx }]"
        @click="activeIdx = i; showAddForm = false"
      >
        {{ block.spellClass || 'New class' }}
        <span
          v-if="scBlocks.length > 1"
          class="tab-close"
          @click.stop="removeBlock(i)"
          title="Remove this spellcasting class"
        ><X :size="11" /></span>
      </button>
      <button class="tab tab-add" @click="addBlock" title="Add spellcasting class">
        <Plus :size="13" />
      </button>
    </div>

    <!-- ── Config ─────────────────────────────────────────────────── -->
    <div class="config-bar">
      <div class="config-field config-field--wide">
        <label>Spellcasting class</label>
        <input v-model="sc.spellClass" placeholder="Wizard, Cleric…" @change="save" />
      </div>
      <div class="config-field">
        <label>Type</label>
        <div class="toggle-group">
          <button :class="['toggle-btn', { active: sc.type === 'prepared' }]"   @click="sc.type = 'prepared'; save()">Prepared</button>
          <button :class="['toggle-btn', { active: sc.type === 'spontaneous' }]" @click="sc.type = 'spontaneous'; save()">Spontaneous</button>
        </div>
      </div>
      <div class="config-field">
        <label>Ability</label>
        <div class="toggle-group">
          <button v-for="s in ['int','wis','cha']" :key="s"
            :class="['toggle-btn', { active: sc.stat === s }]"
            @click="sc.stat = s as 'int'|'wis'|'cha'; save()">
            {{ s.toUpperCase() }}
          </button>
        </div>
      </div>
      <div class="config-field config-field--sm">
        <label>CL</label>
        <input type="number" v-model.number="sc.casterLevel" min="1" max="20" @change="save" />
      </div>
      <div class="config-field config-field--sm">
        <label>Conc. misc</label>
        <input type="number" v-model.number="sc.concentrationBonus" @change="save" />
      </div>
    </div>

    <!-- ── Quick stats ────────────────────────────────────────────── -->
    <div class="quick-stats">
      <div class="stat-chip">
        <span class="stat-chip-label">{{ sc.stat.toUpperCase() }} mod</span>
        <span class="stat-chip-value">{{ abilityMod >= 0 ? '+' : '' }}{{ abilityMod }}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-chip-label">Concentration</span>
        <span class="stat-chip-value">{{ concentrationBonus >= 0 ? '+' : '' }}{{ concentrationBonus }}</span>
      </div>
      <div class="stat-chip" title="Ranged touch attack: BAB + DEX mod (rays, ranged touch spells)">
        <span class="stat-chip-label">Touch Atk</span>
        <span class="stat-chip-value">{{ touchAttackBonus >= 0 ? '+' : '' }}{{ touchAttackBonus }}</span>
      </div>
      <div class="dc-row">
        <span class="dc-label">Spell DCs:</span>
        <span v-for="lvl in [1,2,3,4,5,6,7,8,9]" :key="lvl" class="dc-chip">
          <span class="dc-lvl">{{ lvl }}</span>
          <span class="dc-val">{{ spellDC(lvl) }}</span>
        </span>
      </div>
    </div>

    <!-- ── Slots table ────────────────────────────────────────────── -->
    <div class="section-header">
      <h3 class="section-label">Spells per day</h3>
      <button class="btn-reset" @click="resetDay" title="New day — reset all slots and prepared spells">
        <RotateCcw :size="12" />
        New day
      </button>
    </div>

    <div class="slots-grid">
      <div v-for="lvl in [0,1,2,3,4,5,6,7,8,9]" :key="lvl" class="slot-row">
        <div class="slot-level">{{ LEVEL_NAMES[lvl] }}</div>

        <div class="slot-base">
          <label class="slot-sublabel">Base</label>
          <input
            type="number" class="slot-input no-spin"
            v-model.number="sc.slotsPerDay[lvl]" min="0" max="20" @change="save"
          />
        </div>

        <div class="slot-bonus" :class="{ 'slot-bonus--zero': bonusSlots(lvl) === 0 }">
          <label class="slot-sublabel">Bonus</label>
          <span class="slot-bonus-val">{{ bonusSlots(lvl) > 0 ? '+' + bonusSlots(lvl) : '—' }}</span>
        </div>

        <div class="slot-tracker">
          <label class="slot-sublabel">Used</label>
          <div class="dots">
            <button v-for="i in totalSlots(lvl)" :key="i"
              :class="['dot', { 'dot--used': i <= (sc.slotsUsed[lvl] ?? 0) }]"
              @click="i <= (sc.slotsUsed[lvl] ?? 0) ? recoverSlot(lvl) : useSlot(lvl)"
              :title="i <= (sc.slotsUsed[lvl] ?? 0) ? 'Recover slot' : 'Use slot'"
            />
            <span v-if="totalSlots(lvl) === 0" class="no-slots">—</span>
          </div>
        </div>

        <div class="slot-remaining" :class="{ 'remaining--empty': remaining(lvl) === 0 && totalSlots(lvl) > 0 }">
          {{ totalSlots(lvl) > 0 ? remaining(lvl) + '/' + totalSlots(lvl) : '' }}
        </div>
      </div>
    </div>

    <!-- ── Spell list ─────────────────────────────────────────────── -->
    <div class="section-header" style="margin-top: 1.75rem">
      <h3 class="section-label">Spell list</h3>
      <button class="btn-add" @click="openAddForm()">
        <Plus :size="13" /> Add spell
      </button>
    </div>

    <div v-if="showAddForm" class="add-form">
      <div class="add-form-row">
        <div class="add-field add-field--wide">
          <label>Name *</label>
          <input v-model="newSpell.name" placeholder="Magic Missile" @keydown.enter="addSpell" autofocus />
        </div>
        <div class="add-field add-field--sm">
          <label>Level</label>
          <input type="number" v-model.number="newSpell.level" min="0" max="9" />
        </div>
        <div class="add-field">
          <label>School</label>
          <select v-model="newSpell.school">
            <option v-for="s in SCHOOLS" :key="s" :value="s">{{ s || '—' }}</option>
          </select>
        </div>
      </div>
      <div class="add-form-row">
        <div class="add-field add-field--wide">
          <label>Notes</label>
          <input v-model="newSpell.notes" placeholder="Range, components, duration…" />
        </div>
        <div class="add-form-actions">
          <button class="btn-cancel" @click="showAddForm = false">Cancel</button>
          <button class="btn-confirm" @click="addSpell" :disabled="!newSpell.name.trim()">Add</button>
        </div>
      </div>
    </div>

    <template v-if="sc.spells.length > 0">
      <div v-for="lvl in [...new Set(sc.spells.map(s => s.level))].sort((a,b)=>a-b)" :key="lvl" class="level-group">
        <div class="level-group-header">
          <span class="level-group-name">{{ LEVEL_NAMES[lvl] }}</span>
          <span class="level-group-dc" v-if="lvl > 0">DC {{ spellDC(lvl) }}</span>
          <button class="btn-add-small" @click="openAddForm(lvl)" title="Add spell at this level">
            <Plus :size="11" />
          </button>
        </div>

        <div class="spell-list">
          <div v-for="sp in spellsAtLevel(lvl)" :key="sp.id" class="spell-row">
            <span class="school-dot" :style="{ background: schoolColor(sp.school) }" :title="sp.school || 'No school'" />
            <div class="spell-info">
              <span class="spell-name">{{ sp.name }}</span>
              <span v-if="sp.notes" class="spell-notes">{{ sp.notes }}</span>
            </div>
            <span v-if="sp.school" class="school-chip" :style="{ color: schoolColor(sp.school), borderColor: schoolColor(sp.school) + '44' }">
              {{ sp.school }}
            </span>
            <template v-if="sc.type === 'prepared'">
              <div class="prepared-tracker" :title="`${sp.prepared} prepared`">
                <button class="prep-btn" @click="decPrepared(sp)" :disabled="!sp.prepared">−</button>
                <span class="prep-count">{{ sp.prepared ?? 0 }}</span>
                <button class="prep-btn" @click="incPrepared(sp)">+</button>
                <span class="prep-label">prep</span>
              </div>
            </template>
            <button class="btn-remove" @click="removeSpell(sp.id)" title="Remove spell">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!showAddForm" class="empty-spells">
      <Wand2 :size="24" class="empty-icon" />
      <p>No spells added yet.</p>
      <button class="btn-add" @click="openAddForm()">
        <Plus :size="13" /> Add your first spell
      </button>
    </div>

    <div class="legend">
      <Info :size="11" />
      <span>Bonus slots auto-calculated from {{ sc.stat.toUpperCase() }} modifier (D&amp;D 3.5 SRD). Click dots to track usage. Click a used dot to recover.</span>
    </div>

  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 1rem; }

.panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
}

/* ── Class tabs ────────────────────────────────────────────────── */
.class-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  transition: all var(--transition);
}
.tab:hover { color: var(--text-primary); border-color: var(--gold-border); }
.tab.active {
  background: rgba(201,168,76,0.10);
  border-color: var(--gold-border);
  border-bottom-color: transparent;
  color: var(--gold);
  margin-bottom: -1px;
}
.tab-close {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  border-radius: 50%;
  padding: 1px;
  transition: color var(--transition);
}
.tab-close:hover { color: var(--red-light, #e87070); }
.tab-add {
  background: transparent;
  border: 1px dashed var(--border);
  color: var(--text-muted);
  padding: 0.3rem 0.5rem;
}
.tab-add:hover { border-color: var(--gold-border); color: var(--gold); }

/* ── Config bar ────────────────────────────────────────────────── */
.config-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.9rem 1rem;
}

.config-field { display: flex; flex-direction: column; gap: 0.3rem; }
.config-field--wide { flex: 1; min-width: 140px; }
.config-field--sm   { width: 70px; }

.config-field label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.config-field input, .config-field select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.42rem 0.65rem;
  outline: none;
  transition: border-color var(--transition);
}
.config-field input:focus, .config-field select:focus { border-color: var(--gold-border); }

.toggle-group { display: flex; gap: 2px; }
.toggle-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  transition: all var(--transition);
}
.toggle-btn.active {
  background: rgba(201,168,76,0.12);
  border-color: var(--gold-border);
  color: var(--gold);
}

/* ── Quick stats ───────────────────────────────────────────────── */
.quick-stats { display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem; }

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.35rem 0.75rem;
}
.stat-chip-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.stat-chip-value { font-size: 1rem; font-weight: 700; color: var(--gold); }

.dc-row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.dc-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-right: 0.2rem; }
.dc-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.45rem;
  min-width: 32px;
}
.dc-lvl { font-size: 0.58rem; color: var(--text-muted); line-height: 1; }
.dc-val { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; }

/* ── Section header ────────────────────────────────────────────── */
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0;
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-family: inherit;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-reset:hover { border-color: rgba(201,168,76,0.4); color: var(--gold); }

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(201,168,76,0.08);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.28rem 0.7rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-add:hover { background: rgba(201,168,76,0.15); }

/* ── Slots grid ────────────────────────────────────────────────── */
.slots-grid {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.slot-row {
  display: grid;
  grid-template-columns: 80px 70px 60px 1fr 48px;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}
.slot-row:last-child { border-bottom: none; }
.slot-row:hover { background: rgba(255,255,255,0.02); }

.slot-level { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }

.slot-sublabel {
  display: block;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.slot-base { display: flex; flex-direction: column; }
.slot-input {
  width: 48px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.2rem 0.4rem;
  text-align: center;
  outline: none;
}
.slot-input:focus { border-color: var(--gold-border); }

/* Quitar flechas del input numérico */
.no-spin::-webkit-inner-spin-button,
.no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.no-spin { -moz-appearance: textfield; appearance: textfield; }

.slot-bonus { display: flex; flex-direction: column; }
.slot-bonus-val { font-size: 0.85rem; font-weight: 600; color: var(--gold); }
.slot-bonus--zero .slot-bonus-val { color: var(--text-muted); font-weight: 400; }

.slot-tracker { display: flex; flex-direction: column; }
.dots { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 20px; }
.dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--gold-border);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.dot:hover { border-color: var(--gold); background: rgba(201,168,76,0.2); }
.dot--used { background: var(--gold); border-color: var(--gold); }
.dot--used:hover { background: rgba(201,168,76,0.5); }
.no-slots { font-size: 0.75rem; color: var(--text-muted); }

.slot-remaining { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); text-align: right; }
.remaining--empty { color: var(--red-light); }

/* ── Add form ──────────────────────────────────────────────────── */
.add-form {
  background: var(--bg-elevated);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.add-form-row { display: flex; gap: 0.65rem; align-items: flex-end; flex-wrap: wrap; }
.add-field { display: flex; flex-direction: column; gap: 0.3rem; }
.add-field--wide { flex: 1; min-width: 140px; }
.add-field--sm { width: 70px; }
.add-field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-weight: 600; }
.add-field input, .add-field select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.4rem 0.65rem;
  outline: none;
}
.add-field input:focus, .add-field select:focus { border-color: var(--gold-border); }

.add-form-actions { display: flex; gap: 0.5rem; align-items: flex-end; }
.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-family: inherit;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-cancel:hover { color: var(--text-primary); border-color: var(--text-muted); }
.btn-confirm {
  background: var(--gold);
  border: none;
  border-radius: var(--radius-md);
  color: #0d0b14;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  transition: opacity var(--transition);
}
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-confirm:hover:not(:disabled) { opacity: 0.85; }

/* ── Level groups ──────────────────────────────────────────────── */
.level-group { display: flex; flex-direction: column; gap: 0.3rem; }
.level-group-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px solid var(--border); }
.level-group-name { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }
.level-group-dc {
  font-size: 0.68rem;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
}
.btn-add-small {
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  margin-left: auto;
  transition: color var(--transition);
}
.btn-add-small:hover { color: var(--gold); }

/* ── Spell row ─────────────────────────────────────────────────── */
.spell-list { display: flex; flex-direction: column; }
.spell-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background var(--transition);
}
.spell-row:last-child { border-bottom: none; }
.spell-row:hover { background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); }

.school-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; opacity: 0.8; }

.spell-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.spell-name { font-size: 0.85rem; color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spell-notes { font-size: 0.72rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.school-chip {
  font-size: 0.65rem;
  font-weight: 600;
  border: 1px solid;
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* ── Prepared tracker ──────────────────────────────────────────── */
.prepared-tracker { display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }
.prep-btn {
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
  padding: 0;
  font-family: monospace;
}
.prep-btn:hover:not(:disabled) { border-color: var(--gold-border); color: var(--gold); }
.prep-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.prep-count { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); min-width: 16px; text-align: center; }
.prep-label { font-size: 0.62rem; color: var(--text-muted); }

.btn-remove {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.btn-remove:hover { color: var(--red-light); }

/* ── Empty state ───────────────────────────────────────────────── */
.empty-spells {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.empty-icon { opacity: 0.3; }
.empty-spells p { margin: 0; }

/* ── Legend ────────────────────────────────────────────────────── */
.legend {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.5;
  padding-top: 0.25rem;
  opacity: 0.7;
}
</style>
