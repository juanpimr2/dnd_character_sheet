<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characters'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

function save() { charStore.scheduleAutoSave() }

const newEvent = ref('')

function addEvent() {
  const txt = newEvent.value.trim()
  if (!txt) return
  const now = new Date()
  const t = now.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
  const id = Date.now()
  char.value.events.push({ t, txt, id })
  newEvent.value = ''
  save()
}

function removeEvent(id: number) {
  char.value.events = char.value.events.filter(e => e.id !== id)
  save()
}

// Newest first
const sortedEvents = computed(() =>
  [...char.value.events].sort((a, b) => b.id - a.id)
)
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Registro de Sesión</h2>

    <!-- Add form -->
    <div class="add-event">
      <textarea
        v-model="newEvent"
        placeholder="Describe lo que ocurrió en la sesión…"
        class="event-textarea"
        rows="3"
        @keydown.ctrl.enter="addEvent"
      ></textarea>
      <div class="add-actions">
        <span class="hint">Ctrl+Enter para guardar</span>
        <button class="btn-primary btn-sm" @click="addEvent">Añadir evento</button>
      </div>
    </div>

    <!-- Events list -->
    <div class="events-list">
      <div v-for="ev in sortedEvents" :key="ev.id" class="event-card">
        <div class="ev-header">
          <span class="ev-time">{{ ev.t }}</span>
          <button class="btn-del" @click="removeEvent(ev.id)" title="Eliminar">✕</button>
        </div>
        <p class="ev-text">{{ ev.txt }}</p>
      </div>

      <div v-if="char.events.length === 0" class="empty-state">
        Sin eventos — añade el primero arriba
      </div>
    </div>
  </section>
</template>

<style scoped>
.add-event {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.event-textarea {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.5;
  padding: 0.6rem 0.75rem;
  width: 100%;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition);
}
.event-textarea:focus { border-color: var(--gold-dim); }

.add-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hint { font-size: 0.7rem; color: var(--text-muted); }
.btn-sm { padding: 0.4rem 0.9rem; font-size: 0.82rem; }

.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.75rem;
}

.ev-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.ev-time {
  font-size: 0.7rem;
  color: var(--gold-dim);
  font-family: 'Courier New', monospace;
}

.ev-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.55;
  white-space: pre-wrap;
}

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.2rem;
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

