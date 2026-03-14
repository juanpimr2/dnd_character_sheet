# Rollbook — Sprint Planning

**App:** Rollbook (`rollbook.app`)
**Sistema:** D&D 3.5 / Pathfinder 1e SaaS con modelo de afiliados en tiendas físicas.

---

## Estado general

| Sprint | Estado   | Foco |
|--------|----------|------|
| 1      | ✅ Done  | Core sheet + auth + tiendas |
| 2      | ✅ Done  | Monetización Stripe + admin panel + store flow |
| 3      | 🔄 Activo | Combat overhaul + UX / onboarding |
| 4      | 📋 Planned | Spells + format selector |
| 5      | 📋 Planned | 2FA + deploy + Party plan |
| 6      | 📋 Planned | Wizard onboarding completo |

---

## ✅ Sprint 1 — Core (Completado)

- Login email/password + Google OAuth
- Lista de personajes, CharacterView con 12 paneles editables
- Auto-save debounce 1.2s
- Bonus breakdowns AC/saves con reglas stacking D&D 3.5 (useBonusCalc.ts)
- API Token por usuario, middleware dual JWT/api_token
- Sistema tiendas afiliadas: stores table, referral_code, QR generation
- Vista store_daily_registrations para comisiones
- Captura ?ref= silenciosa en login
- Settings page con API token

---

## ✅ Sprint 2 — Monetización + Admin (Completado)

- Stripe: pago único Acceso Completo 4.99€
- Plan Maestro DM 9.99€ (ilimitado)
- Pack +5 slots 1.99€ (repetible)
- Panel admin web `/admin` — Overview / Tiendas / Stats / QR download
- Banner en login cuando viene de QR de tienda
- Modal self-service "Are you a store?" → tienda pendiente de aprobación
- Ruta `/t/:code` → redirige a `/login?ref=code`
- Admin activa tiendas manualmente tras acordar condiciones

---

## 🔄 Sprint 3 — Combat overhaul + UX (Activo)

### Completado en este sprint
- [x] CMB / CMD en panel Combat (BAB + STR/DEX + misc)
- [x] Ataques: tipo melee/ranged, crit estructurado (range + mult), range increment
- [x] InfoTip component — tooltips flotantes con Teleport (sin clipping)
- [x] InfoTips en TWF, role, stat, enhancement, crit, BAB, CMB, CMD, Initiative, AC stat, damage type
- [x] AC sub-tab en Breakdowns: totales en vivo + tabla de referencia de tipos de bonus
- [x] Links navegables desde paneles → Breakdowns sub-tab específico
- [x] Quitar flechas de inputs numéricos globalmente
- [x] Fix: click handler del mapa movido a map-layer (decoraciones se añadían bien)
- [x] Fix: botón borrar decoración no funcionaba (mousedown.stop en deco-del)
- [x] Banner en Ability Scores para personajes nuevos → link directo a Breakdowns

### Pendiente en Sprint 3
- [ ] Quick Setup modal — 6 campos de stats + método (Point Buy / Standard Array / Manual) → siembra breakdowns automáticamente
- [ ] Deploy estable en Render (frontend estático + backend Node)

---

## 📋 Sprint 4 — Spells + Format Selector

### Panel de Hechizos
Sin esto los casters (la mitad de la mesa) no pueden usar la app en serio.

- [ ] Spell slots por nivel (1-9) con contador usado/total
- [ ] Lista de hechizos: nombre, nivel, escuela, descripción, preparado/espontáneo
- [ ] Stat de lanzamiento configurable (INT / WIS / CHA)
- [ ] DC de salvación calculado: 10 + nivel_hechizo + mod(stat)
- [ ] Bono de ataque de conjuro: BAB_caster + mod(stat)
- [ ] Concentración: mod(stat) + nivel_personaje

### Format Selector
Objetivo: soportar D&D 3.5, Pathfinder 1e, D&D 5e y modo mixto 3.5+PF.

**Por qué importa:**
- Pathfinder 1e ≈ 3.5e con ajustes (CMB/CMD, skills consolidadas, etc.) — ya lo cubrimos
- D&D 5e tiene sistema completamente distinto (ventaja/desventaja, proficiency bonus, no iterative attacks, skills distintas)
- 3.5e puro tiene algunas diferencias con PF1e (cross-class skills cost 2:1, diferentes listas de hechizos, etc.)

**Implementación propuesta:**
- Campo `format` en `profiles` o `characters`: `'pf1e' | '3.5e' | 'mixed' | '5e'`
- JSON de reglas por formato en `/data/rulesets/`: `pf1e.json`, `dnd35.json`, `dnd5e.json`
- Cada ruleset define: lista de skills, stats de salvación, progresión de BAB, mecánicas especiales
- El selector aparece en: creación de personaje + Settings del personaje
- Paneles adaptan su contenido basándose en `char.format`

**Diferencias clave a contemplar por formato:**

| Mecánica | PF1e | D&D 3.5e | D&D 5e |
|----------|------|----------|--------|
| Skills | ~40 skills consolidadas | ~45 skills, cross-class 2:1 | ~18 skills con proficiency |
| Saves | Fort / Ref / Will | Fort / Ref / Will | STR / DEX / CON / INT / WIS / CHA |
| Ataque iterativo | BAB +6/+11/+16 | BAB +6/+11/+16 | Action economy distinta |
| CMB/CMD | Sí | No (reemplaza Grapple/Trip rules) | No (contested checks) |
| Proficiency | No | No | +2 a +6 según nivel |
| Ventaja/Desventaja | No | No | Sí |

- [ ] Añadir `format` a tipos Character
- [ ] Crear `/data/rulesets/pf1e.json` y `dnd35.json` (diferencias mínimas)
- [ ] Crear `/data/rulesets/dnd5e.json` (cambio mayor)
- [ ] Selector en creación de personaje: "¿Qué formato juegas?"
- [ ] PanelSkills adapta lista según formato
- [ ] PanelSaves adapta (Fort/Ref/Will vs 6 saves de 5e)
- [ ] PanelAttacks oculta CMB/CMD en 5e
- [ ] PanelCombatStats oculta iterative attacks en 5e

---

## 📋 Sprint 5 — 2FA + Deploy + Plan Party

- [ ] 2FA con TOTP (Supabase MFA nativo)
- [ ] Deploy definitivo en Render (pipeline CI desde main)
- [ ] Plan Party 24.99€ — 1 DM ilimitado + hasta 7 jugadores (20 chars c/u)
  - Tabla `party_invites` (party_id, email, role, claimed, claimed_by)
  - Al registrarse con email invitado → plan activado automáticamente
  - DM gestiona el grupo desde su cuenta
- [ ] Email automático de stats a dueños de tienda

---

## 📋 Sprint 6 — Wizard de Onboarding

Guided character creation (estilo D&D Beyond simplificado):

- [ ] Step 1: Elige formato (PF1e / 3.5e / 5e / Mixto)
- [ ] Step 2: Elige raza → aplica bonos raciales automáticamente a breakdowns
- [ ] Step 3: Elige clase → configura BAB progression, HD, saves base
- [ ] Step 4: Asigna ability scores (Point Buy / Standard Array / Manual / Dice Roll)
- [ ] Step 5: Elige habilidades de clase + feats iniciales
- [ ] Resultado: personaje con todos los valores base correctos desde el primer momento

---

## Modelo de precios (sin suscripciones)

| Plan | Chars | Precio | Estado |
|------|-------|--------|--------|
| Gratuito | 1 | — | ✅ Live |
| Acceso completo | 20 | 4.99€ | ✅ Live |
| Plan Maestro (DM) | Ilimitados | 9.99€ | ✅ Live |
| Pack +5 slots | +5 acumulable | 1.99€ | ✅ Live |
| Plan Party | 1 DM + 7 jugadores | 24.99€ | 📋 Sprint 5 |

---

## Modelo de afiliados (tiendas físicas)

- Tienda recibe `referral_code` único → QR apunta a `/login?ref=CODIGO`
- Usuario se registra vinculado a la tienda (silencioso)
- Admin ve `store_daily_registrations` → paga comisiones manualmente
- Tiendas se activan manualmente tras acordar condiciones
- Banner en login cuando viene de QR: *"Recommended by X"*
