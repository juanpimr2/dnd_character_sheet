# CLAUDE.md

Guía para Claude Code al trabajar con este repositorio.

## Comandos de desarrollo

```bash
# Backend (puerto 3000)
cd backend && node server.js

# Frontend Vue dev server (puerto 5173, proxy /api → :3000)
cd frontend && npx vite

# Acceso
http://localhost:5173
```

## Arquitectura

**D&D 3.5 / Pathfinder Character Sheet Manager** — SaaS con modelo de afiliados en tiendas físicas de rol.

### Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 + Vite + Pinia + TypeScript |
| Backend | Node.js + Express (sin framework extra) |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth — email/password + Google OAuth + 2FA TOTP |
| Pagos | Stripe (one-time purchase, pendiente de implementar) |

### Estructura de directorios

```
backend/          Node.js API server
  server.js       Servidor Express con todos los endpoints
  .env            SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET, APP_URL, PORT

frontend/         App Vue 3
  src/
    stores/
      auth.ts         Pinia: sesión Supabase, Google OAuth, captura store ref
      characters.ts   Pinia: CRUD personajes, auto-save debounce 1.2s
    types/
      character.ts    Tipos TypeScript del personaje D&D
    composables/
      useBonusCalc.ts Motor de stacking D&D 3.5 (AC, saves, ataques)
    components/
      AppHeader.vue
      CharacterCard.vue
      BonusBreakdown.vue   Componente reutilizable de desglose de bonificadores
      panels/              12 paneles editables de la hoja de personaje
    views/
      LoginView.vue        Login + registro + Google OAuth (captura ?ref= de QR)
      CharactersView.vue   Lista de personajes del usuario
      CharacterView.vue    Hoja completa con tabs
      SettingsView.vue     API Token (ver / regenerar)
    router/index.ts        Guards de autenticación
  .env            VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

db/
  schema.sql              Schema inicial (profiles + characters)
  migrations/
    001_api_token.sql     api_token UUID en profiles
    002_stores.sql        Tiendas afiliadas + monetización

data/                     JSON históricos de la era vanilla JS (archivo)
```

### Modelo de negocio

**Afiliados en tiendas físicas:**
- Cada tienda tiene un `referral_code` único → QR apunta a `APP_URL/login?ref=CODIGO`
- Al registrarse el usuario, queda vinculado a la tienda (silencioso, sin intervención del usuario)
- Vista `store_daily_registrations` calcula registros por tienda por día → base para comisiones

**Monetización (pendiente Stripe):**
- `free` → 2 personajes
- `purchased` (pago único) → 10 personajes
- `extra_characters` → personajes adicionales más allá de 10

### Base de datos — tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Extiende auth.users: username, plan, api_token, store_id, purchased |
| `characters` | id + owner_id (PK compuesta), name, data JSONB |
| `stores` | name, city, owner_email, referral_code, commission_rate |
| `store_daily_registrations` | Vista: registros por tienda por día |

### API Endpoints

**Autenticación:** `Authorization: Bearer <supabase_jwt>` ó `Bearer <api_token_uuid>`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/characters` | user | Lista personajes del usuario |
| GET | `/api/load?character=ID` | user | Carga personaje completo |
| POST | `/api/save?character=ID` | user | Guarda/actualiza personaje |
| DELETE | `/api/characters/:id` | user | Elimina personaje |
| GET | `/api/export?character=ID` | user | Descarga JSON del personaje |
| POST | `/api/import?character=ID` | user | Importa JSON de personaje |
| GET | `/api/me` | user | Perfil + api_token enmascarado |
| POST | `/api/me/token` | user | Regenera api_token (devuelve en claro una sola vez) |
| POST | `/api/me/store` | user | Vincula store ref al perfil (llamada silenciosa post-login) |
| GET | `/api/profile` | user | Perfil completo |
| GET | `/api/admin/stores` | admin | Lista tiendas con stats |
| POST | `/api/admin/stores` | admin | Crea tienda, devuelve referral_code |
| PATCH | `/api/admin/stores/:id` | admin | Actualiza tienda |
| GET | `/api/admin/stores/stats` | admin | Stats diarias (query: `?date=YYYY-MM-DD`) |
| GET | `/api/admin/stores/:id/qr` | admin | QR SVG/PNG de la tienda |
| GET | `/health` | — | Health check |

**Auth admin:** header `X-Admin-Key: <ADMIN_SECRET>`

### Reglas D&D implementadas

- `useBonusCalc.ts`: stacking rules Pathfinder/3.5e — no-stacking usa solo el mayor del tipo
- AC Normal / Toque / Desprevenido calculados en tiempo real desde `bonuses.ac[]`
- Saves calculados: base + mod(stat) + bonuses específicos + saveGeneral filtrado
- Tipos: armor, shield, deflection, dodge, natural, enhancement, insight, luck, sacred, profane, size, alchemical, morale, resistance, untyped

## Reglas de documentación

Cada vez que se haga un cambio relevante, actualizar:

1. **`QUICKREF.local.md`** — si cambia alguna URL, servicio, script o MCP
2. **`SECRETS.local.md`** — si se añade, cambia o elimina una clave o token
3. **`CLAUDE.md` (sección Pendiente)** — marcar como completado lo que se termine, añadir lo nuevo
4. **Memoria del proyecto** — si cambia el estado general del proyecto (nuevo plan, decisión importante)

Reglas:
- No crear documentación nueva salvo que el usuario lo pida explícitamente
- No duplicar info entre archivos — `SECRETS` para claves, `QUICKREF` para operativa
- Los `.local.md` nunca se suben al repo (están en `.gitignore`)

### Pendiente

- [ ] 2FA con TOTP (Supabase MFA)
- [ ] Stripe one-time purchase + webhook + paywall
- [ ] Panel admin web (crear tiendas, ver QRs, stats)
- [ ] Landing page por tienda `/t/CODIGO`
- [ ] Deploy en Render (frontend estático + backend Node)
- [ ] Email automático de stats a dueños de tienda
