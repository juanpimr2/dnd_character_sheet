<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  feature: string        // short name: "sessions", "world map editing", etc.
  reason: string         // one line explaining what they get
  inline?: boolean       // true = compact inline banner, false = full block
}>()

const router = useRouter()
function goUpgrade() { router.push('/characters?upgrade=1') }
</script>

<template>
  <div :class="['upgrade-gate', { 'upgrade-gate--inline': inline }]">
    <div class="ug-icon">✦</div>
    <div class="ug-body">
      <span class="ug-title">{{ feature }}</span>
      <span class="ug-reason">{{ reason }}</span>
    </div>
    <button class="ug-btn" @click="goUpgrade">Unlock — €4.99</button>
  </div>
</template>

<style scoped>
.upgrade-gate {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: linear-gradient(135deg, rgba(201,168,76,0.06), rgba(136,85,208,0.06));
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--gold);
}

.upgrade-gate--inline {
  padding: 0.4rem 0.65rem;
  border-radius: var(--radius-sm);
}

.ug-icon {
  font-size: 1rem;
  color: var(--gold);
  flex-shrink: 0;
  line-height: 1;
}

.ug-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.ug-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--gold-light, var(--gold));
}

.upgrade-gate--inline .ug-title { font-size: 0.72rem; }

.ug-reason {
  font-size: 0.7rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.upgrade-gate--inline .ug-reason { display: none; }

.ug-btn {
  background: var(--gold);
  border: none;
  border-radius: var(--radius-sm);
  color: rgba(20,10,0,0.9);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--transition);
  letter-spacing: 0.02em;
}
.ug-btn:hover { background: var(--gold-bright, #e8c84a); }
</style>
