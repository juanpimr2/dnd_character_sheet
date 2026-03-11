<script setup lang="ts">
import { ref } from 'vue'
import { X, Building2, QrCode, Download, CheckCircle } from 'lucide-vue-next'

const emit = defineEmits<{ close: [] }>()

// ── Steps: form → success ──────────────────────────────────────────
type Step = 'form' | 'success'
const step = ref<Step>('form')

// ── Form fields ───────────────────────────────────────────────────
const name        = ref('')
const city        = ref('')
const ownerName   = ref('')
const ownerEmail  = ref('')
const loading     = ref(false)
const error       = ref('')

// ── Result ────────────────────────────────────────────────────────
const result = ref<{ name: string; city: string; referral_code: string; qr_url: string } | null>(null)

async function submit() {
  error.value = ''
  if (!name.value.trim() || !city.value.trim() || !ownerEmail.value.trim()) {
    error.value = 'Please fill in all required fields'
    return
  }
  loading.value = true
  try {
    const res  = await fetch('/api/stores/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        name.value.trim(),
        city:        city.value.trim(),
        owner_name:  ownerName.value.trim() || undefined,
        owner_email: ownerEmail.value.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) { error.value = data.error; return }
    result.value = data
    step.value   = 'success'
  } catch {
    error.value = 'Connection error. Please try again.'
  } finally {
    loading.value = false
  }
}

async function downloadQR(format: 'svg' | 'png') {
  if (!result.value) return
  // Build the QR download URL — use the store's referral code
  // We fetch the QR from backend but this is a public endpoint so we need it
  // For now, open the QR via browser print or just show instructions
  const loginUrl = result.value.qr_url
  // We can't hit the admin QR endpoint without a key — just open the link
  window.open(loginUrl, '_blank')
}

function closeModal(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-backdrop')) emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="modal" role="dialog" aria-modal="true">

      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-wrap">
          <Building2 :size="18" class="modal-title-icon" />
          <h2 class="modal-title">Register your store</h2>
        </div>
        <button class="btn-close" @click="emit('close')" aria-label="Close">
          <X :size="16" />
        </button>
      </div>

      <!-- ── STEP: form ─────────────────────────────────────────── -->
      <div v-if="step === 'form'" class="modal-body">

        <p class="modal-desc">
          Join the Rollbook affiliate programme. Your customers scan your QR
          and get their free character sheet — every sign-up helps support your store.
        </p>

        <div class="fields">
          <div class="field">
            <label>Store name <span class="required">*</span></label>
            <input v-model="name" placeholder="Dragones & Dados" :disabled="loading" />
          </div>
          <div class="field">
            <label>City <span class="required">*</span></label>
            <input v-model="city" placeholder="Madrid" :disabled="loading" />
          </div>
          <div class="field">
            <label>Your name</label>
            <input v-model="ownerName" placeholder="Alex García" :disabled="loading" />
          </div>
          <div class="field">
            <label>Email <span class="required">*</span></label>
            <input v-model="ownerEmail" type="email" placeholder="store@example.com" :disabled="loading" />
          </div>
        </div>

        <p v-if="error" class="error-text" role="alert">{{ error }}</p>

        <div class="modal-footer">
          <p class="fine-print">
            Your QR will be ready immediately. We'll review your registration
            within 24 h to activate the affiliate link.
          </p>
          <button
            class="btn-primary"
            @click="submit"
            :disabled="loading || !name || !city || !ownerEmail"
          >
            <span v-if="loading" class="spinner" />
            <span v-else>Get my QR code</span>
          </button>
        </div>

      </div>

      <!-- ── STEP: success ──────────────────────────────────────── -->
      <div v-else-if="step === 'success' && result" class="modal-body modal-body--success">

        <div class="success-icon">
          <CheckCircle :size="36" />
        </div>

        <h3 class="success-title">You're in, {{ result.name }}!</h3>

        <p class="success-desc">
          Your store has been registered. We'll review your details and
          activate the affiliate link within 24 hours — we'll contact you
          at <strong>{{ ownerEmail }}</strong>.
        </p>

        <!-- Referral code -->
        <div class="code-block">
          <div class="code-label">Your referral code</div>
          <code class="code-value">{{ result.referral_code }}</code>
        </div>

        <!-- QR link -->
        <div class="qr-info">
          <QrCode :size="15" />
          <span>
            Your QR will point to:
            <strong>{{ result.qr_url }}</strong>
          </span>
        </div>

        <p class="qr-note">
          Once activated, customers who scan your QR and create an account
          will be linked to your store — and you'll earn a commission on
          any purchases they make.
        </p>

        <button class="btn-primary btn-full" @click="emit('close')">
          Got it
        </button>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 4, 10, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}

/* ── Modal ─────────────────────────────────────────────────────── */
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  animation: modal-in 0.18s ease-out;
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Header ────────────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.4rem 0;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title-icon { color: var(--gold); }

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
}
.btn-close:hover { border-color: var(--gold-border); color: var(--gold); }

/* ── Body ──────────────────────────────────────────────────────── */
.modal-body {
  padding: 1.1rem 1.4rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

/* ── Fields ────────────────────────────────────────────────────── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.required { color: var(--red-light); margin-left: 1px; }

.field input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.88rem;
  font-family: inherit;
  padding: 0.55rem 0.85rem;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.field input:focus {
  border-color: var(--gold-border);
  box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.10);
}
.field input::placeholder { color: var(--text-muted); opacity: 0.5; }
.field input:disabled { opacity: 0.4; }

/* ── Footer ────────────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.fine-print {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}

.error-text {
  font-size: 0.8rem;
  color: var(--red-light);
  margin: 0;
}

/* ── Buttons ───────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--gold);
  color: #0d0b14;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.62rem 1.2rem;
  cursor: pointer;
  transition: opacity var(--transition);
  min-height: 42px;
}
.btn-primary:hover:not(:disabled) { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-full { width: 100%; }

/* ── Success ───────────────────────────────────────────────────── */
.modal-body--success { text-align: center; }

.success-icon {
  color: var(--green-light);
  display: flex;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.success-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.success-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0;
}

.code-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
}

.code-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.code-value {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: 0.12em;
}

.qr-info {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
  text-align: left;
}
.qr-info strong { color: var(--text-secondary); word-break: break-all; }

.qr-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
  text-align: left;
}

/* ── Spinner ───────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(13, 11, 20, 0.3);
  border-top-color: #0d0b14;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
