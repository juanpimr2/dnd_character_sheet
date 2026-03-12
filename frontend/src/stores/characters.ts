import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { AbilityScores, Character, CharacterSummary } from '@/types/character'

export const useCharacterStore = defineStore('characters', () => {
  const characters = ref<CharacterSummary[]>([])
  const activeCharacter = ref<Character | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const currentCharacterId = ref('')
  let _saveTimer: ReturnType<typeof setTimeout> | null = null

  // â”€â”€ Helper: petición autenticada â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const authStore = useAuthStore()
    const token = authStore.getToken()
    return fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
  }

  // â”€â”€ Listar personajes del usuario autenticado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function fetchCharacters(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await authFetch('/api/characters')
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      characters.value = await res.json() as CharacterSummary[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
      characters.value = []
    } finally {
      loading.value = false
    }
  }

  // â”€â”€ Cargar personaje completo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function loadCharacter(characterId: string): Promise<void> {
    currentCharacterId.value = characterId
    loading.value = true
    error.value = null
    isDirty.value = false
    try {
      const res = await authFetch(`/api/load?character=${encodeURIComponent(characterId)}`)
      if (res.status === 404) { activeCharacter.value = null; return }
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const raw = await res.json() as Partial<Character> & Record<string, unknown>
      // Normalizar: garantizar que stats siempre existe (datos legacy o parciales)
      const stats = (raw.stats as Partial<AbilityScores> | undefined) ?? {}
      activeCharacter.value = {
        name: '', race: '', classes: '', level: 1, alignment: '', deity: '',
        height: '', portrait: null, maxHP: 0, damage: 0, nonLethal: 0, tempHP: 0,
        ac: 10, acStat: 'dex', dr: '', sr: 0, bab: 0, speed: 30,
        init: { bonus: 0, stat: 'dex' },
        saves: {
          fort: { base: 0, stat: 'con', total: 0 },
          ref:  { base: 0, stat: 'dex', total: 0 },
          will: { base: 0, stat: 'wis', total: 0 },
        },
        bonuses: { ac: [], fort: [], ref: [], will: [], attack: [] },
        attacks: [], equipment: {}, skills: [], languages: [],
        inventory: [], abilities: [], feats: [], events: [], sessions: [], customBreakdowns: [],
        ...raw,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...stats },
      } as Character
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar'
      activeCharacter.value = null
    } finally {
      loading.value = false
    }
  }

  // â”€â”€ Guardar personaje â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function saveCharacter(characterId: string): Promise<void> {
    if (!activeCharacter.value) return
    try {
      await authFetch(
        `/api/save?character=${encodeURIComponent(characterId)}`,
        { method: 'POST', body: JSON.stringify(activeCharacter.value) }
      )
    } catch (e) {
      console.error('Error guardando personaje:', e)
    }
  }

  // â”€â”€ Eliminar personaje â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function deleteCharacter(characterId: string): Promise<void> {
    try {
      await authFetch(`/api/characters/${encodeURIComponent(characterId)}`, { method: 'DELETE' })
      characters.value = characters.value.filter(c => c.id !== characterId)
    } catch (e) {
      console.error('Error eliminando personaje:', e)
    }
  }

  // â”€â”€ Auto-save con debounce 1.2s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function scheduleAutoSave(): void {
    isDirty.value = true
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(async () => {
      if (!currentCharacterId.value) return
      isSaving.value = true
      await saveCharacter(currentCharacterId.value)
      isSaving.value = false
      isDirty.value = false
    }, 1200)
  }


  //  Crear personaje nuevo con datos iniciales 
  async function createCharacter(characterId: string, name: string): Promise<string | null> {
    const initial = {
      name,
      race: '', classes: '', level: 1, alignment: '', deity: '', height: '', portrait: null,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      maxHP: 0, damage: 0, nonLethal: 0, tempHP: 0,
      ac: 10, acStat: 'dex', dr: '', sr: 0,
      bab: 0, speed: 30,
      init: { bonus: 0, stat: 'dex' },
      saves: {
        fort: { base: 0, stat: 'con', total: 0 },
        ref:  { base: 0, stat: 'dex', total: 0 },
        will: { base: 0, stat: 'wis', total: 0 },
      },
      bonuses: { ac: [], fort: [], ref: [], will: [], attack: [] },
      attacks: [], equipment: {}, skills: [], languages: [],
      inventory: [], abilities: [], feats: [], events: [], sessions: [], customBreakdowns: [],
    }
    try {
      const res = await authFetch(
        `/api/save?character=${encodeURIComponent(characterId)}`,
        { method: 'POST', body: JSON.stringify(initial) }
      )
      if (!res.ok) return `Error ${res.status}`
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Error creando personaje'
    }
  }
  function clearActive(): void {
    activeCharacter.value = null
    error.value = null
    isDirty.value = false
    if (_saveTimer) clearTimeout(_saveTimer)
  }

  return {
    characters,
    activeCharacter,
    loading,
    error,
    isDirty,
    isSaving,
    currentCharacterId,
    fetchCharacters,
    createCharacter,
    loadCharacter,
    saveCharacter,
    deleteCharacter,
    scheduleAutoSave,
    clearActive,
  }
})

