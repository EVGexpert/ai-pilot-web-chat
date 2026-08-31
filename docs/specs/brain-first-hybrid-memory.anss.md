# ANSS SPEC — Brain-First Hybrid Memory Architecture

**Версия:** 1.0 (deployed)
**Дата:** 2026-08-31
**Статус:** ✅ PRODUCTION — PHASE 1/2 развёрнута в rollout 0.6.0 (2026-08-18); PHASE 3/4 не запускались
**Исполнитель:** Zero (OpenClaw agent)

---

## РАЗДЕЛ 0. ЦЕЛЬ

Перевести систему AI Pilot с flat-memory (MEMORY.md + DB) на Brain-first
гибридную память: INITE Brain = долговременная семантическая память,
Auth API DB = system of record, MEMORY.md = fallback.

### Неизменяемые инварианты

- INV-1: **Tenant = клиент, Entity = сайт.** Никогда один общий tenant для всех клиентов.
- INV-2: **DB wins.** При расхождении DB и Brain по операционному состоянию — истина в DB.
- INV-3: **Brain никогда не источник разрешения на действие** (create_post/approve/connect — только live DB/WP).
- INV-4: **Секреты никогда не пишутся в Brain.** Санитайзер до любой записи.
- INV-5: **Brain не синхронная точка отказа.** Outbox + retry; чат/логин/approve работают при недоступности Brain.
- INV-6: **Модель не выбирает tenant.** Только trusted resolver из Auth API (user → site → customer → brain_tenant_id).
- INV-7: Brain не переустанавливается, MCP transport не меняется, ключи не ротируются в рамках этого внедрения.

---

## РАЗДЕЛ 1. ТЕКУЩЕЕ СОСТОЯНИЕ (INVENTORY 2026-08-31, после rollout 0.6.0)

| Компонент | Значение |
|---|---|
| OpenClaw | Gateway healthy, DeepSeek V4 Flash |
| Brain service | inite-brain, 0.8.1-aipilot1, auth mode = **INTROSPECTION** (RFC 7662 через auth-api) |
| Brain data plane | ✅ работает (search_knowledge, record_fact, timeline, list_*) |
| Brain MCP | stdio → `npx @inite/brain-mcp` → Streamable HTTP `http://brain:3000/mcp/:companyId`; ключ = core ik_ |
| core ik_ | `ik_Fg31W...` (msyhax5lwx01cj), encrypted key_enc, introspection `{active:true, aud:brain, org:co_aipilot, scope:"brain:read brain:write"}` |
| Old static keys | brain_328... → **401** (отключены в production: staticAllowed=false при introspection) |
| Tenant (company) | `co_aipilot` (core) + per-customer `cust_<id>` (динамически provisioned) |
| SurrealDB | v3.2.0 container `surrealdb`, healthy, volume surrealdb-data |
| Динамический provisioning | customers + brain_tenants(pending→provisioned) + brain_tenant_keys(ik_, AES-256-GCM) — TenantProvisioner worker, без ручных шагов |
| Cross-tenant | структурно невозможно: path companyId обязан совпадать с companyId ключа (400); тест PASS |
| MEMORY.md | fallback only (маркер PHASE 1), Brain — primary |
| Auth API DB | ai-pilot-auth 0.6.0, schema **v23**, node:sqlite (WAL), users=4, customers=3, sites=2, brain_tenants=3, brain_tenant_keys=4 |
| Outbox | `brain_memory_outbox` в проде: **30 completed / 0 pending / 0 failed** (2026-08-18, после reconnect +6 site_state фактов) |
| Memory regression | EPHEMERAL→SKIP; PREFERENCE scope=site/customer; cross-customer isolation PASS (cross-tenant 400) |
| S21 exactly-once | completed replay → 0 writes; duplicate enqueue → semantic_duplicate |
| Production sites | job.yousite.agency (plugin 2.3.0, connected, WP smoke PASS post 87), obelisk.evgexpert.ru (2.2.2, legacy) |
| Ресурсы | Host 3.8GiB RAM; brain 2G limit; второй экземпляр Brain невозможен (OOM-риск) |
| Gotchas | BGE_M3_WORKER=1 обязателен; после OOM/рестартов пул SurrealDB реконнектится анонимно → `docker restart brain`; MCP: BRAIN_BASE_URL (не BRAIN_API_URL); плагин 2.3.0 принимает только `X-AI-Pilot-Token` |

---

## РАЗДЕЛ 2. АРХИТЕКТУРА ПАМЯТИ

### 2.1 Два класса памяти

**A. AI PILOT CORE MEMORY** — tenant `ai-pilot-core` (companyId), SurrealDB DB `co_ai-pilot-core`.
Общесистемные знания: архитектура, версии компонентов, deployment history, решения,
incidents/resolutions, gotchas, API contracts, roadmap, диагностика, инфраструктура.
Никаких клиентских данных. Используется OpenClaw в operator/internal сессиях.

**B. CUSTOMER MEMORY** — tenant `cust_<stable_customer_id>` (companyId), DB `co_cust_<id>`.
По одному tenant на клиента. Внутри — entities:

```
customer:<id>          site:<normalized_hostname>
person:<id>            project:<id>   component:<id>
incident:<id>          decision:<id>  deployment:<id>  feature:<id>
```

Связи (edges): customer OWNS site · site USES component · site HAD_INCIDENT incident ·
incident RESOLVED_BY decision · site HAS_PREFERENCE · site HAS_FEATURE ·
site DEPLOYED_VERSION · person WORKS_WITH customer.

**Stable customer id:** сегодня `user_id` (владелец сайтов). Введение отдельной таблицы
customers — отдельный этап (см. Раздел 11, не блокирует MVP).

### 2.2 Конвенции

| Что | Конвенция | Пример |
|---|---|---|
| companyId | `cust_<id>` (regex `[A-Za-z0-9_-]{1,64}`) | `cust_mqikumlffiryy6` |
| SurrealDB DB | `co_<companyId>` | `co_cust_mqikumlffiryy6` |
| Core companyId | `ai-pilot-core` | DB `co_ai-pilot-core` |
| site entity id | `site:<hostname>` (normalized, без scheme/www) | `site:obelisk.evgexpert.ru` |
| vertical (sourceVertical) | `ai-pilot` | |
| fact predicates | `preferred_color`, `uses_plugin`, `plugin_version`, `connection_status`, `wp_plugin_version`, `decision_*`, `incident_*`, `lesson_*` | |

Нормализация hostname: lowercase, strip `https?://`, strip `www.`, strip trailing `/`, port.

### 2.3 Trusted Tenant Resolver (единственный путь к tenant)

```
authenticated user/session → site_id → user_id(customer_id) → company_id
```

- Resolver живёт в Auth API (авторитетный контекст, за JWT/сессией).
- Таблица mapping: `brain_tenants(customer_id TEXT PK, company_id TEXT, status, created_at, updated_at)`.
- Сайты без customer → tenant core (запрещено по умолчанию; только operator flow).
- Модель НИКОГДА не передаёт companyId произвольно; router принимает только `customer_id`/`site_id` из trusted контекста.

### 2.4 Tenant registration (bootstrap)

**0.6.0 (production): динамическое provisioning — ручные шаги не нужны.**

1. `ensureCustomerWorkspace(userId)` — идемпотентный helper: customers + owner membership + brain_tenants(status=pending).
2. **TenantProvisioner** (worker): генерирует `ik_` + 32 байта base64url → шифрует AES-256-GCM (master `BRAIN_KEYS_MASTER_KEY`) → сохраняет key_enc + key_hash → probe Brain (`/mcp/{companyId}`) → tenant=provisioned. Brain down → retry (ключ reuse).
3. Brain авторизует через introspection: `POST /api/v1/oauth/introspect` (auth-api, M2M client_id/secret) → `{active, org, scope, aud}`.

Кандидат-роутер (candidate/memory-router) остаётся эталонной реализацией: trusted router + sanitizer + classifier + outbox (тесты 22/22 PASS).

---

## РАЗДЕЛ 3. TRUSTED MEMORY ROUTER (модуль Auth API)

Реализация: модуль в Auth API (`src/memory/`), предпочтительно по INV-заданию. Отдельный сервис — только если модуль не влезает (не сейчас).

### 3.1 Состав модуля

```
src/memory/
  router.js          — точка входа: resolve(customer_id, site_id) → scoped client
  resolver.js        — customer_id → company_id (таблица brain_tenants + кэш)
  sanitizer.js       — secret-детектор (Раздел 4)
  classifier.js      — durability-классификатор (Раздел 5)
  outbox.js          — brain_memory_outbox (Раздел 6)
  worker.js          — drain outbox → Brain (setInterval/задание)
  brain-client.js    — HTTP клиент к brain REST (/v1/search, /v1/facts, /v1/entities) с Bearer key
  metrics.js         — счётчики (Раздел 7)
  context.js         — сборка memory_context для промпта (Раздел 8)
```

### 3.2 Brain REST поверхность (верифицировано)

- `GET /v1/stats/overview` — работает (Bearer key, scopes read).
- `POST /mcp/:companyId` — MCP Streamable HTTP; path companyId = key companyId, иначе 400.
- Admin (`/v1/admin/*`) — требует `brain:admin`, недоступен текущим ключом.
- REST-контроллеры: `/v1/facts`, `/v1/search`, `/v1/entities`, `/v1/synthesize`,
  `/v1/search/multi-hop`, `/v1/documents`, `/v1/episodes`, `/v1/ingest`, `/v1/sources`,
  `/v1/stats`, `/v1/communities`, `/v1/answer`, `/v1/dreams` — все company-scoped через ключ.

Роутер использует REST (не MCP): проще, идемпотентно-управляемо, без SSE-сессий.
Точные сигнатуры `/v1/facts` POST и `/v1/search` — уточнить при реализации (swagger/контроллеры);
candidate-версия использует MCP-протокол поверх HTTP (initialize + tools/call), что гарантированно
совпадает с проверенной поверхностью brain__* tools.

### 3.3 API модуля (для chat.js / sites.js)

```
memory.getContext({customer_id, site_id, session_id}) → {facts[], preferences[], incidents[], decisions[], tokens_used}
memory.enqueue({customer_id, site_id, session_id, message_id, event_type, payload}) → outbox row (async, никогда не блокирует)
memory.registerSite({site_id, customer_id, hostname, ...}) → create/update site entity + initial facts (через outbox)
memory.sanitize(text) → {classification, safe_text}
```

Правила:
- `getContext` — таймаут 2s, при недоступности Brain → пустой контекст (chat живёт).
- `enqueue` — синхронная запись только в SQLite (outbox), Brain-вызов всегда асинхронный.
- Все вызовы Brain логируются с `tenant_id` (hash), `event_type`, `duration`, `status`; секреты не логируются.

---

## РАЗДЕЛ 4. SECRET SANITIZER

Выполняется ПЕРЕД любой записью в Brain (и в classify, и в router).

Patterns (детект + DROP):
- `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `PASS`, `JWT`, `AUTH`, `BEARER`, `PRIVATE KEY`,
  `BEGIN RSA/OPENSSH/EC PRIVATE KEY`, `brain_`, `ghp_`, `github_pat_`, `sk-`, `ik_`
- JWT-форма: `eyJ...\.eyJ...`
- Длинные hex/base64 (entropy > 3.5, длина > 24)
- .env-подобные пары `KEY=value` с чувствительными именами

Классификация: `SECRET → action=DROP` (item не попадает в outbox; событие логируется как
`memory_item_dropped_secret` без содержимого). Никогда не пишем сырой текст секрета в Brain,
в outbox payload — только sanitized-версия (или item отбрасывается целиком).

---

## РАЗДЕЛ 5. DURABILITY CLASSIFIER

Классы:

| Класс | Куда | valid time |
|---|---|---|
| EPHEMERAL («ок», «спасибо», «попробуй ещё раз») | никуда | — |
| SECRET | никуда (DROP) | — |
| FACT | Brain | validFrom |
| PREFERENCE | Brain (customer tenant) | validFrom |
| DECISION | Brain (predicate `decision_*`) | validFrom |
| INCIDENT | Brain + timeline | validFrom/validUntil |
| RESOLUTION | Brain + edge к incident | validFrom |
| SITE_STATE | Brain (с valid time; не перетирает DB) | validFrom |
| CUSTOMER_STATE | customer tenant | validFrom |
| DEPLOYMENT | Brain + version/timestamp | validFrom |
| LESSON | Brain (durable) | validFrom |

Реализация: гибрид — эвристики (длина, наличие версии/даты/глаголов предпочтения) +
LLM-классификация (DeepSeek через opencode/внутренний вызов) для спорных случаев.
MVP: эвристики + стоп-слова EPHEMERAL; LLM-путь — опция (config `MEMORY_CLASSIFIER=heuristic|llm`).

---

## РАЗДЕЛ 6. OUTBOX / RELIABILITY

Migration v12 (Auth API): `brain_memory_outbox`

```sql
CREATE TABLE IF NOT EXISTS brain_memory_outbox (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  site_id TEXT,
  session_id TEXT,
  message_id TEXT,
  action_request_id TEXT,
  event_type TEXT NOT NULL,          -- site_registered|fact|preference|decision|incident|resolution|deployment|lesson
  entity_ref TEXT NOT NULL,          -- site:<hostname> | customer:<id> | ...
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,              -- sanitized
  payload_hash TEXT NOT NULL,        -- sha256(customer_id|entity_ref|predicate|object|event_type)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|completed|failed
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  last_error TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(payload_hash)
);
CREATE INDEX idx_outbox_status ON brain_memory_outbox(status, created_at);
```

- **Идемпотентность:** `payload_hash` UNIQUE — retry не создаёт дубль; worker: `INSERT OR IGNORE`.
- Worker: `UPDATE ... SET status='processing' WHERE id=? AND status='pending'` (CAS) → Brain write →
  `completed`. Ошибка → `failed` + attempts++, retry c backoff (run_after по аналогии с jobs).
- Brain недоступен → pending копится, чат/логин/approve не затронуты (enqueue не блокирует).
- Очистка: completed старше 30 дней — prune (опция).

---

## РАЗДЕЛ 7. OBSERVABILITY

Метрики (в `metrics.js`, экспорт в /metrics или лог-строки):

```
brain_retrieval_count        brain_retrieval_latency_ms
brain_write_count            brain_write_failed
brain_outbox_pending         brain_outbox_failed
brain_tenant_resolution_failed
brain_cross_tenant_denied    brain_memory_items_extracted
brain_memory_items_dropped_secret
```

Лог-поля: customer_id, site_id, tenant_hash, event_type, duration_ms, status.
Запрещено: ключи, токены, сырые секреты, authorization headers.

---

## РАЗДЕЛ 8. CHAT READ PATH

```
WebChat → Auth API (JWT) → DB: user/customer/site/session
  → memory.getContext({customer_id, site_id})   [таймаут 2s, fail-open]
  → Brain customer tenant: site entity + top-N relevant facts/preferences/incidents/decisions
  → prompt: CORE_RULES + memory_context (только top relevant, лимит ~800 токенов, N≤10 фактов)
  → OpenClaw → response/action
```

memory_context не содержит сырого дампа Brain; сортировка по relevance (score),
фильтр по site entity + явному cross-site запросу (внутри клиента).

## РАЗДЕЛ 9. CHAT WRITE PATH

```
raw conversation → DB (messages) [всегда]
  → extractor (из завершённых meaningful-обменов; НЕ из «ок»/polling)
  → sanitizer → classifier
  → enqueue(outbox) → worker → Brain customer tenant
```

Provenance каждого факта: customer_id, site_id, session_id, message_id, action_request_id?,
timestamp, sourceVertical=`ai-pilot`. validFrom = дата события, если известна.

---

## РАЗДЕЛ 10. МИГРАЦИЯ ИЗ MEMORY.md

1. **Backup** MEMORY.md → `backups/MEMORY.md.<date>.bak` (выполнено в фазе candidate? — в production switch).
2. Разделение контента:
   - → ai-pilot-core: архитектура, версии, решения, gotchas, incidents/resolutions, roadmap, deployment history.
   - → customer tenants: site facts, customer facts, preferences, site incidents/decisions.
   - Секреты/сомнительное — НЕ переносить; устаревшее — только в timeline с valid time.
3. MEMORY.md не удаляется; сверху маркер:

```
PRIMARY_LONG_TERM_MEMORY=INITE_BRAIN
MEMORY_MD_ROLE=FALLBACK_ONLY
```

4. Grep MEMORY.md — не основной retrieval при healthy Brain.

## РАЗДЕЛ 11. HISTORICAL CHAT MIGRATION

Selective: deployment sessions, incidents, customer decisions, site setup, bugs, resolutions,
architecture. Из выбранных сессий — факты/решения/инциденты с provenance (session_id, message_id).
Raw chat остаётся в DB. Автоматический импорт всех raw messages — запрещён.

---

## РАЗДЕЛ 12. AUTOMATIC MEMORY (триггеры)

new customer · new site · reconnect · plugin version changed · deployment ·
action completed/failed · root cause found · customer preference stated ·
architectural decision · incident resolved · meaningful chat conclusion.
НЕ пишем после «ок»/polling/технических heartbeat-сообщений.

## РАЗДЕЛ 13. BRAIN НЕ ИСПОЛНЯЕТ ДЕЙСТВИЯ

create_post/create_page/update_post/install/publish/delete/connect/approve — всегда live
DB/WP state (site tokens, wp_version, api_token из БД). Brain — только reasoning/context.
Проверка plugin_version: DB (sites.wp_version / опрос WP), не Brain.

## РАЗДЕЛ 14. CROSS-CUSTOMER (OPERATOR)

- Site agents: cross-customer search = DENY (router возвращает 403/пусто, счётчик
  `brain_cross_tenant_denied`).
- Operator/admin: отдельный privileged flow (admin role + явный флаг), агрегация по
  нескольким tenant-ам, логирование cross-tenant retrieval. Отдельный ключ/скоуп — при
  production switch.

## РАЗДЕЛ 15. OPENCLAW MEMORY POLICY (persistent instruction)

В SYSTEM_PROMPT.md + AGENTS.md (постоянная инструкция, не только chat):

```
Brain is the primary long-term memory.
Before answering questions that may depend on prior work, search Brain first.
Before making architectural/operational changes, retrieve relevant Brain decisions,
incidents and site facts.
After completing meaningful work, store new durable facts, decisions, incidents,
resolutions and lessons in Brain.
Do not store secrets.
Do not treat Brain as authoritative for operational state. Verify live operational
state through DB/API/WP before actions.
```

Инструменты: brain__search_knowledge (свободный вопрос), brain__graph_retrieve (известные
entities), brain__get_entity_timeline (история), brain__record_fact/brain__record_decision
(запись), brain__retract_fact (коррекция). Не выдумывать имена инструментов.

---

## РАЗДЕЛ 16. ROLLOUT (phased, без destructive migration)

| Фаза | Что | Статус |
|---|---|---|
| PHASE 1 | Brain read-only + MEMORY.md fallback; router read path в chat | ✅ развёрнута в 0.6.0 (2026-08-18) |
| PHASE 2 | Brain read + dual write (outbox); MEMORY.md не обновляется автоматически | ✅ outbox live: 30 completed / 0 failed |
| PHASE 3 | Brain primary; MEMORY.md fallback only (+ маркер) | ⏳ не запускалась (нужно решение Евгения) |
| PHASE 4 | Убрать flat-memory логику из retrieval path | ⏳ после периода стабильности |

Каждая фаза: backup Auth DB + SurrealDB volumes перед переключением. Rollout 2026-08-18: backup v20 (SHA256 5e0e1c0b…), soak 60 мин 12 точек, restarts=0, 5xx=0.

## РАЗДЕЛ 17. PRODUCTION SAFETY CHECKLIST (до switch)

- [x] backup Auth DB; [x] backup SurrealDB volumes
- [x] brain tools verified; [x] isolation tests PASS; [x] outage PASS; [x] outbox retry PASS
- [x] secret sanitizer PASS; [x] chat regression PASS; [x] create_post regression PASS (post 87)
- [x] UI Cards regression PASS; [x] site reconnect regression PASS (job.yousite.agency, код v7Ai8clj)
- [x] токены WordPress не меняются; production sites не переподключаются (кроме согласованного reconnect)

---

## РАЗДЕЛ 18. TEST PLAN (candidate)

Тесты кандидата — в `candidate/memory-router/tests/`, запуск скриптом. См. README кандидата
и итоговый отчёт (раздел 22 задания): A isolation, B cross-site, C site-specific,
D DB-vs-Brain, E outage, F sanitizer, G duplicate retry.

Ограничение candidate-фазы: реальные multi-tenant тесты требуют новых ключей Brain
(env BRAIN_API_KEYS + рестарт продового контейнера) — ЗАПРЕЩЕНО в этой фазе (INV-7).
Поэтому: A/B/C проверяются на router-уровне (mock brain с per-company хранилищем) +
структурная невозможность cross-tenant подтверждается на живом Brain (400 при чужом
companyId в path). E/F/G — против реального Brain (существующий ключ, core-tenant smoke,
данные очищаются после).
