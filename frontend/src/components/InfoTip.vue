<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

defineProps<{
  text?: string
  wide?: boolean
  title?: string
}>()

const open   = ref(false)
const btnRef = ref<HTMLButtonElement | null>(null)
const pos    = ref({ top: 0, left: 0 })

function show() {
  if (!btnRef.value) return
  const r = btnRef.value.getBoundingClientRect()
  // position: fixed uses viewport coords — do NOT add scrollY/scrollX
  pos.value = {
    top:  r.top - 8,
    left: r.left + r.width / 2,
  }
  open.value = true
}
function hide()   { open.value = false }
function toggle() { open.value ? hide() : show() }

function onDocClick(e: MouseEvent) {
  if (btnRef.value && !btnRef.value.contains(e.target as Node)) hide()
}

// register once on first show so we don't leak listeners
let listening = false
function ensureListener() {
  if (!listening) {
    document.addEventListener('click', onDocClick)
    listening = true
  }
}
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <span class="it-wrap">
    <button
      ref="btnRef"
      class="it-btn"
      :class="{ active: open }"
      type="button"
      aria-label="More info"
      @mouseenter="show(); ensureListener()"
      @mouseleave="hide()"
      @click.stop="toggle(); ensureListener()"
    >?</button>

    <Teleport to="body">
      <div
        v-if="open"
        class="it-popup"
        :class="{ wide }"
        :style="{
          position: 'fixed',
          top:  pos.top  + 'px',
          left: pos.left + 'px',
          transform: 'translate(-50%, -100%)',
        }"
        @mouseenter="show()"
        @mouseleave="hide()"
      >
        <strong v-if="title" class="it-title">{{ title }}</strong>
        <slot>{{ text }}</slot>
        <span class="it-arrow" />
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.it-wrap {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: 3px;
}

.it-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--text-muted);
  background: transparent;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1;
  letter-spacing: 0;        /* neutralize inherited letter-spacing from parents */
  text-transform: none;     /* neutralize inherited text-transform */
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
  padding: 0;
}
.it-btn:hover,
.it-btn.active {
  border-color: var(--gold-dim);
  color: var(--gold-light);
  background: rgba(201,168,76,0.1);
}
</style>

<!-- Popup styles must be global (not scoped) because it's teleported to <body> -->
<style>
.it-popup {
  z-index: 9999;
  width: 220px;
  background: var(--bg-elevated);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.7rem;
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.55;
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
  white-space: normal;
  pointer-events: auto;
  margin-bottom: 6px;
}
.it-popup.wide { width: 300px; }

.it-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--gold-border);
}

.it-title {
  display: block;
  color: var(--gold-light);
  font-size: 0.73rem;
  margin-bottom: 0.3rem;
  font-family: var(--font-title, serif);
  letter-spacing: 0.04em;
}
</style>
