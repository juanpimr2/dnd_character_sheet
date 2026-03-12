<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Settings, LogOut } from 'lucide-vue-next'

const router    = useRouter()
const authStore = useAuthStore()

async function logout(): Promise<void> {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">

      <!-- ── Marca ── -->
      <router-link to="/characters" class="brand">
        <!-- Rollbook mark — Midjourney -->
        <img src="/logo_nobg.png" alt="" class="brand-mark" aria-hidden="true" />

        <div class="brand-text">
          <span class="brand-name">Rollbook</span>
          <span class="brand-tagline">Every hero. Any world.</span>
        </div>
      </router-link>

      <!-- ── Navegación derecha ── -->
      <nav class="header-nav">

        <!-- Badge plan completo -->
        <span v-if="authStore.user?.plan === 'dm'" class="plan-tag plan-tag--dm" title="Plan Maestro DM">
          <span class="plan-tag-dot" aria-hidden="true"></span>
          DM plan
        </span>
        <span v-else-if="authStore.user?.purchased" class="plan-tag" title="Full access">
          <span class="plan-tag-dot" aria-hidden="true"></span>
          Full access
        </span>

        <!-- Usuario activo -->
        <span class="user-pill" v-if="authStore.user?.name">
          <span class="user-dot" aria-hidden="true"></span>
          {{ authStore.user.name }}
        </span>

        <!-- Ajustes -->
        <router-link to="/settings" class="btn-icon-nav" title="Settings" aria-label="Settings">
          <Settings :size="15" />
        </router-link>

        <!-- Logout -->
        <button class="btn-logout" @click="logout" aria-label="Log out">
          <LogOut :size="13" />
          <span>Log out</span>
        </button>

      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: rgba(13, 11, 20, 0.85);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(201, 168, 76, 0.08), 0 4px 24px rgba(0,0,0,0.4);
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ── Marca ── */
.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  transition: opacity var(--transition);
}
.brand:hover { opacity: 0.85; }

.brand-mark {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(201, 168, 76, 0.30));
  transition: filter var(--transition);
}
.brand:hover .brand-mark {
  filter: drop-shadow(0 0 16px rgba(201, 168, 76, 0.55));
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1;
}

.brand-name {
  font-family: var(--font-title);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(135deg, #c9a84c 0%, #e8d183 60%, #c9a84c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
}

.brand-tagline {
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  line-height: 1;
  margin-top: 2px;
  font-style: italic;
}

/* ── Nav derecha ── */
.header-nav {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.plan-tag {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--gold);
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid var(--gold-border);
  border-radius: 20px;
  padding: 0.22rem 0.65rem;
}

.plan-tag-dot {
  display: inline-block;
  width: 5px; height: 5px;
  background: var(--gold);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(201, 168, 76, 0.7);
}

.plan-tag--dm {
  color: #b07ee8;
  background: rgba(138, 92, 200, 0.1);
  border-color: rgba(138, 92, 200, 0.3);
}
.plan-tag--dm .plan-tag-dot {
  background: #b07ee8;
  box-shadow: 0 0 6px rgba(138, 92, 200, 0.7);
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.22rem 0.65rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dot {
  display: inline-block;
  width: 6px; height: 6px;
  background: var(--green-light);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px var(--green-light);
}

.btn-icon-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
  text-decoration: none;
}
.btn-icon-nav:hover {
  border-color: var(--arcane-border);
  color: var(--arcane-light);
  background: var(--arcane-subtle);
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.28rem 0.65rem;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.btn-logout:hover {
  border-color: rgba(176, 32, 64, 0.45);
  color: var(--red-light);
  background: var(--red-subtle);
}
</style>
