import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-load de vistas para mejor rendimiento inicial
const LoginView      = () => import('@/views/LoginView.vue')
const CharactersView = () => import('@/views/CharactersView.vue')
const CharacterView  = () => import('@/views/CharacterView.vue')
const SettingsView   = () => import('@/views/SettingsView.vue')
const AdminView      = () => import('@/views/AdminView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false, title: 'Iniciar sesión' }
    },
    {
      path: '/characters',
      name: 'characters',
      component: CharactersView,
      meta: { requiresAuth: true, title: 'Mis Personajes' }
    },
    {
      path: '/character/:id',
      name: 'character',
      component: CharacterView,
      meta: { requiresAuth: true, title: 'Hoja de Personaje' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true, title: 'Ajustes' }
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: false, title: 'Admin — Rollbook' }
    },
    {
      path: '/t/:code',
      name: 'store',
      redirect: (to) => ({ name: 'login', query: { ref: to.params.code } })
    },
    // Catch-all → login
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

// ── Navigation Guard ────────────────────────────────────────────────────────
// Usamos beforeEach async para esperar el estado inicial de auth (cubre OAuth callback).
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // init() suscribe a onAuthStateChange y espera el primer evento.
  // En navegaciones posteriores resuelve instantáneamente (promesa ya resuelta).
  await authStore.init()

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'characters' })
    return
  }

  next()
})

// Actualizar <title> con la meta de la ruta
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ?? 'Rollbook'
})

export default router
