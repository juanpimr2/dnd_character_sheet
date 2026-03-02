<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import type { AbilityScores } from '@/types/character'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const ABILITIES: { key: keyof AbilityScores; label: string; abbr: string }[] = [
  { key: 'str', label: 'Fuerza',       abbr: 'FUE' },
  { key: 'dex', label: 'Destreza',     abbr: 'DES' },
  { key: 'con', label: 'Constitución', abbr: 'CON' },
  { key: 'int', label: 'Inteligencia', abbr: 'INT' },
  { key: 'wis', label: 'Sabiduría',    abbr: 'SAB' },
  { key: 'cha', label: 'Carisma',      abbr: 'CAR' },
]
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Características</h2>
    <div class="ability-grid">
      <div v-for="ab in ABILITIES" :key="ab.key" class="ability-box" :title="ab.label">
        <div class="ab-label">{{ ab.abbr }}</div>
        <input
          type="number"
          class="ab-score-input"
          v-model.number="char.stats[ab.key]"
          @change="save"
          min="1" max="60"
        />
        <div class="ab-mod">{{ fmt(mod(char.stats[ab.key])) }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ability-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
}

.ability-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.3rem;
  text-align: center;
  transition: border-color var(--transition);
}
.ability-box:focus-within { border-color: var(--gold-dim); }

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

@media (max-width: 500px) {
  .ability-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>



