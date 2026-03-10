<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

function addItem() {
  char.value.inventory.push({ n: 'Item', q: 1 })
  save()
}

function removeItem(i: number) {
  char.value.inventory.splice(i, 1)
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Inventory</h2>
      <button class="btn-outline btn-sm" @click="addItem">+ Add</button>
    </div>

    <div class="inv-table" v-if="char.inventory.length > 0">
      <div class="inv-header">
        <span>Name</span>
        <span title="Quantity">Qty</span>
        <span title="Charges">Chg</span>
        <span title="Caster Level">CL</span>
        <span title="Difficulty Class">DC</span>
        <span>Note</span>
        <span></span>
      </div>

      <div v-for="(it, i) in char.inventory" :key="i" class="inv-row">
        <input type="text"   v-model="it.n"           @change="save" placeholder="Name" />
        <input type="number" v-model.number="it.q"    @change="save" min="0" class="num" />
        <input type="number" v-model.number="it.c"    @change="save" min="0" class="num" placeholder="—" />
        <input type="number" v-model.number="it.cl"   @change="save" min="0" class="num" placeholder="—" />
        <input type="number" v-model.number="it.dc"   @change="save" min="0" class="num" placeholder="—" />
        <input type="text"   v-model="it.note"        @change="save" placeholder="Notes…" />
        <button class="btn-del" @click="removeItem(i)" title="Remove">✕</button>
      </div>
    </div>

    <div v-else class="empty-state">
      No items — press "+ Add"
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

.inv-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-x: auto;
}

.inv-header,
.inv-row {
  display: grid;
  grid-template-columns: 2fr 50px 50px 50px 50px 1.5fr 28px;
  gap: 5px;
  align-items: center;
  min-width: 560px;
}

.inv-header {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.inv-row input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.3rem 0.4rem;
  width: 100%;
  outline: none;
  transition: border-color var(--transition);
}
.inv-row input:focus { border-color: var(--gold-dim); }
.inv-row input.num { text-align: center; }

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

