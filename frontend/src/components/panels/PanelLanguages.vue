<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const newLang = ref('')

// Idiomas comunes de D&D 3.5/Pathfinder para sugerencias
const COMMON_LANGUAGES = [
  'Común', 'Élfico', 'Enano', 'Gnomo', 'Mediano', 'Semiorco',
  'Orco', 'Goblin', 'Gigante', 'Dracónico', 'Infernal', 'Abismal',
  'Celestial', 'Silvano', 'Gnoll', 'Kobold', 'Ígneo', 'Acuático',
  'Aéreo', 'Terráqueo', 'Druidico',
]

function addLanguage() {
  const lang = newLang.value.trim()
  if (!lang) return
  if (!char.value.languages.includes(lang)) {
    char.value.languages.push(lang)
    save()
  }
  newLang.value = ''
}

function removeLanguage(i: number) {
  char.value.languages.splice(i, 1)
  save()
}

function addSuggestion(lang: string) {
  if (!char.value.languages.includes(lang)) {
    char.value.languages.push(lang)
    save()
  }
}
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Idiomas</h2>

    <!-- Lista actual -->
    <div v-if="char.languages.length > 0" class="lang-list">
      <div v-for="(lang, i) in char.languages" :key="i" class="lang-tag">
        <span>{{ lang }}</span>
        <button class="btn-del" @click="removeLanguage(i)" :title="`Eliminar ${lang}`">✕</button>
      </div>
    </div>
    <div v-else class="empty-state">Sin idiomas — añade uno abajo</div>

    <!-- Añadir idioma -->
    <div class="add-row">
      <input
        type="text"
        v-model="newLang"
        placeholder="Nombre del idioma…"
        class="add-input"
        @keydown.enter="addLanguage"
        list="lang-suggestions"
      />
      <datalist id="lang-suggestions">
        <option v-for="l in COMMON_LANGUAGES" :key="l" :value="l" />
      </datalist>
      <button class="btn-outline btn-sm" @click="addLanguage">+ Añadir</button>
    </div>

    <!-- Sugerencias rápidas -->
    <div class="suggestions">
      <span class="suggestions-label">Comunes:</span>
      <button
        v-for="lang in COMMON_LANGUAGES.slice(0, 8)"
        :key="lang"
        class="suggestion-chip"
        :class="{ active: char.languages.includes(lang) }"
        @click="addSuggestion(lang)"
        :disabled="char.languages.includes(lang)"
      >{{ lang }}</button>
    </div>
  </section>
</template>

<style scoped>
.lang-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.lang-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--bg-elevated);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.2rem 0.55rem 0.2rem 0.7rem;
  font-size: 0.82rem;
  color: var(--gold-dim);
}

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.1rem;
  border-radius: 50%;
  line-height: 1;
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
  margin-bottom: 0.75rem;
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

/* Sugerencias */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.suggestions-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-right: 0.1rem;
}

.suggestion-chip {
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.suggestion-chip:hover:not(:disabled) {
  border-color: var(--gold-border);
  color: var(--gold-dim);
}
.suggestion-chip.active,
.suggestion-chip:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
