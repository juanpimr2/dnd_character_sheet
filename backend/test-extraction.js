/**
 * test-extraction.js — Local test harness for the world lore extraction prompt.
 *
 * Usage:
 *   node test-extraction.js [characterId] [userId_email]
 *
 * Examples:
 *   node test-extraction.js valthor juanpablomore58@gmail.com
 *   node test-extraction.js valthor              ← uses DEFAULT_EMAIL below
 *
 * Output: formatted table in console — no Supabase write, no side effects.
 *
 * Workflow for prompt iteration:
 *   1. Edit the prompt in this file (or in server.js — keep them in sync)
 *   2. node test-extraction.js valthor
 *   3. Review the table, adjust prompt, repeat
 */

require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')

// ── Config ──────────────────────────────────────────────────────────────────
const DEFAULT_CHARACTER_ID = 'valthor'
const DEFAULT_EMAIL        = 'juanpablomore58@gmail.com'

const characterId = process.argv[2] ?? DEFAULT_CHARACTER_ID
const userEmail   = process.argv[3] ?? DEFAULT_EMAIL

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Faltan vars Supabase en .env'); process.exit(1) }
if (!ANTHROPIC_API_KEY) { console.error('Falta ANTHROPIC_API_KEY en .env'); process.exit(1) }

const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const anthropic = new Anthropic.default({ apiKey: ANTHROPIC_API_KEY })

// ── Helpers (mirrors server.js) ─────────────────────────────────────────────
function buildPrompt(notesText, seed, allPlanes, targetPlane, allKnownEntities) {
  // World context
  let worldContextBlock = ''
  const worldContextLines = []
  if (seed.worldName) worldContextLines.push(`- World: ${seed.worldName}`)
  if (seed.genre || seed.notes) {
    const g = [seed.genre, seed.notes].filter(Boolean).join(' — ')
    worldContextLines.push(`- Genre/tone: ${g}`)
  }
  if (worldContextLines.length) worldContextBlock = `\nWorld context:\n${worldContextLines.join('\n')}\n`
  if (seed.worldName) worldContextBlock += `- Do NOT create an entity named "${seed.worldName}" — it is the world itself, not a location within it.\n`

  // Known entities
  let knownEntitiesBlock = ''
  if (allKnownEntities.length > 0) {
    const entLines = allKnownEntities.map(e => {
      const loc = e.parent ? `, in: ${e.parent}` : ''
      return `- ${e.name} (${e.kind}${loc})`
    }).join('\n')
    knownEntitiesBlock = `\nKnown entities (preserve exact names — only parent/description updates allowed):\n${entLines}\n`
  }

  // Planes block
  let planesBlock = ''
  if (allPlanes.length > 1) {
    const list = allPlanes.map(p => `"${p.name}"`).join(', ')
    planesBlock = `\nKnown planes/worlds (use exact name for planeHint field): ${list}\nDefault plane: "${targetPlane?.name ?? allPlanes[0]?.name}"\n`
  }

  // ── THE PROMPT — keep in sync with server.js ────────────────────────────
  return `You are an expert D&D lore extractor. Analyze these session notes and extract all notable entities.

Return ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  { "name": "Entity Name", "kind": "city|location|npc|faction|quest", "description": "brief 1-2 sentence description", "parent": null, "planeHint": null, "confidence": "high|low" }
]

LANGUAGE RULE — ABSOLUTE PRIORITY:
- Detect the dominant language of the session notes (usually Spanish, English, etc.)
- Write all DESCRIPTIONS in that dominant language.
- NAMES: keep them EXACTLY as written in the notes. Do NOT translate proper nouns, artifact names, place names, or character names — "Dragon Lance", "Wandering Vault", "Vhan Crane" stay as-is even if the notes are mostly in Spanish. Mixed-language notes are normal.
- QUEST NAMES: write action phrases in the dominant language of the notes, but keep embedded proper nouns unchanged. Example: notes are Spanish → "Obtener la Dragon Lance" (not "Obtain the Dragon Lance", not "Obtener la Lanza del Dragón" — the artifact name stays as written).

Confidence levels — ONLY TWO:
- "high": the entity's home/affiliation/parent is EXPLICITLY stated or strongly implied by their role. Examples:
  • Notes say "X vive en Y" / "X is based in Y" → high
  • An NPC whose profession/role is clearly tied to a city's institutions (a city official, a noble family member, a guild officer) → high, parent = that city
  • An NPC who officiates ceremonies, holds a formal title, or serves the local nobility of a city → high, parent = that city
  • A location described as "near X" or "below X" or "outside X" → high, parent = X if X is known
- "low": the notes do NOT give enough context to determine home/base. Passing through a location does NOT count. Being present at one event does NOT count (unless their role is clearly tied to that location). When in doubt → "low".
CRITICAL: "low" confidence → always set parent: null. NEVER guess a parent for "low" entities.

CRITICAL — never create an entity for the world itself:
- The world map is the canvas. The world/plane/reality that CONTAINS everything is never a pin on the map.
- If a name refers to the entire world, the whole plane of existence, or the overarching setting, skip it entirely.
- Only create entities for places, people, and groups that exist INSIDE the world.

Kind rules:
- "city": cities, towns, villages, castles, kingdoms, settlements INSIDE the world
- "location": dungeons, taverns, ruins, forests, mountains, rivers, glaciers, specific buildings or places
- "npc": named characters that are NOT the player character
- "faction": guilds, armies, religions, noble houses, organizations
- "quest": active objectives, missions, tasks or goals the party is pursuing

Parent rules (IMPORTANT — only assign parent when EXPLICIT in notes):
- Cities: parent = null (always top-level)
- Locations: parent = a city only if notes explicitly place it IN that city. Wilderness locations → parent = null.
- NPCs: parent = the place/faction/house they BELONG TO according to the notes. Being "met at" or "visited in" a city does NOT make that city their parent. Only assign if the notes say they live/work/are based there.
- Factions: parent = the city where they are explicitly based, according to the notes.
- If unsure → parent: null, confidence: "low"

Quest rules:
- Quest name: short action phrase IN THE SAME LANGUAGE AS THE NOTES
- Quest description: what needs to be done and why, IN THE SAME LANGUAGE AS THE NOTES
- Quest parent: the location or NPC directly related to the quest, if explicitly mentioned
- Only include quests that are clearly active/unresolved

Plane routing rules (planeHint field):
- Leave "planeHint": null for entities that belong to the default/current plane
- Set "planeHint" to the plane name when an entity clearly belongs to a different plane or realm
- CRITICAL: If an entity IS a demiplane / pocket dimension / separate realm (e.g. "Wandering Vault"), ALL its contents get planeHint: "that realm's name". The realm itself does NOT become a location entity.
- When unsure → planeHint: null

Historical / cosmic entities — CRITICAL FILTER:
- SKIP anything whose description would use "era", "epoch", "age", "ancient period", "time when...". These are narrative context, NOT map entities. Even if the era has a proper name like "Time of Ending", "Age of Dragons", "the Sundering" — skip it entirely.
- TEST: ask yourself "does this exist RIGHT NOW as something the party can interact with?" If the answer is no (it's in the past, it's an abstract concept) → skip.
- Ancient EXTINCT civilizations (e.g. Atraxis): create ONLY if they left physical relics/presence in a specific plane right now. Use planeHint: [that plane]. If purely historical with no current physical presence → skip.
- Deities: create ONLY if they have a physical artifact, voice, or manifestation in a specific location the party visited. Use planeHint for that location. If purely abstract/worshipped-from-afar → skip.
- Generic terrain features (Black Ice, mist, dust, fog) are NOT location entities. Skip generic materials or atmospheric descriptions.

Other rules:
- CRITICAL: Extract ALL named entities regardless of how unusual, non-fantasy, or test-sounding the names are
- CRITICAL: If only ONE city is mentioned across all notes AND entities clearly operate there (not just passing through), those entities may use it as parent with confidence "high" — but only if the notes confirm their base there
- Factions and noble houses (Casa X, House X) are kind="faction", not kind="location"
- If the same entity appears under slightly different names, use the first/most common form
- Only include entities clearly mentioned in the notes
- Descriptions should be factual (what was learned in the session)
- Always include the "parent" field (null if no parent)
${worldContextBlock}${planesBlock}${knownEntitiesBlock}
Session notes:
${notesText}`
}

// ── ANSI colors for console output ──────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
  white:  '\x1b[97m',
}

function confColor(conf) {
  if (conf === 'high')   return c.green
  if (conf === 'medium') return c.yellow
  return c.red
}

function pad(str, len) {
  const s = String(str ?? '')
  return s.length >= len ? s.slice(0, len - 1) + '…' : s + ' '.repeat(len - s.length)
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}${c.cyan}🗺  Rollbook — Extraction Test Harness${c.reset}`)
  console.log(`${c.grey}character: ${characterId}  |  user: ${userEmail}${c.reset}\n`)

  // 1. Fetch user ID from email
  const { data: userList } = await supabase.auth.admin.listUsers()
  const user = userList?.users?.find(u => u.email === userEmail)
  if (!user) { console.error(`User not found: ${userEmail}`); process.exit(1) }

  // 2. Load character data
  const { data: row, error } = await supabase
    .from('characters')
    .select('data')
    .eq('id', characterId)
    .eq('owner_id', user.id)
    .single()
  if (error || !row) { console.error('Character not found:', error?.message); process.exit(1) }

  const charData  = row.data
  const worldLore = charData.worldLore ?? { planes: [] }
  const allPlanes = worldLore.planes ?? []
  const targetPlane = allPlanes[0] ?? null

  // 3. Build notes text (all sessions)
  const sessions = charData.sessions ?? []
  const notesText = sessions
    .map(s => `[Session ${s.id} — ${s.name}]\n${(s.entries ?? []).map(e => e.txt).join('\n')}`)
    .join('\n\n')
    .trim()

  if (!notesText) { console.error('No notes found for this character'); process.exit(1) }

  const seed = targetPlane?.seed ?? worldLore.seed ?? {}
  const allKnownEntities = allPlanes.flatMap(p => p.entities ?? [])

  console.log(`${c.grey}Sessions: ${sessions.length}  |  Notes length: ${notesText.length} chars  |  Known entities: ${allKnownEntities.length}${c.reset}`)
  console.log(`${c.grey}World: ${seed.worldName ?? '(none)'}  |  Planes: ${allPlanes.map(p => p.name).join(', ') || '(none)'}${c.reset}\n`)

  // 4. Show notes preview
  console.log(`${c.bold}── Notes preview (first 800 chars) ─────────────────────────${c.reset}`)
  console.log(c.dim + notesText.slice(0, 800) + (notesText.length > 800 ? '\n…' : '') + c.reset)
  console.log()

  // 5. Show known entities
  if (allKnownEntities.length > 0) {
    console.log(`${c.bold}── Known entities sent to AI ────────────────────────────────${c.reset}`)
    for (const e of allKnownEntities) {
      const loc = e.parent ? ` ${c.grey}in: ${e.parent}${c.reset}` : ''
      console.log(`  ${c.dim}${pad(e.kind, 10)}${c.reset} ${c.white}${e.name}${c.reset}${loc}`)
    }
    console.log()
  }

  // 6. Call Claude Haiku
  console.log(`${c.bold}── Calling Claude Haiku… ─────────────────────────────────────${c.reset}`)
  const t0 = Date.now()
  const prompt = buildPrompt(notesText, seed, allPlanes, targetPlane, allKnownEntities)

  let extracted = []
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are Mirador, an ancient elven lore-keeper and planar cartographer who has chronicled the deeds of adventurers across a thousand campaigns. You possess encyclopedic knowledge of D&D world-building, planar cosmology, faction politics, and the deep relationships between characters, places, and events. Your role is to read adventurers' raw session notes — often messy, partial, or written in the heat of adventure — and extract clean, structured world lore with scholarly precision.

You think like a world-builder: worlds contain planes, planes contain cities, cities contain districts and factions, factions contain members, taverns contain regulars. You understand that a "Casa Rakarov" is a noble house (faction), not a building; that the Wandering Vault is its own demiplane, not a location in the Material Plane; that an NPC mentioned at a specific tavern belongs to that tavern as parent, not just the city.

When notes are ambiguous you make the most narratively coherent choice. You never invent entities not mentioned in the notes. You always respond with clean, valid JSON and nothing else.`,
      messages: [{ role: 'user', content: prompt }],
    })
    const text  = response.content[0]?.text ?? '[]'
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    extracted   = JSON.parse(clean)
    if (!Array.isArray(extracted)) extracted = []
  } catch (err) {
    console.error('Anthropic error:', err.message)
    process.exit(1)
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`${c.grey}Done in ${elapsed}s — ${extracted.length} entities extracted${c.reset}\n`)

  // 7. Print results table
  const kindIcon = { city:'🏙', location:'📍', npc:'👤', faction:'⚔', quest:'📜' }
  const confLabel = { high: '● high  ', medium: '◐ mid   ', low: '○ low   ' }

  console.log(`${c.bold}── Extraction results ───────────────────────────────────────────────────────────────${c.reset}`)
  console.log(
    `  ${c.bold}${pad('CONF', 9)}${pad('KIND', 10)}${pad('NAME', 28)}${pad('PARENT', 24)}${pad('PLANE', 16)}WARN${c.reset}`
  )
  console.log('  ' + '─'.repeat(92))

  // Group by confidence for easier reading
  const sorted = [...extracted].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.confidence] ?? 2) - (order[b.confidence] ?? 2)
  })

  let lastConf = null
  for (const ent of sorted) {
    const conf   = ent.confidence ?? (ent.parent ? 'high' : 'low')
    const col    = confColor(conf)
    const isPlaneRoot = !!ent.planeHint && !ent.parent
    const warn   = (isPlaneRoot) ? `${c.grey}✦ plane root${c.reset}`
      : (!ent.parent && (ent.kind === 'npc' || ent.kind === 'faction'))
        ? `${c.red}⚠ no parent${c.reset}` : ''

    if (conf !== lastConf) { console.log(''); lastConf = conf }

    console.log(
      `  ${col}${pad(confLabel[conf], 9)}${c.reset}` +
      `${c.dim}${pad((kindIcon[ent.kind] ?? '?') + ' ' + ent.kind, 10)}${c.reset}` +
      `${c.white}${pad(ent.name, 28)}${c.reset}` +
      `${c.grey}${pad(ent.parent ?? '—', 24)}${c.reset}` +
      `${c.cyan}${pad(ent.planeHint ?? '', 16)}${c.reset}` +
      warn
    )
  }

  console.log('\n  ' + '─'.repeat(92))

  // 8. Summary
  const hi    = sorted.filter(e => (e.confidence ?? 'high') === 'high').length
  const lo    = sorted.filter(e => e.confidence === 'low').length
  // Plane roots (planeHint + no parent) are correct — don't count as warnings
  const warns = sorted.filter(e => !e.parent && !e.planeHint && (e.kind === 'npc' || e.kind === 'faction')).length
  const planeRoots = sorted.filter(e => e.planeHint && !e.parent).length

  console.log(`\n  ${c.bold}Summary:${c.reset}  ${c.green}${hi} ubicados${c.reset}  ${c.red}${lo} inciertos${c.reset}  ${c.grey}${planeRoots} plane roots${c.reset}   ${warns > 0 ? `${c.red}⚠ ${warns} sin parent${c.reset}` : `${c.green}✓ todos ubicados o en plano${c.reset}`}`)

  // 9. Raw JSON dump (optional)
  if (process.argv.includes('--json')) {
    console.log(`\n${c.bold}── Raw JSON ─────────────────────────────────────────────────────────────────────────${c.reset}`)
    console.log(JSON.stringify(extracted, null, 2))
  }

  console.log()
}

main().catch(err => { console.error(err); process.exit(1) })
