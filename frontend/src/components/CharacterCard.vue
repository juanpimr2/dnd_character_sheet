<script setup lang="ts">
import type { CharacterSummary } from '@/types/character'

defineProps<{
  character: CharacterSummary
}>()

defineEmits<{
  click: []
  delete: []
}>()

function levelTier(level: number): string {
  if (level >= 15) return 'legendary'
  if (level >= 10) return 'high'
  if (level >= 5)  return 'mid'
  return 'low'
}
</script>

<template>
  <article
    class="char-card"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <!-- Retrato -->
    <div class="portrait-wrap">
      <img
        v-if="character.portrait"
        :src="character.portrait"
        :alt="`Retrato de ${character.name}`"
        class="portrait-img"
      />
      <div v-else class="portrait-initial" aria-hidden="true">
        {{ character.name.charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- Info -->
    <div class="card-body">
      <h2 class="char-name">{{ character.name }}</h2>

      <div class="char-meta">
        <span v-if="character.race" class="meta-tag">{{ character.race }}</span>
        <span v-if="character.classes" class="meta-tag tag-classes">
          {{ character.classes }}
        </span>
      </div>

      <div class="card-footer">
        <span :class="['level-badge', `tier-${levelTier(character.level)}`]">
          Nv. {{ character.level }}
        </span>
        <span class="char-id">{{ character.id }}</span>
      </div>
    </div>

    <!-- Flecha decorativa -->
    <span class="card-arrow" aria-hidden="true">›</span>

    <!-- Botón borrar -->
    <button
      class="btn-delete"
      title="Eliminar personaje"
      aria-label="Eliminar personaje"
      @click.stop="$emit('delete')"
    >✕</button>
  </article>
</template>

<style scoped>
.char-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.1rem 1rem;
  cursor: pointer;
  transition: transform var(--transition), border-color var(--transition),
              box-shadow var(--transition);
  overflow: hidden;
  outline: none;
}

/* Resplandor dorado en hover */
.char-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--gold-subtle) 0%, transparent 55%);
  opacity: 0;
  transition: opacity var(--transition);
  pointer-events: none;
}

.char-card:hover,
.char-card:focus-visible {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card), var(--shadow-gold);
}
.char-card:hover::before,
.char-card:focus-visible::before {
  opacity: 1;
}
.char-card:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

/* ── Retrato ── */
.portrait-wrap {
  width: 62px;
  height: 62px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--gold-border);
  background: var(--bg-elevated);
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.portrait-initial {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--gold-dim);
  /* Textura sutil */
  background: radial-gradient(ellipse at center, var(--bg-elevated) 60%, var(--bg-card) 100%);
}

/* ── Cuerpo ── */
.card-body {
  flex: 1;
  min-width: 0;
  position: relative;
}

.char-name {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}

.meta-tag {
  font-size: 0.7rem;
  padding: 0.12rem 0.45rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.tag-classes {
  color: var(--gold-dim);
  border-color: var(--gold-border);
}

/* ── Footer ── */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.14rem 0.5rem;
  border-radius: 20px;
}

.tier-low       { background: rgba(90, 80, 60, 0.4);  color: #b0a070; border: 1px solid rgba(90,80,60,0.6); }
.tier-mid       { background: rgba(40, 120, 55, 0.25); color: #72c08a; border: 1px solid rgba(40,120,55,0.4); }
.tier-high      { background: var(--gold-subtle);      color: var(--gold); border: 1px solid var(--gold-border); }
.tier-legendary { background: rgba(120, 60, 160, 0.25); color: #c090e8; border: 1px solid rgba(120,60,160,0.4); }

.char-id {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

/* ── Flecha ── */
.card-arrow {
  font-size: 1.2rem;
  color: var(--text-muted);
  transition: all var(--transition);
  flex-shrink: 0;
  line-height: 1;
  position: relative;
}

.char-card:hover .card-arrow,
.char-card:focus-visible .card-arrow {
  color: var(--gold);
  transform: translateX(3px);
}

/* ── Botón borrar ── */
.btn-delete {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition), background var(--transition), color var(--transition);
  z-index: 1;
}

.char-card:hover .btn-delete,
.char-card:focus-visible .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  background: rgba(200, 60, 60, 0.18);
  color: #e06060;
}
</style>
