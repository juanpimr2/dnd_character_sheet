<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

function addAttack() {
  char.value.attacks.push({ weapon: '', bonus: '', damage: '', crit: '20/×2', type: '', notes: '' })
  save()
}

function removeAttack(i: number) {
  char.value.attacks.splice(i, 1)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Attacks</h2>
      <button class="btn-outline btn-sm" @click="addAttack">+ Add</button>
    </div>

    <div class="attacks-table" v-if="char.attacks.length > 0">
      <div class="atk-header">
        <span>Weapon</span>
        <span>Attack bonus</span>
        <span>Damage</span>
        <span>Critical</span>
        <span>Type</span>
        <span>Notes</span>
        <span></span>
      </div>

      <div v-for="(atk, i) in char.attacks" :key="i" class="atk-row">
        <input type="text" v-model="atk.weapon" @change="save" placeholder="Longsword" />
        <input type="text" v-model="atk.bonus"  @change="save" placeholder="+5/+0" />
        <input type="text" v-model="atk.damage" @change="save" placeholder="1d8+3" />
        <input type="text" v-model="atk.crit"   @change="save" placeholder="19-20/×2" />
        <input type="text" v-model="atk.type"   @change="save" placeholder="C/P/S" />
        <input type="text" v-model="atk.notes"  @change="save" placeholder="Notes…" />
        <button class="btn-del" @click="removeAttack(i)" title="Remove">✕</button>
      </div>
    </div>

    <div v-else class="empty-state">
      No attacks — press "+ Add"
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

.attacks-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-x: auto;
}

.atk-header,
.atk-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 0.8fr 0.8fr 0.6fr 1.5fr 28px;
  gap: 6px;
  align-items: center;
  min-width: 640px;
}

.atk-header {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.atk-row input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  width: 100%;
  outline: none;
  transition: border-color var(--transition);
}
.atk-row input:focus { border-color: var(--gold-dim); }

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
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

