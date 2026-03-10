<script setup lang="ts">
import { ref } from 'vue'
import type { BonusEntry } from '@/types/character'
import { bonusTypeLabel } from '@/composables/useBonusCalc'

const props = defineProps<{
  bonuses: BonusEntry[]
  bonusTypes: string[]
  showApplies?: boolean   // para saveGeneral (fort/ref/will/All)
}>()

const emit = defineEmits<{ change: [] }>()

const newName    = ref('')
const newVal     = ref<number>(0)
const newType    = ref('')
const newApplies = ref('All')

function addBonus() {
  const n = newName.value.trim()
  if (!n) return
  const entry: BonusEntry = {
    n,
    v: newVal.value,
    t: newType.value || 'untyped',
  }
  if (props.showApplies) entry.applies = newApplies.value
  props.bonuses.push(entry)
  emit('change')
  newName.value    = ''
  newVal.value     = 0
  newType.value    = ''
  newApplies.value = 'All'
}

function remove(i: number) {
  props.bonuses.splice(i, 1)
  emit('change')
}

function toggleActive(b: BonusEntry) {
  b.active = !b.active
  emit('change')
}

const fmt = (n: number) => (n >= 0 ? '+' : '') + n
</script>

<template>
  <div class="bb">
    <!-- Entradas existentes -->
    <div v-if="bonuses.length > 0" class="bb-list">
      <div
        v-for="(b, i) in bonuses"
        :key="i"
        class="bb-item"
        :class="{ inactive: b.activable && !b.active }"
      >
        <!-- Toggle de activación -->
        <button
          v-if="b.activable"
          class="bb-toggle"
          :class="{ on: b.active }"
          @click="toggleActive(b)"
          :title="b.active ? 'Active — click to disable' : 'Inactive — click to activate'"
        >{{ b.active ? '●' : '○' }}</button>

        <!-- Nombre -->
        <input
          type="text"
          :value="b.n"
          @change="b.n = ($event.target as HTMLInputElement).value; emit('change')"
          class="bb-name"
          placeholder="Source"
        />

        <!-- Valor -->
        <span class="bb-val-display" :class="{ pos: b.v >= 0, neg: b.v < 0 }">{{ fmt(b.v) }}</span>
        <input
          type="number"
          :value="b.v"
          @change="b.v = +($event.target as HTMLInputElement).value; emit('change')"
          class="bb-val-input"
        />

        <!-- Type -->
        <select
          :value="b.t"
          @change="b.t = ($event.target as HTMLSelectElement).value; emit('change')"
          class="bb-type"
        >
          <option v-for="t in bonusTypes" :key="t" :value="t">{{ bonusTypeLabel(t) }}</option>
          <option value="untyped">Untyped</option>
        </select>

        <!-- Applies (saveGeneral only) -->
        <select
          v-if="showApplies"
          :value="b.applies ?? 'All'"
          @change="b.applies = ($event.target as HTMLSelectElement).value; emit('change')"
          class="bb-applies"
        >
          <option value="All">All</option>
          <option value="fort">Fort</option>
          <option value="ref">Ref</option>
          <option value="will">Will</option>
        </select>

        <!-- Mark as situational -->
        <button
          class="bb-act-btn"
          :title="b.activable ? 'Situational' : 'Make situational'"
          @click="b.activable = !b.activable; if (!b.activable) b.active = undefined; emit('change')"
        >{{ b.activable ? '⚡' : '⚡' }}</button>

        <button class="bb-del" @click="remove(i)" title="Remove">✕</button>
      </div>
    </div>
    <p v-else class="bb-empty">No bonuses</p>

    <!-- Add new entry -->
    <div class="bb-add">
      <input
        type="text"
        v-model="newName"
        placeholder="Bonus source…"
        class="bb-name"
        @keydown.enter="addBonus"
      />
      <input type="number" v-model.number="newVal" class="bb-val-input" title="Value" />
      <select v-model="newType" class="bb-type">
        <option value="">type…</option>
        <option v-for="t in bonusTypes" :key="t" :value="t">{{ bonusTypeLabel(t) }}</option>
        <option value="untyped">Untyped</option>
      </select>
      <select v-if="showApplies" v-model="newApplies" class="bb-applies">
        <option value="All">All</option>
        <option value="fort">Fort</option>
        <option value="ref">Ref</option>
        <option value="will">Will</option>
      </select>
      <button class="bb-add-btn btn-outline btn-sm" @click="addBonus">+ Add</button>
    </div>
  </div>
</template>

<style scoped>
.bb {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bb-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  transition: opacity var(--transition);
}
.bb-item.inactive { opacity: 0.42; }

.bb-toggle {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0 2px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.bb-toggle.on { color: var(--gold); }

.bb-name {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.2rem 0.35rem;
  outline: none;
  transition: border-color var(--transition), background var(--transition);
}
.bb-name:focus {
  background: var(--bg-input);
  border-color: var(--gold-dim);
}

.bb-val-display {
  font-size: 0.82rem;
  font-weight: 700;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}
.bb-val-display.pos { color: #72c08a; }
.bb-val-display.neg { color: #e06060; }

.bb-val-input {
  width: 48px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.18rem 0.3rem;
  outline: none;
  text-align: center;
  flex-shrink: 0;
}
.bb-val-input:focus { border-color: var(--gold-dim); }

.bb-type {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.18rem 0.3rem;
  outline: none;
  flex-shrink: 0;
  max-width: 100px;
}
.bb-type:focus { border-color: var(--gold-dim); }

.bb-applies {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.18rem 0.3rem;
  outline: none;
  flex-shrink: 0;
  width: 56px;
}
.bb-applies:focus { border-color: var(--gold-dim); }

.bb-act-btn {
  background: transparent;
  border: none;
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0 2px;
  color: var(--text-muted);
  opacity: 0.4;
  flex-shrink: 0;
  transition: opacity var(--transition);
}
.bb-act-btn:hover { opacity: 1; }

.bb-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color var(--transition);
}
.bb-del:hover { color: var(--red-light); }

.bb-empty {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.5rem;
}

/* ── Fila de añadir ── */
.bb-add {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-top: 0.3rem;
  border-top: 1px dashed var(--border);
  flex-wrap: wrap;
}

.bb-add-btn {
  padding: 0.2rem 0.55rem;
  font-size: 0.75rem;
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
