<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

function addAbility() {
  char.value.abilities.push({ n: 'New ability', d: '' })
  save()
}

function removeAbility(i: number) {
  char.value.abilities.splice(i, 1)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Class Abilities</h2>
      <button class="btn-outline btn-sm" @click="addAbility">+ Add</button>
    </div>

    <div class="abilities-list">
      <div v-for="(ab, i) in char.abilities" :key="i" class="ability-card">
        <div class="ab-top">
          <input
            type="text"
            v-model="ab.n"
            @change="save"
            placeholder="Name…"
            class="ab-name"
          />
          <button class="btn-del" @click="removeAbility(i)" title="Remove">✕</button>
        </div>
        <textarea
          v-model="ab.d"
          @change="save"
          placeholder="Ability description…"
          class="ab-desc"
          rows="3"
        ></textarea>
      </div>

      <div v-if="char.abilities.length === 0" class="empty-state">
        No class abilities — press "+ Add"
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
}
.panel-header .panel-title { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }

.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

.abilities-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ability-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ab-top {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.ab-name {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--gold-light);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.1rem 0;
  outline: none;
  transition: border-color var(--transition);
}
.ab-name:focus { border-bottom-color: var(--gold); }

.ab-desc {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.83rem;
  line-height: 1.5;
  padding: 0.4rem 0.5rem;
  width: 100%;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition);
}
.ab-desc:focus { border-color: var(--gold-dim); }

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color var(--transition);
}
.btn-del:hover { color: var(--red-light); }

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  padding: 2rem;
}
</style>

