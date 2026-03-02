<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { SkillEntry, AbilityScores } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const STATS = ['str','dex','con','int','wis','cha'] as const

function skillTotal(sk: SkillEntry): number {
  const statMod = mod(char.value.stats[(sk.s ?? 'int') as keyof AbilityScores] ?? 10)
  const csBonus = (sk.cs && (sk.r ?? 0) > 0) ? 3 : 0
  return statMod + (sk.r ?? 0) + (sk.m ?? 0) + csBonus
}

function addSkill() {
  char.value.skills.push({ n: 'Nueva habilidad', s: 'int', r: 0, m: 0, cs: false })
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
  return char.value.skills.filter(sk => sk.n.toLowerCase().includes(q))
})
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Habilidades</h2>
      <div class="panel-actions">
        <input v-model="filter" type="search" placeholder="Filtrar…" class="filter-input" />
        <button class="btn-outline btn-sm" @click="addSkill">+ Añadir</button>
      </div>
    </div>

    <div class="skills-table">
      <!-- Header -->
      <div class="skill-row skill-header">
        <span title="Habilidad de clase">CS</span>
        <span>Habilidad</span>
        <span>Stat</span>
        <span title="Rangos">Rng</span>
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
          title="Habilidad de clase"
        />
        <input
          type="text"
          :value="sk.n"
          @change="sk.n = ($event.target as HTMLInputElement).value; save()"
          class="skill-name"
        />
        <select
          :value="sk.s"
          @change="sk.s = ($event.target as HTMLSelectElement).value; save()"
        >
          <option v-for="s in STATS" :key="s" :value="s">{{ s.toUpperCase() }}</option>
        </select>
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
        <button class="btn-del" @click="removeSkill(char.skills.indexOf(sk))" title="Eliminar">✕</button>
      </div>

      <div v-if="char.skills.length === 0" class="empty-row">
        Sin habilidades — pulsa "+ Añadir"
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
  grid-template-columns: 28px 1fr 70px 55px 55px 55px 28px;
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

.skill-name {
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.15rem 0.1rem;
  width: 100%;
  outline: none;
  transition: border-color var(--transition);
}
.skill-name:hover { border-bottom-color: var(--border); }
.skill-name:focus { border-bottom-color: var(--gold-dim); }

select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.15rem 0.25rem;
  outline: none;
  width: 100%;
}
select:focus { border-color: var(--gold-dim); }

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

