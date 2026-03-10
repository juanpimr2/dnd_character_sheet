<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const newFeat = ref('')

function addFeat() {
  const name = newFeat.value.trim()
  if (!name) return
  char.value.feats.push(name)
  newFeat.value = ''
  save()
}

function removeFeat(i: number) {
  char.value.feats.splice(i, 1)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Feats</h2>

    <div class="feats-list" v-if="char.feats.length > 0">
      <div v-for="(feat, i) in char.feats" :key="i" class="feat-item">
        <input
          type="text"
          :value="feat"
          @change="char.feats[i] = ($event.target as HTMLInputElement).value; save()"
          class="feat-input"
        />
        <button class="btn-del" @click="removeFeat(i)" title="Remove">✕</button>
      </div>
    </div>
    <div v-else class="empty-state">No feats — add one below</div>

    <div class="add-row">
      <input
        type="text"
        v-model="newFeat"
        placeholder="Feat name…"
        class="add-input"
        @keydown.enter="addFeat"
      />
      <button class="btn-outline btn-sm" @click="addFeat">+ Add</button>
    </div>
  </section>
</template>

<style scoped>
.feats-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0.75rem;
}

.feat-item {
  display: flex;
  gap: 6px;
  align-items: center;
}

.feat-input {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.6rem;
  outline: none;
  transition: border-color var(--transition);
}
.feat-input:focus { border-color: var(--gold-dim); }

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color var(--transition);
}
.btn-del:hover { color: var(--red-light); }

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  padding: 1.5rem;
}

.add-row {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
}

.add-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  outline: none;
  transition: border-color var(--transition);
}
.add-input:focus { border-color: var(--gold-dim); }

.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
</style>

