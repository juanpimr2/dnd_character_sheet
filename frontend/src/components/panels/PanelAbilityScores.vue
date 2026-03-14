<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useCharacterStore } from '@/stores/characters'
import { calculateApplicableBonuses } from '@/composables/useBonusCalc'
import type { AbilityScores } from '@/types/character'
import { HelpCircle } from 'lucide-vue-next'

const charStore = useCharacterStore()
const char = computed(() => charStore.activeCharacter!)

const emit = defineEmits<{ goToBreakdowns: [] }>()

function save() { charStore.scheduleAutoSave() }

function hasBreakdown(key: keyof AbilityScores): boolean {
  return (charStore.activeCharacter?.abilityBreakdowns?.[key]?.length ?? 0) > 0
}

function statValue(key: keyof AbilityScores): number {
  const character = charStore.activeCharacter!
  const bd = character.abilityBreakdowns?.[key]
  if (bd && bd.length > 0) return calculateApplicableBonuses(bd)
  return character.stats[key]
}

const mod = (s: number) => Math.floor((s - 10) / 2)
const fmt = (n: number) => (n >= 0 ? '+' : '') + n

const ABILITIES: { key: keyof AbilityScores; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'dex', label: 'Dexterity',    abbr: 'DEX' },
  { key: 'con', label: 'Constitution', abbr: 'CON' },
  { key: 'int', label: 'Intelligence', abbr: 'INT' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'cha', label: 'Charisma',     abbr: 'CHA' },
]

// Banner: show when character is fresh (all stats at 10, no breakdowns set)
const isNewCharacter = computed(() => {
  const stats = char.value.stats
  const bds   = char.value.abilityBreakdowns
  const allDefault = ABILITIES.every(ab => (stats[ab.key] ?? 10) === 10)
  const noBreakdowns = ABILITIES.every(ab => !(bds?.[ab.key]?.length))
  return allDefault && noBreakdowns
})

// Tooltip toggle
const openTooltip = ref<keyof AbilityScores | null>(null)

function toggleTooltip(key: keyof AbilityScores, e: MouseEvent) {
  e.stopPropagation()
  openTooltip.value = openTooltip.value === key ? null : key
}

function closeTooltips() { openTooltip.value = null }

onMounted(() => document.addEventListener('click', closeTooltips))
onUnmounted(() => document.removeEventListener('click', closeTooltips))
</script>

<template>
  <section v-if="char" class="panel">
    <h2 class="panel-title">Ability Scores</h2>

    <!-- New character banner -->
    <Transition name="banner">
      <div v-if="isNewCharacter" class="new-char-banner">
        <span class="banner-icon">🎲</span>
        <span class="banner-text">
          New character? Set your ability scores in
          <button class="banner-link" @click="emit('goToBreakdowns')">Breakdowns → Ability Scores</button>
          to track racial bonuses, items and level-ups automatically.
        </span>
      </div>
    </Transition>

    <div class="ability-grid">
      <div v-for="ab in ABILITIES" :key="ab.key" class="ability-box" :class="{ locked: hasBreakdown(ab.key) }" :title="ab.label">
        <div class="ab-label">{{ ab.abbr }}</div>
        <!-- Editable: no breakdown defined -->
        <input
          v-if="!hasBreakdown(ab.key)"
          type="number"
          class="ab-score-input"
          v-model.number="char.stats[ab.key]"
          @change="save"
          min="1" max="60"
        />
        <!-- Read-only: calculated from breakdown -->
        <div v-else class="ab-score-readonly">{{ statValue(ab.key) }}</div>
        <div class="ab-mod">{{ fmt(mod(statValue(ab.key))) }}</div>
        <!-- Tooltip when locked -->
        <div v-if="hasBreakdown(ab.key)" class="ab-lock-hint" @click.stop>
          <button class="ab-lock-icon" @click="toggleTooltip(ab.key, $event)" :aria-label="`View breakdown for ${ab.label}`">
            <HelpCircle :size="13" />
          </button>
          <div class="ab-tooltip" :class="{ visible: openTooltip === ab.key }">
            Calculated from your Breakdown.<br/>
            Edit it in
            <button class="tooltip-link" @click="emit('goToBreakdowns'); closeTooltips()">Breakdowns →</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Necesario para que el tooltip escape el overflow:hidden del .panel global */
section.panel { overflow: visible; }

.ability-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
}

.ability-box {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.3rem;
  text-align: center;
  transition: border-color var(--transition);
}
.ability-box:focus-within { border-color: var(--gold-dim); }
.ability-box.locked { border-color: rgba(136, 85, 208, 0.35); }

.ab-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.ab-score-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  font-family: inherit;
  padding: 0.1rem 0;
  outline: none;
  -moz-appearance: textfield;
}
.ab-score-input::-webkit-inner-spin-button,
.ab-score-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.ab-score-input:focus { border-bottom-color: var(--gold); }

.ab-mod {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--gold);
  margin-top: 0.25rem;
}

.ab-score-readonly {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
  padding: 0.1rem 0;
  border-bottom: 1px solid rgba(136, 85, 208, 0.3);
  margin-bottom: 0;
  line-height: 1.4;
}

.ab-lock-hint {
  position: absolute;
  top: 4px;
  right: 4px;
}
.ab-lock-icon {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--arcane-light);
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  transition: opacity var(--transition), color var(--transition);
}
.ab-lock-icon:hover { opacity: 1; color: var(--gold-light); }

.ab-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  right: -4px;
  background: var(--bg-elevated);
  border: 1px solid var(--arcane-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.75rem;
  font-size: 0.73rem;
  color: var(--text-secondary);
  white-space: nowrap;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  line-height: 1.6;
}
.ab-tooltip.visible { display: block; }

.tooltip-link {
  background: none;
  border: none;
  color: var(--gold-light);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition);
}
.tooltip-link:hover { color: var(--gold); }

/* ── New character banner ── */
.new-char-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(136,85,208,0.12), rgba(201,168,76,0.08));
  border: 1px solid var(--gold-border);
  border-left: 3px solid var(--gold);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.banner-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 1px;
}
.banner-text { flex: 1; }
.banner-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: var(--gold-light);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition);
}
.banner-link:hover { color: var(--gold-bright); }

.banner-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.banner-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.banner-enter-from   { opacity: 0; transform: translateY(-6px); }
.banner-leave-to     { opacity: 0; transform: translateY(-6px); }

@media (max-width: 500px) {
  .ability-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>



