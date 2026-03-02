import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  username: string
  plan: 'free' | 'player' | 'dm' | 'table'
  max_characters: number
  subscription_status: string
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)

  // Promise que resuelve cuando el primer estado de auth es conocido.
  // Permite que el router guard espere sin polling.
  let _initResolve: (() => void) | null = null
  const _initialized = new Promise<void>((resolve) => { _initResolve = resolve })

  const isAuthenticated = computed(() => session.value !== null)

  const user = computed(() =>
    session.value && profile.value
      ? {
          id:            profile.value.id,
          name:          profile.value.username,
          email:         session.value.user.email ?? '',
          plan:          profile.value.plan,
          maxCharacters: profile.value.max_characters,
        }
      : null
  )

  // ── Token JWT para peticiones al backend ─────────────────────────
  function getToken(): string | null {
    return session.value?.access_token ?? null
  }

  // ── Cargar perfil desde Supabase ─────────────────────────────────
  async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, plan, max_characters, subscription_status')
      .eq('id', userId)
      .single()

    if (!error && data) profile.value = data as Profile
  }

  // ── Init: suscribe al estado de auth (OAuth callback incluido) ───
  // Llámalo UNA SOLA VEZ en el router guard o en main.ts.
  // Resuelve _initialized en cuanto el estado de auth es conocido (sin esperar
  // a fetchProfile, para no bloquear la navegación).
  let _started = false
  function init(): Promise<void> {
    if (!_started) {
      _started = true

      // getSession() lee localStorage sin ir al servidor → resuelve rápido.
      // Garantiza que el router guard no quede colgado aunque onAuthStateChange
      // tarde en disparar (ej: primera carga tras page.goto en tests).
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (_initResolve) {
          session.value = currentSession
          _initResolve()
          _initResolve = null
          if (currentSession?.user) fetchProfile(currentSession.user.id)
        }
      })

      // onAuthStateChange actualiza el estado ante cualquier cambio posterior
      // (login, logout, token refresh, OAuth callback…)
      supabase.auth.onAuthStateChange((event, newSession) => {
        session.value = newSession
        _initResolve?.()
        _initResolve = null
        if (newSession?.user) {
          fetchProfile(newSession.user.id)
          // Si hay un store ref pendiente (de QR), vincularlo silenciosamente
          if (event === 'SIGNED_IN') {
            linkPendingStoreRef(newSession.access_token)
          }
        } else {
          profile.value = null
        }
      })
    }
    return _initialized
  }

  // ── Vincular store ref pendiente (después de SIGNED_IN) ──────────
  // Completamente silencioso — el usuario no ve nada.
  async function linkPendingStoreRef(token: string): Promise<void> {
    const ref = localStorage.getItem('dnd_store_ref')
    if (!ref) return
    try {
      await fetch('/api/me/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ref }),
      })
    } catch { /* silencioso */ } finally {
      localStorage.removeItem('dnd_store_ref')
    }
  }

  // ── Login con email/contraseña ────────────────────────────────────
  async function login(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    // onAuthStateChange actualizará session y profile automáticamente
    void data
    return null
  }

  // ── Registro ──────────────────────────────────────────────────────
  async function register(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    // Si confirmación de email está desactivada, onAuthStateChange dispara SIGNED_IN
    return null
  }

  // ── Login con Google (OAuth) ──────────────────────────────────────
  async function loginWithGoogle(): Promise<string | null> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/characters`,
      },
    })
    if (error) return error.message
    // El browser redirige a Google; cuando vuelve, onAuthStateChange captura la sesión
    return null
  }

  // ── Logout ────────────────────────────────────────────────────────
  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    // onAuthStateChange disparará SIGNED_OUT y limpiará session/profile
  }

  return {
    session,
    profile,
    user,
    isAuthenticated,
    getToken,
    init,
    login,
    register,
    loginWithGoogle,
    logout,
  }
})
