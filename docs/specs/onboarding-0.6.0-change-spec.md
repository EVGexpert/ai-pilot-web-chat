# Change Specification: Customer Onboarding 0.6.0-candidate

**Дата:** 2026-08-12
**Автор:** Zero
**Статус:** CANDIDATE (не rollout)
**PHASE 2:** НЕ запускать. Production rollout самостоятельно НЕ выполнять.

---

## 10.1 Context

- Project: AI Pilot (auth-api, brain, webchat, wp-plugin)
- Repo (base): `/home/node/.openclaw/workspace/tmp/live-code` (live 0.5.9-candidate snapshot) → новый candidate: `candidate/auth-api-candidate` (обновляется до 0.6.0-candidate)
- WP Plugin repo: `/repos/ai-pilot-wp-plugin` (2.2.2 → 2.3.0)
- ANSS: `specs/ai-pilot-auth-api.anss.md`, `specs/ai-site-manager.anss.md`

### Текущее состояние (проверено 2026-08-12)

| Компонент | Live | Примечание |
|---|---|---|
| Auth API | 0.5.9-candidate (docker cp поверх 0.5.8 image) | `ai-pilot-auth` container |
| Brain | 0.8.1-aipilot1 | статические BRAIN_API_KEYS (3 шт: co_aipilot + 2 customer) |
| DB | schema v20 | customers/customer_members/brain_tenants/brain_memory_outbox уже есть |
| WebChat | 0.1.3 | ai-pilot-chat container |
| WP Plugin | 2.2.2 | verify-code отдаёт только token |

### Ключевые находки

1. **Brain 0.8.1 поддерживает динамический key provisioning нативно** — RFC 7662 introspection:
   - `AUTH_SERVICE_INTROSPECTION_URL` (или `AUTH_SERVICE_URL` + `/v1/oauth/introspect`)
   - `AUTH_SERVICE_INTROSPECTION_CLIENT_ID/SECRET`, `AUTH_SERVICE_AUDIENCE` (default `brain`)
   - Bearer `ik_...` → Brain POST form-encoded `token/client_id/client_secret` → ответ `{active:true, org, scope, aud}`
   - **НЕ требует docker recreate при добавлении клиента.** Это и есть "tenant credential broker / dynamic provisioning layer".
2. **Ограничение:** `NODE_ENV=production` + remote verifier → статические BRAIN_API_KEYS отключаются (`credential-resolver.service.ts: staticAllowed = !(env==='production' && remoteConfigured)`). Значит при переходе на introspection ВСЕ ключи (включая MCP `co_aipilot`) должны выдаваться брокером (ik_).
3. **Нет BLOCKER по Brain:** динамический provisioning возможен. Brain-изменения не нужны — только одноразовая конфигурация env (rollout-шаг).

---

## 10.2 Problem / Feature

Новый клиент должен пройти onboarding полностью самостоятельно:
register/login → customer workspace → Brain tenant → WP connect-code → site → token → health → memory → chat/actions.
Без ручных INSERT/UPDATE в БД, без ручного создания Brain tenant, без ручной правки tenant keys, без ручной привязки site→customer.

## 10.3 Proposed Solution

### A. Customer workspace (секции 1–2)
`ensureCustomerWorkspace(userId)` — идемпотентный синхронный helper (sql.js синхронный, внутри нет await → атомарно):
1. найти active membership (`customer_members` любой роли, status customer=active);
2. если есть — вернуть customer;
3. нет — создать customer + owner membership + brain_tenants(status=pending).
- customer_id = `cus_<uid>` (stable opaque, не email/hostname/company name).
- Конкурентность: функция синхронная, без await внутри → два параллельных запроса не пересекутся; плюс PK/UNIQUE constraints как страховка.

### B. Brain tenant provisioning (секции 3–4)
- `brain_tenant_keys` (v21): customer_id PK, key_enc (AES-256-GCM, master key из env `BRAIN_KEYS_MASTER_KEY`), key_hash (sha256 raw), key_prefix, status (active/revoked), created_at, revoked_at, last_used_at.
- **TenantProvisioner** (worker, интервал): pending tenant → сгенерировать `ik_` + 32 байта base64url → зашифровать, сохранить hash → probe Brain (`/mcp/{companyId}` initialize с новым ключом) → успех: tenant=provisioned, key=active; Brain down: tenant остаётся pending, retry (key уже выпущен — reuse).
- **Introspection endpoint** в auth-api: `POST /api/v1/oauth/introspect` (form-encoded: token, client_id, client_secret). M2M creds из env (`BRAIN_INTROSPECTION_CLIENT_ID/SECRET`), аудиенция `brain`. Ответ RFC 7662: `{active, org: companyId, scope: "brain:read brain:write", aud: "brain"}`.
- Роуты вне /api: не нужен — Brain конфигурируется явным `AUTH_SERVICE_INTROSPECTION_URL=http://ai-pilot-auth:3001/api/v1/oauth/introspect`.
- Key никогда не пишется: в Brain facts, messages, MEMORY.md, логи, обычные API responses. В БД — только encrypted + hash.
- `tenantKeys()` (env BRAIN_TENANT_KEYS) заменяется на `getTenantCredential(customerId)` (DB, decrypt на лету). Env-ключ помечается deprecated (compat fallback в dev).

### C. WordPress connect flow (секции 5–8)
- WP Plugin 2.3.0: `/agent/verify-code` возвращает дополнительно `plugin_version`, `wp_version`, `capabilities`, `instance_id` (aipilot_site_id). Connect-code остаётся: одноразовый (used), 5 мин, crypto random, привязан к site_url (hostname), expires_at.
- Auth `/api/sites/connect-code`:
  - auth → customer = ensureCustomerWorkspace(user.sub) (серверный, trusted; тело запроса не содержит customer_id)
  - canManageSites(userId, customerId): owner/admin → ok; member → 403 SITE_MANAGE_FORBIDDEN
  - verify на WP → metadata
  - normalize URL → global lookup normalized_hostname:
    - **CASE A** нет сайта → create site (customer_id=current, token, plugin_version, wp_version, verified, health после probe) + bootstrap events в outbox (site:<hostname>: site_id, hostname, plugin_version, wp_version, connection_status, connected_at) + notifyGateway + первичный health probe
    - **CASE B** тот же customer → reconnect: update token/plugin/wp/health/updated_at; без дубля; факты через outbox (payload_hash dedup)
    - **CASE C** другой customer → 409 SITE_ALREADY_CONNECTED, ничего не менять, данные не раскрывать
  - Token validation: сразу probe protected `/site` с токеном. verify ok + /site 401/403 → `connection_status='connected_degraded'` + ответ пользователю "Требуется повторное подключение". verify ok + /site 2xx → connection_status='connected'.
- Site transfer: НЕ реализуем (future flow, отдельная задача).

### D. Роли (секция 9)
`src/permissions.js`: `canManageSites(userId, customerId)` — owner/admin allow, member deny. Единый helper, role checks не размазываются по роутам. `getUserRoleInCustomer(userId, customerId)`.

### E. Site Brain entity + bootstrap (секции 10–11)
- entity `site:<normalized_hostname>`, scope SITE, tenant = customer companyId.
- facts: site_id, hostname, plugin_version, wp_version, connection_status, connected_at. НИКОГДА: token, connect-code, admin creds, cookies, auth headers.
- bootstrap event: только durable metadata. Без импорта posts/pages/users/comments. sync_wp_memory — отдельный scoped процесс (не в этой задаче).

### F. Первый health check (секция 12–13)
- После connect: ping + protected /site + capabilities → last_health_at, last_health_status (online/offline), plugin_version, wp_version, cached_capabilities. Не ждём 30-мин scheduler (refreshSiteHealth(force=true) сразу).

### G. UX (секция 14)
- Ответ connect: hostname, status online, plugin version, WP version. Без token/tenant IDs/customer IDs.
- Tenant pending → НЕ техническая ошибка; чат работает; максимум "Память настраивается".
- WebChat 0.1.3: минимальные правки — статусная строка после connect + safe поля (без токенов).

### H. Миграции v21+ (Auth API)
- v21: `brain_tenant_keys`, `sites.connection_status` DEFAULT 'connected', `sites.is_legacy` DEFAULT 0, `brain_tenants.provisioning_attempts/last_provisioning_error` (для retry-логики).
- v22 (если нужно): маркировка legacy sites (job.yousite.agency, obelisk.evgexpert.ru) — is_legacy=1. Безопасное metadata поле, ничего не ломаем.

### I. Release
- package.json → 0.6.0-candidate; Dockerfile; локальная сборка `ai-pilot-auth:0.6.0-candidate` (immutable image). НЕ docker cp. Production rollout НЕ выполняем.

---

## 10.4 Changes

- [ ] `candidate/auth-api-candidate/src/config.js` — версия 0.6.0-candidate; BRAIN_KEYS_MASTER_KEY, BRAIN_INTROSPECTION_CLIENT_ID/SECRET, BRAIN_PROVISION_INTERVAL_MS
- [ ] `src/db/connection.js` — миграции v21, v22
- [ ] `src/db/tenantKeys.js` (new) — encrypt/decrypt AES-256-GCM, getTenantCredential, createTenantKey, revokeTenantKey
- [ ] `src/db/customers.js` (new) — ensureCustomerWorkspace, getCustomerForUser, getUserRoleInCustomer, canManageSites
- [ ] `src/permissions.js` (new) — canManageSites (или в customers.js)
- [ ] `src/brain/provisioner.js` (new) — worker: pending → key → probe → provisioned
- [ ] `src/brain/introspection.js` (new) — POST /api/v1/oauth/introspect
- [ ] `src/memory/contextBuilder.js` — tenantKeys → getTenantCredential (DB)
- [ ] `src/memory/worker.js` — clientFor через getTenantCredential + provisioner tick
- [ ] `src/routes/sites.js` — connect-code v2 (CASE A/B/C, permissions, token validation, health, bootstrap)
- [ ] `src/routes/auth.js` — register/login: ensureCustomerWorkspace после создания пользователя (только если user без customer)
- [ ] `src/index.js` — register introspection route, provisioner worker
- [ ] `tests/test-onboarding.js` (new) — полный набор (~35 кейсов)
- [ ] `tests/mock-wp.js` (new) — mock WordPress сервер (ping/site/connect-code/verify-code)
- [ ] WP Plugin 2.2.2 → 2.3.0: verify-code metadata + connect-code поля
- [ ] WebChat: статус после connect + "Память настраивается"
- [ ] Dockerfile / build 0.6.0-candidate

## 10.5 Verification

1. `node --check` всех изменённых файлов
2. `node tests/test-migrations.js` (копия prod DB → v22, целостность)
3. `node tests/test-onboarding.js` (mock-brain + mock-wp, полный E2E)
4. `node tests/test-memory-integration.js` (регрессия PHASE 1.1)
5. Локальный smoke: brain с introspection (throwaway container) + auth 0.6.0 → tenant provisioned → факт записан/прочитан

## 10.6 Risks and Mitigations

- Переход brain на introspection отключит статические ключи → MCP/co_aipilot ключ должен стать ik_ (выпускаем брокером; OpenClaw config обновление — rollout-шаг, НЕ делаем в этой задаче; в отчёте фиксируем).
- Безопасность master key: env BRAIN_KEYS_MASTER_KEY только в auth container (не логируется); ключи в БД encrypted; sanitizer остаётся.
- Brain down при connect: site создаётся, tenant pending, outbox ждёт — чат работает.
- Изменение контракта verify-code: plugin 2.3.0 обратно совместим (старые поля остаются).
- sql.js однопоточность: ensureCustomerWorkspace синхронный — атомарность гарантирована.

## 10.7 Definition of Done

- Новый пользователь: register → customer auto → owner membership → brain_tenant pending/provisioned → connect-code → site (CASE A/B/C) → token check → health → memory write → recall → create_post → approve idempotent — БЕЗ ручных правок БД/Brain/docker.
- Все тесты раздела 23 зелёные.
- Отчёт по разделу 25 с флагами.
