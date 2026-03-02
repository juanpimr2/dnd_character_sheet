<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function logout(): Promise<void> {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">

      <router-link to="/characters" class="brand">
        <span class="brand-icon" aria-hidden="true">⚔️</span>
        <span class="brand-name">D&amp;D Manager</span>
      </router-link>

      <nav class="header-nav">
        <span class="user-pill">
          <span class="user-dot" aria-hidden="true"></span>
          {{ authStore.user?.name }}
        </span>
        <router-link to="/settings" class="btn-nav" title="Ajustes">⚙</router-link>
        <button class="btn-logout" @click="logout" aria-label="Cerrar sesión">
          Salir
        </button>
      </nav>

    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  /* Sutil efecto glassmorphism */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Marca */
.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  transition: color var(--transition);
  text-decoration: none;
}
.brand:hover { color: var(--gold-light); }
.brand-icon  { font-size: 1.15rem; }

/* Navegación derecha */
.header-nav {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.25rem 0.7rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
}

.user-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: var(--green-light);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--green-light);
}

.btn-nav {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  transition: all var(--transition);
  text-decoration: none;
  line-height: 1.4;
}
.btn-nav:hover {
  border-color: var(--gold-border);
  color: var(--gold);
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.78rem;
  padding: 0.28rem 0.7rem;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.btn-logout:hover {
  border-color: var(--red-light);
  color: var(--red-light);
  background: var(--red-subtle);
}
</style>
