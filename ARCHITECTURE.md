# AI Pilot — Архитектура подключения и передачи данных

> Дата аудита: 2026-05-25

---

## Схема компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│           КЛИЕНТСКИЙ СЕРВЕР (45.130.41.118)                     │
│  ┌──────────────────────────────┐                              │
│  │  WordPress (obelisk.evgexpert.ru)                            │
│  │  ┌────────────────────────┐  │                              │
│  │  │ AI Pilot Plugin (v1)   │  │  REST API эндпоинты:         │
│  │  │                        │  │  GET  /agent/context         │
│  │  │  X-AIPILOT-Token: ❌   │  │  GET  /agent/scan            │
│  │  │  (pending)             │  │  POST /agent/memory          │
│  │  └────────────────────────┘  │  POST /agent/propose         │
│  │  ┌────────────────┐          │                              │
│  │  │ WP Options     │          │                              │
│  │  │ aipilot_api_*  │          │                              │
│  │  └────────────────┘          │                              │
│  └──────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│           VPS — pilotsite.ru (193.176.78.35)                   │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌─────────────────────┐       │
│  │  Caddy   │───▶│  Nginx   │───▶│  Vue 3 Frontend     │       │
│  │  :443    │    │  :3000   │    │  chat.pilotsite.ru  │       │
│  │  HTTPS   │    │  (Docker)│    │  authStore:         │       │
│  └────┬─────┘    └────┬─────┘    │  token + gatewayToken│       │
│       │               │          └─────────────────────┘       │
│       │ /v1/*         │ /api/*                                 │
│       ▼               ▼                                         │
│  ┌──────────┐    ┌─────────────────┐      ┌──────────────┐     │
│  │ Gateway  │    │  Auth API       │◀────▶│  SQLite      │     │
│  │  :18789  │◀──▶│  :3001          │      │  aipilot.db  │     │
│  │  Token   │    │  JWT + Chat     │      │  Volume:     │     │
│  │  Auth    │    │  Proxy          │      │  auth-data/  │     │
│  └────┬─────┘    └────────┬────────┘      └──────────────┘     │
│       │                   │                                      │
│       ▼                   │ (фоновый sync)                       │
│  ┌──────────┐             ▼                                      │
│  │DeepSeek  │     WordPress Plugin (через REST)                  │
│  │V4 Flash  │                                                    │
│  │(API)     │                                                    │
│  └──────────┘                                                    │
│                                                                 │
│  Docker контейнеры:                                              │
│  ├── ai-pilot-chat     (Nginx + статика)                        │
│  ├── ai-pilot-auth     (Fastify + SQLite)                       │
│  ├── openclaw-openclaw-gateway-1                                │
│  └── ollama                                                     │
│                                                                 │
│  Docker networks: aipilot (chat + auth), default (gateway)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Поток данных — отправка сообщения

### Админский чат (Zero → Gateway напрямую)

```
Браузер → POST https://chat.pilotsite.ru/v1/chat/completions
         → Caddy → Gateway (:18789) → DeepSeek
         → Ответ (stream)
```

- Токен: `VITE_GATEWAY_TOKEN` из JS-бандла (env build-time)
- Без Auth API, без JWT
- Admin видит сайдбар, историю клиентов

### Клиентский чат (через Auth API)

```
1. POST /api/auth/login → Auth API → JWT + gatewayToken
2. POST /api/chat/send  → Auth API (JWT verify)
   Auth API → Gateway (:18789) → DeepSeek
3. Ответ: { message, actions, agentId, sessionId }
```

- JWT верифицируется через `verifyToken()` (секрет из БД)
- `gatewayToken` возвращается при логине, сохраняется в `authStore`
- Если модель предложила действие — `detectActionIntent()` генерирует `actions[]`
- Фронт рендерит `ActionProposalCard` для каждого action

---

## Ключи и токены

| Токен | Где хранится | Как передаётся | Статус |
|-------|-------------|----------------|--------|
| **GATEWAY_TOKEN** | Env контейнера | `docker run -e` | ⚠️ Можно забыть при перезапуске |
| **JWT_SECRET** | SQLite → `config → jwt_secret` | Автогенерация при 1-м запуске | ✅ Вечен |
| **X-AIPILOT-Token** | WP Options (`wp_hash`) | Генерация в админке WP | ❌ Pending (obelisk) |
| **User JWT** | localStorage (браузер) | Login → Auth API | ✅ 7d expiry |

---

## Компоненты

| Компонент | Контейнер | Порт | Сеть | Назначение |
|-----------|-----------|------|------|------------|
| Frontend (Vue 3 + Nginx) | `ai-pilot-chat` | 3000→80 | aipilot | Статика, SPA |
| Auth API (Fastify) | `ai-pilot-auth` | 3001 | aipilot | JWT + Chat proxy |
| SQLite | — | — | Volume | БД (users, sites, messages, config, jobs) |
| Gateway (OpenClaw) | `openclaw-openclaw-gateway-1` | 18789 | default | DeepSeek V4 Flash |
| Caddy | — (хост) | 443 | — | HTTPS, reverse proxy |

---

## Эндпоинты Auth API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход → JWT + gatewayToken + sites |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/chat/send` | Отправить сообщение клиента |
| GET | `/api/chat/sessions` | Список сессий |
| POST | `/api/chat/new` | Новая сессия |
| GET | `/api/chat/history` | История сообщений |
| GET | `/api/chat/prompt` | Системный промпт |
| GET | `/api/sites` | Список сайтов пользователя |
| GET | `/api/health` | Health check |

---

## Эндпоинты WP Plugin

| Метод | Путь | Capability |
|-------|------|------------|
| GET | `/wp-json/aipilot/v1/agent/context` | site_info |
| GET | `/wp-json/aipilot/v1/agent/scan` | site_info |
| POST | `/wp-json/aipilot/v1/agent/memory` | site_info |
| POST | `/wp-json/aipilot/v1/agent/propose` | full_access |
| POST | `/wp-json/aipilot/v1/agent/approve/{id}` | full_access |
| POST | `/wp-json/aipilot/v1/agent/reject/{id}` | full_access |
| POST | `/wp-json/aipilot/v1/agent/action` | full_access |

---

## Системный промпт

Источник правды: [`SYSTEM_PROMPT.md`](./SYSTEM_PROMPT.md)

Используется:
- `auth-api/src/config/prompt.js` — импорт в `chat.js` (client flow)
- `web-chat/src/api/gatewayClient.js` — константа (admin flow)

Содержит:
- Правила: не выполнять действия, только предлагать
- Формат action proposal (через `detectActionIntent`)
- Запрет на ответы про инфраструктуру AI Pilot

---

## Action Proposal Card

Новый компонент: [`ActionProposalCard.vue`](./projects/web-chat/src/components/ActionProposalCard.vue)

### Состояния

| Состояние | Описание | Отображает |
|-----------|----------|------------|
| `pending` | Ожидает решения | Кнопки «Подтвердить» / «Отмена» |
| `approved` | Подтверждено | Чип 🟢 Подтверждено |
| `rejected` | Отклонено | Чип 🔴 Отменено |
| `completed` | Выполнено | Чип 🟢 Выполнено |

### Детекция намерений (без дообучения модели)

```javascript
detectActionIntent(content, userMsg) {
  // 1. Пользователь запросил действие? (actionKeywords)
  // 2. Модель согласилась/предложила? (agreePhrases)
  // 3. Генерация diff из ответа
  // 4. Возврат action[]
}
```

---

## Известные проблемы

1. **WP Plugin на obelisk** — не обновлён (v1), `api_token: pending`
   - Auth API не может получить контекст и писать память
   - `refresh_context` и `sync_wp_memory` jobs падают

2. **GATEWAY_TOKEN в env** — при перезапуске контейнера нужно явно передавать
   - Фикс: хранить в БД как JWT_SECRET (таблица `config`)

3. **schema_version расходится** — таблица `sites` не имеет колонки `cached_structure`
   - `refresh_context` job падает с `no such column: cached_structure`
   - Нужна миграция БД

4. **detectActionIntent эвристический** — может не сработать если модель
   - не использует слова «предлагаю», «давай», «сделаю»
   - формулирует иначе

5. **SYSTEM_PROMPT.md** — единый источник, но не читается динамически
   - auth-api зашивает в код при сборке
   - gatewayClient — константа в JS
