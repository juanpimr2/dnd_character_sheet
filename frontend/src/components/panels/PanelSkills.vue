<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { SkillEntry, AbilityScores } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

const PATHFINDER_SKILLS = [
  { en: 'Acrobatics',                    s: 'dex' },
  { en: 'Appraise',                      s: 'int' },
  { en: 'Bluff',                         s: 'cha' },
  { en: 'Climb',                         s: 'str' },
  { en: 'Craft',                         s: 'int' },
  { en: 'Diplomacy',                     s: 'cha' },
  { en: 'Disable Device',                s: 'dex' },
  { en: 'Disguise',                      s: 'cha' },
  { en: 'Escape Artist',                 s: 'dex' },
  { en: 'Fly',                           s: 'dex' },
  { en: 'Handle Animal',                 s: 'cha' },
  { en: 'Heal',                          s: 'wis' },
  { en: 'Intimidate',                    s: 'cha' },
  { en: 'Knowledge (Arcana)',            s: 'int' },
  { en: 'Knowledge (Dungeoneering)',     s: 'int' },
  { en: 'Knowledge (Engineering)',       s: 'int' },
  { en: 'Knowledge (Geography)',         s: 'int' },
  { en: 'Knowledge (History)',           s: 'int' },
  { en: 'Knowledge (Local)',             s: 'int' },
  { en: 'Knowledge (Nature)',            s: 'int' },
  { en: 'Knowledge (Nobility)',          s: 'int' },
  { en: 'Knowledge (Planes)',            s: 'int' },
  { en: 'Knowledge (Religion)',          s: 'int' },
  { en: 'Linguistics',                   s: 'int' },
  { en: 'Perception',                    s: 'wis' },
  { en: 'Perform',                       s: 'cha' },
  { en: 'Profession',                    s: 'wis' },
  { en: 'Ride',                          s: 'dex' },
  { en: 'Sense Motive',                  s: 'wis' },
  { en: 'Sleight of Hand',               s: 'dex' },
  { en: 'Spellcraft',                    s: 'int' },
  { en: 'Stealth',                       s: 'dex' },
  { en: 'Survival',                      s: 'wis' },
  { en: 'Swim',                          s: 'str' },
  { en: 'Use Magic Device',              s: 'cha' },
] as const

const STAT_COLORS: Record<string, string> = {
  str: '#c95252',
  dex: '#45c070',
  con: '#e08030',
  int: '#5b8fd4',
  wis: '#9b6dc5',
  cha: '#d46fa8',
}

// Auto-populate skills if empty
onMounted(() => {
  if (char.value && char.value.skills.length === 0) {
    char.value.skills = PATHFINDER_SKILLS.map(sk => ({
      n: sk.en,
      s: sk.s,
      r: 0,
      m: 0,
      cs: false,
    }))
    save()
  }
})

function skillTotal(sk: SkillEntry): number {
  const statMod = mod(char.value.stats[(sk.s ?? 'int') as keyof AbilityScores] ?? 10)
  const csBonus = (sk.cs && (sk.r ?? 0) > 0) ? 3 : 0
  return statMod + (sk.r ?? 0) + (sk.m ?? 0) + csBonus
}

function addSkill() {
  char.value.skills.push({ n: 'New Skill', s: 'int', r: 0, m: 0, cs: false })
  save()
}


// ── Filtro ────────────────────────────────────────────────────────────────────
const filter = ref('')

// ── Ordenación ────────────────────────────────────────────────────────────────
type SortKey = 'name' | 'stat' | 'total' | 'ranks' | 'cs'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'total' ? 'desc' : 'asc'  // total: mayor primero por defecto
  }
}

function sortIndicator(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const displayedSkills = computed(() => {
  let list = [...char.value.skills]

  // Filtro
  if (filter.value) {
    const q = filter.value.toLowerCase()
    list = list.filter(sk => sk.n.toLowerCase().includes(q))
  }

  // Ordenación
  if (sortKey.value) {
    const dir = sortDir.value === 'asc' ? 1 : -1
    list.sort((a, b) => {
      switch (sortKey.value) {
        case 'name':  return dir * a.n.localeCompare(b.n)
        case 'stat':  return dir * a.s.localeCompare(b.s)
        case 'total': return dir * (skillTotal(a) - skillTotal(b))
        case 'ranks': return dir * ((a.r ?? 0) - (b.r ?? 0))
        case 'cs':    return dir * ((a.cs ? 1 : 0) - (b.cs ? 1 : 0))
        default: return 0
      }
    })
  }

  return list
})
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Skills</h2>
      <div class="panel-actions">
        <input v-model="filter" type="search" placeholder="Filter…" class="filter-input" />
        <button class="btn-outline btn-sm" @click="addSkill">+ Add</button>
      </div>
    </div>

    <div class="skills-table">
      <!-- Cabecera sortable -->
      <div class="skill-row skill-header">
        <button class="sort-btn" @click="toggleSort('cs')" title="Class Skill">
          CS{{ sortIndicator('cs') }}
        </button>
        <button class="sort-btn sort-left" @click="toggleSort('name')">
          Skill{{ sortIndicator('name') }}
        </button>
        <button class="sort-btn" @click="toggleSort('stat')">
          Stat{{ sortIndicator('stat') }}
        </button>
        <button class="sort-btn" @click="toggleSort('ranks')" title="Ranks">
          Rnk{{ sortIndicator('ranks') }}
        </button>
        <span class="col-misc" title="Misc">Misc</span>
        <button class="sort-btn" @click="toggleSort('total')">
          Total{{ sortIndicator('total') }}
        </button>
      </div>

      <!-- Filas de skills -->
      <div
        v-for="sk in displayedSkills"
        :key="sk.n + sk.s"
        class="skill-row"
        :class="{ 'cs-row': sk.cs }"
      >
        <!-- Class Skill -->
        <input
          type="checkbox"
          :checked="sk.cs"
          @change="sk.cs = ($event.target as HTMLInputElement).checked; save()"
          title="Class Skill"
        />

        <!-- Nombre editable -->
        <input
          type="text"
          :value="sk.n"
          @change="sk.n = ($event.target as HTMLInputElement).value; save()"
          class="skill-name-input"
        />

        <!-- Stat editable con color dinámico -->
        <div
          class="stat-wrap"
          :style="{
            background: (STAT_COLORS[sk.s] ?? '#888') + '22',
            borderColor: (STAT_COLORS[sk.s] ?? '#888') + '88',
          }"
          :title="`Ability: ${sk.s.toUpperCase()} (${fmt(mod(char.stats[sk.s as keyof AbilityScores] ?? 10))})`"
        >
          <select
            :value="sk.s"
            @change="sk.s = ($event.target as HTMLSelectElement).value; save()"
            class="stat-select"
            :style="{ color: STAT_COLORS[sk.s] ?? '#888' }"
          >
            <option v-for="st in STATS" :key="st" :value="st">{{ st.toUpperCase() }}</option>
          </select>
          <span class="stat-arrow" :style="{ color: STAT_COLORS[sk.s] ?? '#888' }">▾</span>
        </div>

        <!-- Ranks -->
        <input
          type="number"
          :value="sk.r"
          @change="sk.r = +($event.target as HTMLInputElement).value; save()"
          min="0" max="40"
          class="num-input"
        />

        <!-- Misc -->
        <input
          type="number"
          :value="sk.m"
          @change="sk.m = +($event.target as HTMLInputElement).value; save()"
          class="num-input"
        />

        <!-- Total -->
        <span class="skill-total" :class="{ positive: skillTotal(sk) > 0 }">
          {{ fmt(skillTotal(sk)) }}
        </span>
      </div>

      <div v-if="char.skills.length === 0" class="empty-row">
        No skills — click "+ Add"
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
}
.panel-header .panel-title { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.panel-actions { display: flex; gap: 0.5rem; align-items: center; }

.filter-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  outline: none;
  width: 140px;
}
.filter-input:focus { border-color: var(--gold-dim); }

.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

/* ── Tabla ── */
.skills-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-row {
  display: grid;
  grid-template-columns: 28px 1fr 62px 46px 46px 52px;
  gap: 4px;
  align-items: center;
  padding: 2px 0;
}

/* ── Cabecera ── */
.skill-header {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}

.sort-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  cursor: pointer;
  padding: 0.15rem 0.1rem;
  text-align: center;
  transition: color var(--transition);
  white-space: nowrap;
}
.sort-btn:hover { color: var(--gold-light); }
.sort-left { text-align: left; }

.col-misc {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  text-align: center;
}

/* ── Filas ── */
.cs-row { background: rgba(201, 168, 76, 0.04); border-radius: 3px; }

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--gold);
  cursor: pointer;
  margin: auto;
  display: block;
}

/* Nombre editable — parece texto hasta que haces focus */
.skill-name-input {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.1rem 0.25rem;
  outline: none;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color var(--transition), background var(--transition);
}
.skill-name-input:hover { border-color: var(--border); background: var(--bg-input); }
.skill-name-input:focus { border-color: var(--gold-dim); background: var(--bg-input); }

/* Stat select con color dinámico */
.stat-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 4px;
  border: 1px solid;
  overflow: hidden;
  cursor: pointer;
  transition: opacity var(--transition);
}
.stat-wrap:hover { opacity: 0.82; }

.stat-select {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  text-align-last: center;
  padding: 0.1rem 0 0.1rem 0.3rem;
  cursor: pointer;
  outline: none;
  flex: 1;
  min-width: 0;
}
.stat-select option {
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 0.8rem;
}

.stat-arrow {
  font-size: 0.58rem;
  padding-right: 3px;
  pointer-events: none;
  flex-shrink: 0;
  line-height: 1;
  opacity: 0.9;
}

.num-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.15rem;
  text-align: center;
  width: 100%;
  outline: none;
  -moz-appearance: textfield;
}
.num-input::-webkit-inner-spin-button,
.num-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.num-input:focus { border-color: var(--gold-dim); }

.skill-total {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
}
.skill-total.positive { color: var(--gold); }


.empty-row {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
