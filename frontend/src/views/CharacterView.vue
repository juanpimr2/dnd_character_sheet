<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore }      from '@/stores/auth'
import { useCharacterStore } from '@/stores/characters'
import { ScrollText, BookOpen, Swords, Backpack, Star, BookMarked, LayoutList, Wand2, Globe } from 'lucide-vue-next'

import AppHeader          from '@/components/AppHeader.vue'
import PanelIdentity      from '@/components/panels/PanelIdentity.vue'
import PanelAbilityScores from '@/components/panels/PanelAbilityScores.vue'
import PanelCombatStats   from '@/components/panels/PanelCombatStats.vue'
import PanelSaves         from '@/components/panels/PanelSaves.vue'
import PanelSkills        from '@/components/panels/PanelSkills.vue'
import PanelAttacks       from '@/components/panels/PanelAttacks.vue'
import PanelEquipment     from '@/components/panels/PanelEquipment.vue'
import PanelInventory     from '@/components/panels/PanelInventory.vue'
import PanelAbilities     from '@/components/panels/PanelAbilities.vue'
import PanelFeats         from '@/components/panels/PanelFeats.vue'
import PanelLanguages     from '@/components/panels/PanelLanguages.vue'
import PanelSessions      from '@/components/panels/PanelSessions.vue'
import PanelBreakdowns    from '@/components/panels/PanelBreakdowns.vue'
import PanelSpells        from '@/components/panels/PanelSpells.vue'
import PanelWorld         from '@/components/panels/PanelWorld.vue'

const route      = useRoute()
const router     = useRouter()
const authStore  = useAuthStore()
const charStore  = useCharacterStore()

const characterId = computed(() => route.params.id as string)
const playerId    = computed(() => authStore.user?.id ?? '')
const char        = computed(() => charStore.activeCharacter)

type Tab = 'ficha' | 'habilidades' | 'combate' | 'equipo' | 'feats' | 'hechizos' | 'sesiones' | 'mundo' | 'desgloces'
const activeTab = ref<Tab>('ficha')

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'ficha',       label: 'Sheet',      icon: ScrollText  },
  { id: 'habilidades', label: 'Skills',     icon: BookOpen    },
  { id: 'combate',     label: 'Combat',     icon: Swords      },
  { id: 'equipo',      label: 'Equipment',  icon: Backpack    },
  { id: 'feats',       label: 'Feats',      icon: Star        },
  { id: 'hechizos',    label: 'Spells',     icon: Wand2       },
  { id: 'sesiones',    label: 'Sessions',   icon: BookMarked  },
  { id: 'mundo',       label: 'World',      icon: Globe       },
  { id: 'desgloces',   label: 'Breakdowns', icon: LayoutList  },
]

onMounted(async () => {
  await authStore.init()
  charStore.clearActive()
  await charStore.loadCharacter(characterId.value)
})

async function exportCurrent(): Promise<void> {
  const res = await fetch(`/api/export?character=${characterId.value}`, {
    headers: { Authorization: `Bearer ${authStore.getToken()}` },
  })
  if (!res.ok) { alert('Export failed'); return }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${(char.value?.name ?? characterId.value).replace(/\s+/g, '_')}_rollbook.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">

      <!-- ── Loading ── -->
      <div v-if="charStore.loading" class="state-center">
        <div class="spinner-lg" role="status" aria-label="Loading character"></div>
      </div>

      <!-- ── Error ── -->
      <div v-else-if="charStore.error" class="state-center" role="alert">
        <p class="error-text">{{ charStore.error }}</p>
        <button class="btn-outline" @click="router.push({ name: 'characters' })">← Back</button>
      </div>

      <!-- ── New character with no data ── -->
      <div v-else-if="!char" class="state-center">
        <span class="new-char-icon" aria-hidden="true">📜</span>
        <h2>New Character</h2>
        <p>ID: <code>{{ characterId }}</code></p>
        <p class="muted">Open the classic sheet to create the character, then come back here.</p>
        <div class="new-char-actions">
          <a
            :href="`http://localhost:3000?player=${playerId}&character=${characterId}`"
            target="_blank" rel="noopener"
            class="btn-primary"
          >Open classic sheet</a>
          <button class="btn-outline" @click="router.push({ name: 'characters' })">← Back</button>
        </div>
      </div>

      <!-- ── Hoja de personaje ── -->
      <template v-else>

        <!-- Barra superior: breadcrumb + nombre + estado de guardado -->
        <div class="top-bar">
          <nav class="breadcrumb" aria-label="Navigation">
            <router-link to="/characters">My Characters</router-link>
            <span aria-hidden="true">›</span>
            <span>{{ char.name }}</span>
          </nav>

          <div class="top-bar-right">
            <button class="btn-export" @click="exportCurrent" title="Export as JSON">
              ↓ Export
            </button>
            <div class="save-status" :class="{ saving: charStore.isSaving, dirty: charStore.isDirty && !charStore.isSaving }">
              <span v-if="charStore.isSaving">
                <span class="spinner-xs"></span> Saving…
              </span>
              <span v-else-if="charStore.isDirty">● Unsaved</span>
              <span v-else>✓ Saved</span>
            </div>
          </div>
        </div>

        <!-- Navigation tabs -->
        <nav class="tabs" aria-label="Character sheet sections">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="14" class="tab-icon" aria-hidden="true" />
            {{ tab.label }}
          </button>
        </nav>

        <!-- ═══════════════════════════════════
             TAB: FICHA
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'ficha'" class="tab-content">
          <PanelIdentity />
          <PanelAbilityScores @go-to-breakdowns="activeTab = 'desgloces'" />
          <PanelCombatStats />
          <PanelSaves @go-to-breakdowns="activeTab = 'desgloces'" />
          <PanelAbilities />
          <PanelLanguages />
        </div>

        <!-- ═══════════════════════════════════
             TAB: SKILLS
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'habilidades'" class="tab-content">
          <PanelSkills />
        </div>

        <!-- ═══════════════════════════════════
             TAB: COMBATE
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'combate'" class="tab-content">
          <PanelAttacks />
        </div>

        <!-- ═══════════════════════════════════
             TAB: EQUIPO
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'equipo'" class="tab-content">
          <PanelEquipment />
          <PanelInventory />
        </div>

        <!-- ═══════════════════════════════════
             TAB: FEATS
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'feats'" class="tab-content">
          <PanelFeats />
        </div>

        <!-- ═══════════════════════════════════
             TAB: HECHIZOS
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'hechizos'" class="tab-content">
          <PanelSpells />
        </div>

        <!-- ═══════════════════════════════════
             TAB: SESIONES
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'sesiones'" class="tab-content">
          <PanelSessions />
        </div>

        <!-- ═══════════════════════════════════
             TAB: MUNDO
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'mundo'" class="tab-content">
          <PanelWorld />
        </div>

        <!-- ═══════════════════════════════════
             TAB: DESGLOCES
        ═══════════════════════════════════ -->
        <div v-show="activeTab === 'desgloces'" class="tab-content">
          <PanelBreakdowns />
        </div>

      </template>

    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg-base);
}

.content {
  max-width: 980px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 3rem;
}

/* ── Estados ── */
.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 5rem 2rem;
  text-align: center;
}
.error-text { color: var(--red-light); }
.muted      { color: var(--text-muted); font-size: 0.88rem; max-width: 380px; }
.new-char-icon { font-size: 3rem; }
.new-char-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-export {
  font-size: 0.75rem;
  padding: 0.25rem 0.65rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.btn-export:hover {
  border-color: var(--gold-dim);
  color: var(--gold-light);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.breadcrumb a { color: var(--gold-dim); }
.breadcrumb a:hover { color: var(--gold); }

.save-status {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  transition: all var(--transition);
  white-space: nowrap;
}
.save-status.dirty {
  color: #c09030;
  border-color: rgba(192, 144, 48, 0.3);
}
.save-status.saving {
  color: var(--gold-dim);
  border-color: var(--gold-border);
}

.spinner-xs {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 2px solid var(--border);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 4px;
  margin-bottom: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-family: var(--font-title);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
.tab-btn:hover { color: var(--text-secondary); background: var(--bg-card); }
.tab-btn.active {
  background: var(--bg-card);
  color: var(--gold);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.tab-icon {
  flex-shrink: 0;
}

/* ── Tab content ── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .content { padding: 1rem; }
  .top-bar { flex-direction: column; align-items: flex-start; }
  .tab-btn { font-size: 0.65rem; padding: 0.4rem 0.5rem; }
}
</style>
