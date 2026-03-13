require('dotenv').config({ path: __dirname + '/.env' })
const express    = require('express')
const path       = require('path')
const QRCode     = require('qrcode')
const { createClient } = require('@supabase/supabase-js')
const Stripe     = require('stripe')
const Anthropic  = require('@anthropic-ai/sdk')

// ── Validar variables de entorno ─────────────────────────────────────────
const {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  PORT = 3000, ALLOWED_ORIGIN = '*',
  ADMIN_SECRET, APP_URL = 'http://localhost:5173',
  STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PRICE_ID_DM, STRIPE_PRICE_ID_SLOTS, STRIPE_WEBHOOK_SECRET,
  ANTHROPIC_API_KEY,
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
if (!ADMIN_SECRET) {
  console.warn('⚠  ADMIN_SECRET no definido — rutas /api/admin desactivadas')
}
if (!STRIPE_SECRET_KEY) {
  console.warn('⚠  STRIPE_SECRET_KEY no definido — pagos desactivados')
}

// ── Cliente Supabase con service_role (bypassa RLS) ──────────────────────
//    Solo se usa en el backend. NUNCA exponer esta clave en el frontend.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Stripe ────────────────────────────────────────────────────────────────
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

// ── Anthropic ────────────────────────────────────────────────────────────
const anthropic = ANTHROPIC_API_KEY ? new Anthropic.default({ apiKey: ANTHROPIC_API_KEY }) : null
if (!ANTHROPIC_API_KEY) console.warn('⚠  ANTHROPIC_API_KEY no definido — World Lore desactivado')

// ── Express ───────────────────────────────────────────────────────────────
const app = express()

// Raw body para webhook de Stripe — DEBE ir ANTES de express.json()
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }))

// Límite alto para portraits (base64 ~1.5MB → JSON ~2MB)
app.use(express.json({ limit: '8mb' }))

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ── Middleware: JWT de Supabase  O  API Token de usuario ─────────────────
// Acepta:
//   Authorization: Bearer <supabase_jwt>        ← sesión browser
//   Authorization: Bearer <api_token_uuid>      ← integraciones externas
async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sin autenticación' })
  }
  const token = header.slice(7)

  // 1️⃣  Intentar como JWT de Supabase (path habitual)
  const { data, error } = await supabase.auth.getUser(token)
  if (!error && data.user) {
    req.user = data.user
    req.authMethod = 'jwt'
    return next()
  }

  // 2️⃣  Intentar como API token UUID almacenado en profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('api_token', token)
    .single()

  if (profileError || !profile) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  req.user = { id: profile.id }
  req.authMethod = 'api_token'
  next()
}

// ══════════════════════════════════════════════════════════════════
//  RUTAS API
// ══════════════════════════════════════════════════════════════════

// ── Listar personajes del usuario ─────────────────────────────────
app.get('/api/characters', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, data')
    .eq('owner_id', req.user.id)
    .order('updated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Devolver resumen (evitar mandar todo el JSON de cada personaje)
  const summaries = (data ?? []).map(row => ({
    id:      row.id,
    name:    row.name || row.data?.name || 'Sin nombre',
    race:    row.data?.race    ?? '',
    classes: row.data?.classes ?? '',
    level:   row.data?.level   ?? 1,
    portrait: row.data?.portrait ?? null,
  }))

  res.json(summaries)
})

// ── Cargar personaje completo ─────────────────────────────────────
app.get('/api/load', requireAuth, async (req, res) => {
  const characterId = req.query.character ?? 'default'

  const { data, error } = await supabase
    .from('characters')
    .select('data')
    .eq('id', characterId)
    .eq('owner_id', req.user.id)
    .single()

  if (!data) return res.status(404).json({ error: 'Personaje no encontrado' })
  if (error) return res.status(500).json({ error: error.message })

  res.json(data.data)
})

// ── Guardar / actualizar personaje ───────────────────────────────
app.post('/api/save', requireAuth, async (req, res) => {
  const characterId = req.query.character ?? 'default'
  const body = req.body

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Body inválido' })
  }

  const { error } = await supabase
    .from('characters')
    .upsert({
      id:       characterId,
      owner_id: req.user.id,
      name:     body.name || characterId,
      data:     body,
    }, {
      onConflict: 'id,owner_id'
    })

  if (error) return res.status(500).json({ error: error.message })

  console.log(`✓ Guardado: ${req.user.id.slice(0, 8)}…/${characterId}`)
  res.json({ success: true })
})

// ── Eliminar personaje ────────────────────────────────────────────
app.delete('/api/characters/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── Exportar personaje (descarga JSON) ───────────────────────────
app.get('/api/export', requireAuth, async (req, res) => {
  const characterId = req.query.character ?? 'default'

  const { data, error } = await supabase
    .from('characters')
    .select('data')
    .eq('id', characterId)
    .eq('owner_id', req.user.id)
    .single()

  if (!data) return res.status(404).json({ error: 'No encontrado' })
  if (error) return res.status(500).json({ error: error.message })

  res.setHeader('Content-Disposition',
    `attachment; filename="${characterId}_${Date.now()}.json"`)
  res.json(data.data)
})

// ── Importar personaje ────────────────────────────────────────────
app.post('/api/import', requireAuth, async (req, res) => {
  const characterId = req.query.character ?? 'default'
  const body = req.body

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'JSON inválido' })
  }

  const { error } = await supabase
    .from('characters')
    .upsert({
      id:       characterId,
      owner_id: req.user.id,
      name:     body.name || characterId,
      data:     body,
    }, {
      onConflict: 'id,owner_id'
    })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── Perfil del usuario autenticado ───────────────────────────────
app.get('/api/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, plan, purchased, extra_characters')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Perfil propio + api_token (enmascarado) ───────────────────────
app.get('/api/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, plan, api_token, purchased, extra_characters, purchased_at')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Enmascarar el token: mostrar solo los primeros 8 chars + "..."
  const masked = data.api_token
    ? data.api_token.slice(0, 8) + '...'
    : null

  res.json({ ...data, api_token: masked })
})

// ── Regenerar API token ───────────────────────────────────────────
// Genera un nuevo UUID, lo guarda y lo devuelve UNA SOLA VEZ en claro.
// El cliente debe guardarlo — futuras llamadas a /api/me solo devuelven enmascarado.
app.post('/api/me/token', requireAuth, async (req, res) => {
  const newToken = require('crypto').randomUUID()

  const { error } = await supabase
    .from('profiles')
    .update({ api_token: newToken })
    .eq('id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })

  console.log(`🔑 API token regenerado: ${req.user.id.slice(0, 8)}…`)
  res.json({ api_token: newToken })
})

// ══════════════════════════════════════════════════════════════════
//  STRIPE PAGOS
// ══════════════════════════════════════════════════════════════════

// ── Crear sesión de Stripe Checkout ───────────────────────────────
app.post('/api/checkout', requireAuth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Pagos no configurados' })
  }

  const { data: userAuth, error: userError } =
    await supabase.auth.admin.getUserById(req.user.id)
  if (userError || !userAuth.user) {
    return res.status(500).json({ error: 'No se pudo obtener el usuario' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: req.user.id,
    customer_email: userAuth.user.email,
    success_url: `${APP_URL}/characters?payment=success`,
    cancel_url:  `${APP_URL}/characters`,
  })

  res.json({ url: session.url })
})

// ── Crear sesión de Stripe Checkout — Plan Maestro DM ─────────────
app.post('/api/checkout/dm', requireAuth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID_DM) {
    return res.status(503).json({ error: 'DM plan not configured' })
  }

  const { data: userAuth, error: userError } =
    await supabase.auth.admin.getUserById(req.user.id)
  if (userError || !userAuth.user) {
    return res.status(500).json({ error: 'Could not get user' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: STRIPE_PRICE_ID_DM, quantity: 1 }],
    client_reference_id: req.user.id,
    customer_email: userAuth.user.email,
    metadata: { plan: 'dm' },
    success_url: `${APP_URL}/characters?payment=success`,
    cancel_url:  `${APP_URL}/characters`,
  })

  res.json({ url: session.url })
})

// ── Crear sesión de Stripe Checkout — Pack +5 slots ───────────────
app.post('/api/checkout/slots', requireAuth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID_SLOTS) {
    return res.status(503).json({ error: 'Slots pack not configured' })
  }

  const { data: userAuth, error: userError } =
    await supabase.auth.admin.getUserById(req.user.id)
  if (userError || !userAuth.user) {
    return res.status(500).json({ error: 'Could not get user' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: STRIPE_PRICE_ID_SLOTS, quantity: 1 }],
    client_reference_id: req.user.id,
    customer_email: userAuth.user.email,
    metadata: { plan: 'slots' },
    success_url: `${APP_URL}/characters?payment=success`,
    cancel_url:  `${APP_URL}/characters`,
  })

  res.json({ url: session.url })
})

// ── Webhook de Stripe (raw body, sin auth) ────────────────────────
app.post('/api/webhook/stripe', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook no configurado' })
  }

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.client_reference_id
    const plan    = session.metadata?.plan  // 'dm' or undefined (full access)

    if (userId) {
      let error, label

      if (plan === 'slots') {
        // Pack +5 slots: incrementar extra_characters
        const { data: current } = await supabase
          .from('profiles')
          .select('extra_characters')
          .eq('id', userId)
          .single()

        const newTotal = (current?.extra_characters ?? 0) + 5;
        ({ error } = await supabase
          .from('profiles')
          .update({ extra_characters: newTotal, purchased: true })
          .eq('id', userId))
        label = `Pack +5 slots (total: ${newTotal} extra)`
      } else {
        const updates = {
          purchased:             true,
          purchased_at:          new Date().toISOString(),
          stripe_payment_intent: session.payment_intent,
        }
        if (plan === 'dm') updates.plan = 'dm';
        ({ error } = await supabase.from('profiles').update(updates).eq('id', userId))
        label = plan === 'dm' ? 'Plan Maestro DM' : 'Full access'
      }

      if (error) {
        console.error('Stripe webhook — DB update error:', error.message)
      } else {
        console.log(`✅ ${label} confirmed: ${userId.slice(0, 8)}…`)
      }
    }
  }

  res.json({ received: true })
})

// ══════════════════════════════════════════════════════════════════
//  SISTEMA DE TIENDAS AFILIADAS
// ══════════════════════════════════════════════════════════════════

// ── Middleware admin (X-Admin-Key header) ─────────────────────────
function requireAdmin(req, res, next) {
  if (!ADMIN_SECRET) return res.status(503).json({ error: 'Admin no configurado' })
  const key = req.headers['x-admin-key']
  if (key !== ADMIN_SECRET) return res.status(403).json({ error: 'Acceso denegado' })
  next()
}

// Generar código de referido único (6 chars alfanuméricos legibles)
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ── Admin: listar tiendas con conteo de registros ─────────────────
app.get('/api/admin/stores', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('store_daily_registrations')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Admin: crear tienda ────────────────────────────────────────────
app.post('/api/admin/stores', requireAdmin, async (req, res) => {
  const { name, city, owner_email, commission_rate, notes } = req.body
  if (!name || !city || !owner_email) {
    return res.status(400).json({ error: 'name, city y owner_email son obligatorios' })
  }

  // Generar código único (reintenta si hay colisión)
  let referral_code, attempts = 0
  while (attempts < 10) {
    referral_code = generateReferralCode()
    const { data: exists } = await supabase
      .from('stores').select('id').eq('referral_code', referral_code).single()
    if (!exists) break
    attempts++
  }

  const { data, error } = await supabase
    .from('stores')
    .insert({ name, city, owner_email, referral_code, commission_rate, notes })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const storeUrl = `${APP_URL}/login?ref=${data.referral_code}`
  console.log(`🏪 Tienda creada: ${name} (${city}) → ${referral_code}`)
  res.status(201).json({ ...data, qr_url: storeUrl })
})

// ── Admin: activar / desactivar tienda ────────────────────────────
app.patch('/api/admin/stores/:id', requireAdmin, async (req, res) => {
  const { active, commission_rate, notes } = req.body
  const update = {}
  if (active !== undefined)           update.active           = active
  if (commission_rate !== undefined)  update.commission_rate  = commission_rate
  if (notes !== undefined)            update.notes            = notes

  const { data, error } = await supabase
    .from('stores').update(update).eq('id', req.params.id).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Admin: estadísticas diarias de registros ──────────────────────
app.get('/api/admin/stores/stats', requireAdmin, async (req, res) => {
  const { date } = req.query   // YYYY-MM-DD, opcional
  let query = supabase.from('store_daily_registrations').select('*')
  if (date) query = query.eq('registration_date', date)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Admin: lista limpia de tiendas con total de registros ─────────
app.get('/api/admin/stores/list', requireAdmin, async (req, res) => {
  const [{ data: stores, error }, { data: statsRows }] = await Promise.all([
    supabase.from('stores').select('*').order('created_at', { ascending: false }),
    supabase.from('store_daily_registrations').select('store_id, registrations'),
  ])
  if (error) return res.status(500).json({ error: error.message })

  const totals = {}
  for (const row of statsRows ?? []) {
    totals[row.store_id] = (totals[row.store_id] ?? 0) + Number(row.registrations)
  }

  res.json((stores ?? []).map(s => ({ ...s, total_registrations: totals[s.id] ?? 0 })))
})

// ── Admin: overview stats ─────────────────────────────────────────
app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const [
    { count: totalUsers },
    { data: todayStats },
    { count: activeStores },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('store_daily_registrations').select('store_name, registrations').eq('registration_date', today),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('active', true),
  ])

  const registrationsToday = (todayStats ?? []).reduce((acc, r) => acc + Number(r.registrations), 0)
  const topStore = (todayStats ?? []).sort((a, b) => Number(b.registrations) - Number(a.registrations))[0] ?? null

  res.json({ totalUsers, registrationsToday, activeStores, topStoreToday: topStore })
})

// ── Admin: QR de una tienda (SVG) ─────────────────────────────────
app.get('/api/admin/stores/:id/qr', requireAdmin, async (req, res) => {
  const { data: store, error } = await supabase
    .from('stores').select('referral_code, name').eq('id', req.params.id).single()

  if (error || !store) return res.status(404).json({ error: 'Tienda no encontrada' })

  const url = `${APP_URL}/login?ref=${store.referral_code}`
  const format = req.query.format === 'png' ? 'png' : 'svg'

  if (format === 'png') {
    const buffer = await QRCode.toBuffer(url, { width: 400, margin: 2 })
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="qr-${store.referral_code}.png"`)
    return res.send(buffer)
  }

  const svg = await QRCode.toString(url, { type: 'svg', margin: 2 })
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Content-Disposition', `attachment; filename="qr-${store.referral_code}.svg"`)
  res.send(svg)
})

// ── Usuario: vincular store ref al perfil (silencioso, post-login) ─
app.post('/api/me/store', requireAuth, async (req, res) => {
  const { ref } = req.body
  if (!ref) return res.status(400).json({ error: 'ref es obligatorio' })

  // Verificar que el perfil aún no tiene tienda asignada
  const { data: profile } = await supabase
    .from('profiles').select('store_id').eq('id', req.user.id).single()

  if (profile?.store_id) {
    return res.json({ ok: true, message: 'Ya vinculado' })  // idempotente
  }

  // Buscar la tienda por código
  const { data: store, error: storeErr } = await supabase
    .from('stores').select('id').eq('referral_code', ref).eq('active', true).single()

  if (storeErr || !store) {
    return res.status(404).json({ error: 'Código de tienda no válido' })
  }

  // Vincular
  const { error } = await supabase
    .from('profiles')
    .update({ store_id: store.id, store_linked_at: new Date().toISOString() })
    .eq('id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })

  console.log(`🏪 Usuario ${req.user.id.slice(0, 8)}… vinculado a tienda ${ref}`)
  res.json({ ok: true })
})

// ── Público: registro de tienda self-service ──────────────────────
app.post('/api/stores/register', async (req, res) => {
  const { name, city, owner_name, owner_email } = req.body
  if (!name || !city || !owner_email) {
    return res.status(400).json({ error: 'name, city y owner_email son obligatorios' })
  }

  // Verificar que no hay otra tienda con ese email ya registrada
  const { data: existing } = await supabase
    .from('stores').select('id').eq('owner_email', owner_email).single()
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una tienda registrada con ese email' })
  }

  let referral_code, attempts = 0
  while (attempts < 10) {
    referral_code = generateReferralCode()
    const { data: taken } = await supabase
      .from('stores').select('id').eq('referral_code', referral_code).single()
    if (!taken) break
    attempts++
  }

  const notes = `Self-registered${owner_name ? ` — ${owner_name}` : ''} — pending approval`

  const { data, error } = await supabase
    .from('stores')
    .insert({ name, city, owner_email, referral_code, active: false, notes })
    .select('id, name, city, referral_code')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  console.log(`🏪 Tienda self-registered (pendiente): ${name} (${city}) → ${referral_code}`)
  res.status(201).json({ ...data, qr_url: `${APP_URL}/t/${data.referral_code}` })
})

// ── Público: info de tienda por código (para landing /t/:code) ───
app.get('/api/stores/:code', async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('name, city, referral_code')
    .eq('referral_code', req.params.code.toUpperCase())
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Tienda no encontrada' })
  res.json(data)
})

// ══════════════════════════════════════════════════════════════════
//  WORLD LORE — AI entity extraction
// ══════════════════════════════════════════════════════════════════

const LORE_COOLDOWN_MS = 15 * 60 * 1000  // 15 minutes for manual trigger

// Normalize a name for duplicate detection
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9áéíóúàèìòùñü]/g, '').trim()
}

// Merge newly extracted entities into existing world lore
function mergeEntities(existing = [], incoming = [], sessionId) {
  const result = existing.map(e => ({ ...e, flags: e.flags || [] }))

  for (const newEnt of incoming) {
    const newNorm = normalizeName(newEnt.name)
    const match = result.find(e => normalizeName(e.name) === newNorm)

    if (match) {
      // Update description if new one is longer/richer
      if (newEnt.description && newEnt.description.length > (match.description?.length ?? 0)) {
        match.description = newEnt.description
      }
      // Add session reference if not already there
      if (sessionId != null && !match.sessions.includes(sessionId)) {
        match.sessions.push(sessionId)
      }
    } else {
      // New entity — assign next ID and default position
      const maxId = result.reduce((m, e) => Math.max(m, e.id ?? 0), 0)
      result.push({
        id: maxId + 1,
        name: newEnt.name,
        kind: newEnt.kind ?? 'location',
        description: newEnt.description ?? '',
        sessions: sessionId != null ? [sessionId] : [],
        x: 20 + Math.random() * 60,  // spread across canvas
        y: 20 + Math.random() * 60,
        flags: [],
      })
    }
  }

  return result
}

// POST /api/characters/:id/extract-lore
// body: { sessionId?: number, manual?: boolean }
//   - sessionId: if given, only analyze that session's notes
//   - manual: if true, enforce cooldown
app.post('/api/characters/:id/extract-lore', requireAuth, async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: 'World Lore no configurado (falta ANTHROPIC_API_KEY)' })

  const characterId = req.params.id
  const { sessionId, manual = false } = req.body

  // Load character
  const { data: row, error: loadErr } = await supabase
    .from('characters')
    .select('data')
    .eq('id', characterId)
    .eq('owner_id', req.user.id)
    .single()

  if (loadErr || !row) return res.status(404).json({ error: 'Personaje no encontrado' })

  const charData = row.data
  const worldLore = charData.worldLore ?? { entities: [] }

  // Cooldown check (only for manual trigger)
  if (manual && worldLore.lastManualAnalysis) {
    const elapsed = Date.now() - new Date(worldLore.lastManualAnalysis).getTime()
    if (elapsed < LORE_COOLDOWN_MS) {
      const remaining = Math.ceil((LORE_COOLDOWN_MS - elapsed) / 1000)
      return res.status(429).json({ error: 'cooldown', remaining })
    }
  }

  // Build notes text to analyze
  const sessions = charData.sessions ?? []
  let targetSessions = sessions
  if (sessionId != null) {
    targetSessions = sessions.filter(s => s.id === sessionId)
  }

  const notesText = targetSessions
    .map(s => {
      const entries = (s.entries ?? []).map(e => e.txt).join('\n')
      return `[Session ${s.id} — ${s.name}]\n${entries}`
    })
    .join('\n\n')
    .trim()

  if (!notesText) {
    return res.status(400).json({ error: 'No hay notas para analizar' })
  }

  // Prompt to Claude Haiku
  const prompt = `You are an expert D&D lore extractor. Analyze these session notes and extract all notable entities.

Return ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  { "name": "Entity Name", "kind": "city|location|npc|faction", "description": "brief 1-2 sentence description" }
]

Rules:
- kind "city": cities, towns, villages, castles, kingdoms
- kind "location": dungeons, forests, taverns, ruins, rivers, mountains, specific places
- kind "npc": named characters (NPCs, not the player character)
- kind "faction": guilds, armies, religions, organizations
- Only include entities clearly mentioned in the notes
- Use the original name as written in the notes
- Descriptions should be factual (what was learned in the session)

Session notes:
${notesText}`

  let extracted = []
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0]?.text ?? '[]'
    // Strip potential markdown code blocks
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    extracted = JSON.parse(clean)
    if (!Array.isArray(extracted)) extracted = []
  } catch (err) {
    console.error('Anthropic error:', err.message)
    return res.status(500).json({ error: 'Error al analizar con IA' })
  }

  // Merge into existing lore
  const now = new Date().toISOString()
  const mergedEntities = mergeEntities(worldLore.entities, extracted, sessionId ?? null)
  const updatedLore = {
    entities: mergedEntities,
    lastAnalysis: now,
    ...(manual ? { lastManualAnalysis: now } : {}),
  }

  // Save back
  charData.worldLore = updatedLore
  const { error: saveErr } = await supabase
    .from('characters')
    .update({ data: charData })
    .eq('id', characterId)
    .eq('owner_id', req.user.id)

  if (saveErr) return res.status(500).json({ error: saveErr.message })

  console.log(`🗺  Lore extracted: ${extracted.length} entities for ${characterId}`)
  res.json({ worldLore: updatedLore, extracted: extracted.length })
})

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── Producción: servir frontend Vue compilado ─────────────────────
// En desarrollo el proxy de Vite maneja el frontend — aquí solo entra en prod.
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_DIST))
  // SPA fallback: cualquier ruta no-API sirve index.html
  // (Vue Router maneja el routing del lado del cliente)
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'))
  })
} else {
  // En desarrollo solo devolvemos 404 JSON para rutas desconocidas
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
}

// ── Error handler global ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  // JSON parse error de body-parser/Express → 400
  const status = err.status ?? err.statusCode
  if (status === 400 || err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'JSON inválido en el body' })
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

// ── Arrancar ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎲 D&D API corriendo en http://localhost:${PORT}`)
})
