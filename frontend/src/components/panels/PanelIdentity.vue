<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

function onPortraitChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    char.value.portrait = ev.target?.result as string
    save()
  }
  reader.readAsDataURL(file)
}

const portraitInput = ref<HTMLInputElement | null>(null)
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">Identity</h2>

    <div class="identity-layout">
      <!-- Portrait -->
      <div class="portrait-col">
        <div class="portrait-wrap" @click="portraitInput?.click()" title="Change portrait">
          <img v-if="char.portrait" :src="char.portrait" :alt="`Portrait of ${char.name}`" class="portrait-img" />
          <div v-else class="portrait-placeholder">
            <span>{{ char.name.charAt(0).toUpperCase() }}</span>
            <span class="portrait-hint">Upload</span>
          </div>
        </div>
        <input ref="portraitInput" type="file" accept="image/*" class="sr-only" @change="onPortraitChange" />
      </div>

      <!-- Fields -->
      <div class="identity-fields">
        <div class="field-row">
          <div class="field field-lg">
            <label>Name</label>
            <input type="text" v-model="char.name" @input="save" placeholder="Character name" />
          </div>
          <div class="field field-sm">
            <label>Level</label>
            <input type="number" v-model.number="char.level" @change="save" min="1" max="40" />
          </div>
          <div class="field field-xp">
            <label>XP</label>
            <input type="number" v-model.number="char.xp" @change="save" min="0" placeholder="0" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Race</label>
            <input type="text" v-model="char.race" @change="save" placeholder="e.g. Elf, Human…" />
          </div>
          <div class="field">
            <label>Classes</label>
            <input type="text" v-model="char.classes" @change="save" placeholder="e.g. Fighter 5 / Wizard 3" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Alignment</label>
            <input type="text" v-model="char.alignment" @change="save" placeholder="e.g. Lawful Good" />
          </div>
          <div class="field">
            <label>Deity</label>
            <input type="text" v-model="char.deity" @change="save" placeholder="e.g. Iomedae" />
          </div>
          <div class="field field-sm">
            <label>Height</label>
            <input type="text" v-model="char.height" @change="save" placeholder="e.g. 5'10&quot;" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.identity-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

/* Retrato */
.portrait-col { flex-shrink: 0; }

.portrait-wrap {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  border: 2px solid var(--gold-border);
  background: var(--bg-elevated);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.portrait-wrap:hover { border-color: var(--gold); }

.portrait-img { width: 100%; height: 100%; object-fit: cover; }

.portrait-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: var(--gold-dim);
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
}
.portrait-hint { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

/* Campos */
.identity-fields { flex: 1; display: flex; flex-direction: column; gap: 0.6rem; }

.field-row { display: flex; gap: 0.6rem; }

.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field-sm  { flex: 0 0 80px; }
.field-xp  { flex: 0 0 100px; }
.field-lg  { flex: 2; }

.field label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.field input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.88rem;
  font-family: inherit;
  padding: 0.4rem 0.6rem;
  width: 100%;
  outline: none;
  transition: border-color var(--transition);
}
.field input:focus { border-color: var(--gold-dim); }

@media (max-width: 500px) {
  .identity-layout { flex-direction: column; }
  .portrait-wrap { width: 80px; height: 80px; }
  .field-row { flex-wrap: wrap; }
}
</style>
