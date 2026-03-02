<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const DEFAULT_SLOTS = [
  'Head','Headband','Eyes','Shoulders','Neck','Chest',
  'Body','Armor','Belt','Wrists','Hands','Ring L','Ring R','Feet'
]

// Asegura que todos los slots por defecto existen
function ensureSlots() {
  if (!char.value.equipment) char.value.equipment = {}
  DEFAULT_SLOTS.forEach(s => {
    if (!(s in char.value.equipment)) char.value.equipment[s] = ''
  })
}

const slots = computed(() => {
  ensureSlots()
  return Object.keys(char.value.equipment)
})

const newSlotName = ref('')

function addSlot() {
  const name = newSlotName.value.trim()
  if (!name || name in char.value.equipment) return
  char.value.equipment[name] = ''
  newSlotName.value = ''
  save()
}

function removeSlot(slot: string) {
  delete char.value.equipment[slot]
  save()
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Equipo por Ranura</h2>

    <div class="slots-grid">
      <div v-for="slot in slots" :key="slot" class="slot-row">
        <span class="slot-name">{{ slot }}</span>
        <input
          type="text"
          :value="char.equipment[slot]"
          @change="char.equipment[slot] = ($event.target as HTMLInputElement).value; save()"
          :placeholder="`Vacío`"
          class="slot-input"
        />
        <button class="btn-del" @click="removeSlot(slot)" title="Eliminar ranura">✕</button>
      </div>
    </div>

    <div class="add-slot">
      <input
        type="text"
        v-model="newSlotName"
        placeholder="Nueva ranura…"
        class="add-input"
        @keydown.enter="addSlot"
      />
      <button class="btn-outline btn-sm" @click="addSlot">+ Añadir</button>
    </div>
  </section>
</template>

<style scoped>
.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 0.75rem;
}

.slot-row {
  display: grid;
  grid-template-columns: 90px 1fr 24px;
  gap: 6px;
  align-items: center;
}

.slot-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-input {
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
.slot-input:focus { border-color: var(--gold-dim); }

.btn-del {
  background: transparent;
  border: none;
  color: transparent;
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.15rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}
.slot-row:hover .btn-del { color: var(--text-muted); }
.btn-del:hover { color: var(--red-light) !important; }

.add-slot {
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
}
.add-input:focus { border-color: var(--gold-dim); }

.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

@media (max-width: 560px) {
  .slots-grid { grid-template-columns: 1fr; }
}
</style>

