<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { SkillEntry, AbilityScores } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const PATHFINDER_SKILLS = [
  { en: 'Acrobatics',                    es: 'Acrobacias',                  s: 'dex' },
  { en: 'Appraise',                       es: 'Tasación',                    s: 'int' },
  { en: 'Bluff',                          es: 'Engañar',                     s: 'cha' },
  { en: 'Climb',                          es: 'Trepar',                      s: 'str' },
  { en: 'Craft',                          es: 'Artesanía',                   s: 'int' },
  { en: 'Diplomacy',                      es: 'Diplomacia',                  s: 'cha' },
  { en: 'Disable Device',                 es: 'Inutilizar Mecanismo',        s: 'dex' },
  { en: 'Disguise',                       es: 'Disfrazarse',                 s: 'cha' },
  { en: 'Escape Artist',                  es: 'Escapismo',                   s: 'dex' },
  { en: 'Fly',                            es: 'Volar',                       s: 'dex' },
  { en: 'Handle Animal',                  es: 'Domar Animales',              s: 'cha' },
  { en: 'Heal',                           es: 'Curar',                       s: 'wis' },
  { en: 'Intimidate',                     es: 'Intimidar',                   s: 'cha' },
  { en: 'Knowledge (Arcana)',             es: 'Conocimiento (Arcano)',        s: 'int' },
  { en: 'Knowledge (Dungeoneering)',      es: 'Conocimiento (Mazmorras)',     s: 'int' },
  { en: 'Knowledge (Engineering)',        es: 'Conocimiento (Ingeniería)',    s: 'int' },
  { en: 'Knowledge (Geography)',          es: 'Conocimiento (Geografía)',     s: 'int' },
  { en: 'Knowledge (History)',            es: 'Conocimiento (Historia)',      s: 'int' },
  { en: 'Knowledge (Local)',              es: 'Conocimiento (Local)',         s: 'int' },
  { en: 'Knowledge (Nature)',             es: 'Conocimiento (Naturaleza)',    s: 'int' },
  { en: 'Knowledge (Nobility)',           es: 'Conocimiento (Nobleza)',       s: 'int' },
  { en: 'Knowledge (Planes)',             es: 'Conocimiento (Planos)',        s: 'int' },
  { en: 'Knowledge (Religion)',           es: 'Conocimiento (Religión)',      s: 'int' },
  { en: 'Linguistics',                    es: 'Lingüística',                 s: 'int' },
  { en: 'Perception',                     es: 'Percepción',                  s: 'wis' },
  { en: 'Perform',                        es: 'Interpretar',                 s: 'cha' },
  { en: 'Profession',                     es: 'Profesión',                   s: 'wis' },
  { en: 'Ride',                           es: 'Montar',                      s: 'dex' },
  { en: 'Sense Motive',                   es: 'Intuición',                   s: 'wis' },
  { en: 'Sleight of Hand',                es: 'Juego de Manos',              s: 'dex' },
  { en: 'Spellcraft',                     es: 'Conocimiento Mágico',         s: 'int' },
  { en: 'Stealth',                        es: 'Sigilo',                      s: 'dex' },
  { en: 'Survival',                       es: 'Supervivencia',               s: 'wis' },
  { en: 'Swim',                           es: 'Nadar',                       s: 'str' },
  { en: 'Use Magic Device',               es: 'Usar Objeto Mágico',          s: 'cha' },
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

function getSpanishName(skillName: string): string {
  const found = PATHFINDER_SKILLS.find(sk => sk.en === skillName)
  return found ? found.es : ''
}

function skillTotal(sk: SkillEntry): number {
  const statMod = mod(char.value.stats[(sk.s ?? 'int') as keyof AbilityScores] ?? 10)
  const csBonus = (sk.cs && (sk.r ?? 0) > 0) ? 3 : 0
  return statMod + (sk.r ?? 0) + (sk.m ?? 0) + csBonus
}

function addSkill() {
  char.value.skills.push({ n: 'New Skill', s: 'int', r: 0, m: 0, cs: false })
  save()
}

function removeSkill(i: number) {
  char.value.skills.splice(i, 1)
  save()
}

const filter = ref('')
const filtered = computed(() => {
  if (!filter.value) return char.value.skills
  const q = filter.value.toLowerCase()
  return char.value.skills.filter(sk =>
    sk.n.toLowerCase().includes(q) || getSpanishName(sk.n).toLowerCase().includes(q)
  )
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
      <!-- Header -->
      <div class="skill-row skill-header">
        <span title="Class Skill">CS</span>
        <span>Skill</span>
        <span>Stat</span>
        <span title="Ranks">Rnk</span>
        <span title="Misc">Misc</span>
        <span>Total</span>
        <span></span>
      </div>

      <!-- Skills -->
      <div
        v-for="(sk, idx) in filtered"
        :key="idx"
        class="skill-row"
        :class="{ 'cs-row': sk.cs }"
      >
        <input
          type="checkbox"
          :checked="sk.cs"
          @change="sk.cs = ($event.target as HTMLInputElement).checked; save()"
          title="Class Skill"
        />
        <div class="skill-name-cell">
          <span class="skill-en">{{ sk.n }}</span>
          <span v-if="getSpanishName(sk.n)" class="skill-es">{{ getSpanishName(sk.n) }}</span>
        </div>
        <div class="stat-chip" :style="{ background: STAT_COLORS[sk.s] + '33', color: STAT_COLORS[sk.s], borderColor: STAT_COLORS[sk.s] + '66' }">
          {{ sk.s.toUpperCase() }}
        </div>
        <input
          type="number"
          :value="sk.r"
          @change="sk.r = +($event.target as HTMLInputElement).value; save()"
          min="0" max="40"
          class="num-input"
        />
        <input
          type="number"
          :value="sk.m"
          @change="sk.m = +($event.target as HTMLInputElement).value; save()"
          class="num-input"
        />
        <span class="skill-total" :class="{ positive: skillTotal(sk) > 0 }">
          {{ fmt(skillTotal(sk)) }}
        </span>
        <button class="btn-del" @click="removeSkill(char.skills.indexOf(sk))" title="Remove">✕</button>
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

.skills-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-row {
  display: grid;
  grid-template-columns: 28px 1fr 52px 50px 50px 52px 28px;
  gap: 4px;
  align-items: center;
  padding: 2px 0;
}

.skill-header {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}
.skill-header span { text-align: center; }

.cs-row { background: rgba(201, 168, 76, 0.04); border-radius: 3px; }

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--gold);
  cursor: pointer;
  margin: auto;
  display: block;
}

.skill-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.1rem 0;
  min-width: 0;
}

.skill-en {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-es {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.25rem;
  border-radius: 4px;
  border: 1px solid;
  text-align: center;
  letter-spacing: 0.04em;
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

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
  display: block;
  margin: auto;
}
.btn-del:hover { color: var(--red-light); }

.empty-row {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
