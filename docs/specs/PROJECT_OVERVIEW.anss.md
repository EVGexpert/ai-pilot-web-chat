# AI PILOT — Project Overview & Workflow

## AI-Native System Specification

**Версия:** 2.1.0
**Статус:** Active
**Дата:** 2026-08-31
**Проект:** AI Pilot — AI-ассистент для управления WordPress-сайтами
**Автор:** Евгений (EVGexpert)
**Оркестратор:** Zero (OpenClaw)

---

## Оглавление

1. [О проекте](#1-о-проекте)
2. [Архитектура](#2-архитектура)
3. [Компоненты](#3-компоненты)
4. [Воркфлоу](#4-воркфлоу)
5. [Agent UI Cards](#5-agent-ui-cards)
6. [Dual-Mode Authoring](#6-dual-mode-authoring)
7. [Инфраструктура](#7-инфраструктура)
8. [Текущий статус](#8-текущий-статус)
9. [Инварианты](#9-инварианты)
10. [Ссылки](#10-ссылки)

---

# 1. О ПРОЕКТЕ

## 1.1 Что это

**AI Pilot** — платформа, где владельцы WordPress-сайтов управляют контентом через чат с AI-ассистентом. Без админок, без сложных интерфейсов — просто диалог.

Клиент пишет: *"Добавь блок с отзывами на главную страницу"* — агент анализирует сайт, предлагает изменения, клиент подтверждает одной кнопкой.

## 1.2 Принцип

- **Chat-first** — единственный интерфейс для пользователя
- **Human-in-the-loop** — агент предлагает, человек подтверждает
- **Site-native** — работает с реальным WordPress через REST API
- **Dual-mode** — поддерживает любые сайты: с AI Pilot Blocks, с ядром Gutenberg, с классическим редактором, с билдерами (Elementor/Bricks)

## 1.3 Кто использует

| Роль | Кто | Что делает |
|------|-----|------------|
| **Admin** | Евгений | Видит все сайты, управляет системой |
| **Client** | Владелец WP-сайта | Общается с AI, подтверждает действия |
| **AI Agent (Zero)** | OpenClaw оркестратор | Анализирует, предлагает, исполняет |

---

# 2. АРХИТЕКТУРА

## 2.1 Обзор системы

```
┌─────────────────────────────────────────────────────────┐
│                    Браузер клиента                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Web Chat (Vue 3 + Tailwind v4)        │    │
│  │  ┌──────────┐  ┌───────────────────────────┐   │    │
│  │  │ Sidebar  │  │ Chat (messages + cards)   │   │    │
│  │  │ History  │  │ Agent UI Cards            │   │    │
│  │  │ Sites    │  │ Action Proposals          │   │    │
│  │  └──────────┘  └───────────────────────────┘   │    │
│  └───────────────────┬─────────────────────────────┘    │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Caddy (Reverse Proxy + TLS)                  │
│  pilotsite.ru → Gateway:18789                            │
│  chat.pilotsite.ru → web-chat:3000                       │
└──────┬───────────────────────────────┬───────────────────┘
       │                               │
       ▼                               ▼
┌──────────────────┐         ┌────────────────────────────┐
│  Auth API        │         │   Web Chat (Nginx)         │
│  (Express.js)    │         │   Static files             │
│                  │         └────────────────────────────┘
│  • JWT auth      │
│  • Site registry │
│  • Mode Router   │
│  • Chat proxy    │
│  • Agent UI API  │
│  • Proposal store│
│  • SQLite DB     │
└────────┬─────────┘
         │ HTTP (Gateway token)
         ▼
┌──────────────────────────────────────────────────────────┐
│              OpenClaw Gateway ( port 18789)               │
│                                                          │
│  Agent: Zero (main)                                      │
│  Model: DeepSeek V4 Flash / GLM-5.1                     │
│  Skills: WP, design, coding, debugging                   │
│  MCP: GitHub, Code Index, SQL                            │
│                                                          │
│  → спавнит субагентов для сайтов                         │
│  → делегирует задачи в OpenCode                          │
└──────────────────────────────────────────────────────────┘
         │ REST API (Bearer token)
         ▼
┌──────────────────────────────────────────────────────────┐
│           WordPress Plugin (Remote Site API)              │
│                                                          │
│  /agent/context     — структура + soul + memory          │
│  /agent/scan        — посты, страницы, плагины           │
│  /agent/capabilities — capability profile (v1.1)         │
│  /agent/propose     — action proposal                    │
│  /agent/approve     — выполнение действия                │
│  /agent/ui-create   — Agent UI Cards (new!)              │
└──────────────────────────────────────────────────────────┘
```

## 2.2 Поток данных

```
Пользователь пишет сообщение
  → Web Chat отправляет POST /api/chat/send в auth-api
    → auth-api проверяет JWT, находит site по URL
      → Загружает capability profile (из кэша или /agent/capabilities)
        → Собирает system prompt (mode snippet + context)
          → Отправляет в OpenClaw Gateway
            → Zero (AI Agent) анализирует запрос
              → При необходимости: читает сайт через WP REST API
              → Формирует ответ или proposal
            ← Возвращает ответ
          ← auth-api сохраняет в БД
        ← Web Chat отображает сообщение / карточку
      ← Пользователь видит результат
```

---

# 3. КОМПОНЕНТЫ

## 3.1 Auth API (backend)

| | |
|---|---|
| **Репозиторий** | [github.com/EVGexpert/ai-pilot-auth-api](https://github.com/EVGexpert/ai-pilot-auth-api) |
| **Стек** | Node.js 24 + Express.js + SQLite (node:sqlite) |
| **Порт** | 3001 (Docker) |
| **Роль** | Оркестратор: JWT auth, site registry, Mode Router, chat proxy, proposal store |

**Ключевые модули:**

| Модуль | Назначение |
|--------|------------|
| `/routes/auth.js` | Регистрация, логин, refresh, logout |
| `/routes/sites.js` | Connect по коду, список сайтов |
| `/routes/chat.js` | Прокси к Gateway, кэш контекста, system prompt builder |
| `/routes/agent-ui.js` | Agent UI Cards CRUD + respond |
| `/src/db/` | 9 модулей: users, sites, sessions, proposals, connect_codes, capability_cache, agent_ui_cards, action_requests, schema |
| `/src/middleware/auth.js` | JWT проверка + adminOnly |
| `/src/chat/` | prompt builder, context fetcher, mode router |
| `/src/utils/` | fetchWithTimeout, action parsers, background jobs |

**Схема БД (v23):**

| Таблица | Назначение |
|---------|------------|
| `users` | Пользователи (email, password_hash, role) |
| `refresh_tokens` | JWT refresh tokens (SHA256 hash, rotation) |
| `sites` | WP-сайты (url, wp_token, cached_capabilities) |
| `connect_codes` | Одноразовые коды привязки (TTL 5 min) |
| `sessions` | Диалоги (site_id, title) |
| `messages` | Сообщения диалогов |
| `action_requests` | Proposals с idempotency (SHA256 dedup) |
| `agent_ui_cards` | UI карточки для агента |
| `customers` | Клиентские workspace (cus_<uid>, owner) |
| `customer_members` | Членство user→customer |
| `brain_tenants` | Маппинг customer → brain companyId (pending/provisioned) |
| `brain_tenant_keys` | ik_ ключи (key_enc AES-256-GCM, key_hash) |
| `brain_memory_outbox` | Асинхронные записи в Brain (payload_hash UNIQUE) |
| `schema_version` | Миграции (v23) |

## 3.2 Web Chat (frontend)

| | |
|---|---|
| **Репозиторий** | [github.com/EVGexpert/ai-pilot-web-chat](https://github.com/EVGexpert/ai-pilot-web-chat) |
| **Стек** | Vue 3 + Vite + Tailwind CSS v4 + Pinia |
| **Деплой** | Multi-stage Docker (Node 24 → Nginx Alpine) |
| **URL** | [chat.pilotsite.ru](https://chat.pilotsite.ru) |
| **Роль** | Пользовательский интерфейс чата |

**Архитектура UI (v2.0 — Tailwind v4 рефакторинг):**

```
App.vue
├── ChatLayout.vue (chat-ui/)
│   ├── ChatSidebar.vue
│   │   ├── ChatHistoryGroup.vue (Сегодня / Неделя / Месяц)
│   │   ├── UserProfileCard.vue
│   │   └── ThemeSwitcher.vue
│   ├── ChatMessages.vue
│   │   ├── ChatMessage.vue (markdown, code, actions)
│   │   ├── AssistantUiRenderer.vue (Agent UI Cards)
│   │   │   ├── AgentChoiceCard.vue (single/multi choice)
│   │   │   ├── AgentConfirmationCard.vue (yes/no)
│   │   │   └── MessageActions.vue
│   │   └── TypingDots.vue
│   └── ChatComposer.vue (ввод + отправка)
│
├── Composables (новое в v2.0)
│   ├── useChatApi.js       — REST API клиент (send, sessions, history)
│   ├── useGatewayClient.js — WebSocket обёртка над GatewayClient
│   └── useDevice.js        — определение устройства
│
└── Stores (Pinia)
    ├── authStore.js   — JWT, user, theme
    ├── sitesStore.js  — сайты, диалоги
    └── agentUi.js     — Agent UI Cards state + polling
```

**GatewayClient (переписан в v2.0):**

Полноценный WebSocket клиент:
- Exponential backoff (1s → 2s → 4s → ... → 30s max, 10 попыток)
- Message queue: offline-сообщения в очередь, flush при реконнекте
- Ack mechanism: messageId + pendingAcks, timeout 10s → возврат в очередь
- Event emitter: on/emit (message, fatal, open, close, reconnecting)

## 3.3 WordPress Plugin (Remote Site API)

| | |
|---|---|
| **Репозиторий** | [github.com/EVGexpert/ai-pilot-wp-plugin](https://github.com/EVGexpert/ai-pilot-wp-plugin) |
| **Стек** | PHP + WordPress REST API |
| **Версия** | 2.1.1+ |
| **Роль** | Мост между AI-агентом и WordPress-сайтом клиента |

**Эндпоинты:**

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/agent/context` | Полный контекст: site + soul + memory + structure |
| GET | `/agent/scan` | Сканирование: посты, страницы, плагины, тема, меню |
| GET | `/agent/capabilities` | **(new)** Capability profile v1.1 — authoring modes, extensions |
| GET | `/agent/memory` | История обращений AI |
| POST | `/agent/memory` | Запись в историю |
| GET | `/agent/soul` | Tone of Voice |
| PUT | `/agent/soul` | Обновление ToV |
| POST | `/agent/connect-code` | Создать одноразовый код (8 символов, 5 мин) |
| GET | `/agent/verify-code` | Проверить код, вернуть site URL + token |
| POST | `/agent/propose` | Создать proposal (action + diff) |
| GET | `/agent/pending` | Ожидающие proposals |
| POST | `/agent/approve/{id}` | Одобрить и выполнить |
| POST | `/agent/reject/{id}` | Отклонить |
| POST | `/agent/action` | Прямое действие (update_post, create_post, ...) |

**Capability Detection (new):**

Плагин определяет:
- Авторинг: Gutenberg core / classic HTML / builder-managed
- Расширения: AI Pilot Blocks (через WP_Block_Type_Registry + REST routes)
- Theme: FSE (Full Site Editing) / classic
- Health: diagnostics, performance hints

**Безопасность:**
- 17 опций в allowlist (остальные запрещены для AI)
- `admin_email` не возвращается в контексте
- Connect code не логируется
- Каждое действие требует capabilities check

## 3.4 OpenClaw Gateway (оркестратор AI)

| | |
|---|---|
| **Роль** | AI-шлюз, обработка LLM-запросов, управление агентами |
| **URL** | pilotsite.ru (wss://) |
| **Порт** | 18789 |
| **Модель** | DeepSeek V4 Flash (default), GLM-5.1 (текущая сессия) |
| **Агент** | Zero — основной оркестратор |

**Zero может:**
- Спавнить субагентов для конкретных сайтов
- Делегировать кодинг-задачи в OpenCode (exec/PTY)
- Работать с GitHub через MCP
- Искать по коду через Code Index MCP
- Читать SQL-базу через SQL MCP
- Использовать WP-скиллы (разработка, REST API, блоки, темы)

---

# 4. ВОРКФЛОУ

## 4.1 Подключение нового сайта

```
1. Клиент устанавливает AI Pilot Plugin на WordPress-сайт
2. В админке WP нажимает "Generate Connect Code"
   → Плагин создаёт 8-символьный код (TTL 5 мин)
3. Клиент открывает chat.pilotsite.ru
   → Регистрируется / логинится
   → Нажимает "Подключить сайт"
   → Вводит код
4. Auth API проверяет код через GET /agent/verify-code на сайте
   → Успех: создаёт site record (url + wp_token) в SQLite
   → Запрашивает /agent/capabilities → кэширует profile
   → Сайт появляется в сайдбаре чата
5. Клиент может начать диалог с AI
```

## 4.2 Обычный диалог

```
Клиент: "Какие страницы у меня на сайте?"

1. Web Chat → POST /api/chat/send { message, siteUrl }
2. Auth API:
   а. Проверяет JWT
   б. Находит site по URL
   в. Проверяет capability profile (TTL 1ч)
      → Если устарел: refresh через /agent/capabilities
   г. Собирает system prompt:
      - MODE_PROMPTS[defaultMode] (gutenberg_core / aipilot_blocks / ...)
      - Site context (structure, recent posts)
      - Soul (Tone of Voice)
   д. Отправляет в Gateway
3. Gateway (Zero):
   а. Анализирует запрос
   б. При необходимости: GET /agent/scan или /agent/context
   в. Формирует ответ
4. Ответ возвращается: Gateway → auth-api → Web Chat
5. Auth API сохраняет сообщение в sessions/messages
6. Клиент видит ответ в чате
```

## 4.3 Действие с подтверждением (Human-in-the-loop)

```
Клиент: "Добавь секцию с преимуществами на главную"

1. Zero анализирует:
   а. GET /agent/capabilities → доступные режимы авторинга
   б. GET /agent/context → текущая структура главной
   в. Определяет формат (Gutenberg blocks / classic HTML / AI Pilot Blocks)

2. Zero формирует proposal:
   а. Описание изменения (человеческое)
   б. Параметры: post_id, content, position
   в. Diff (что добавится / изменится)

3. Auth API создаёт action_request с idempotency_key (SHA256)

4. В чате появляется карточка:
   ┌─────────────────────────────────────┐
   │ 📝 Предложение изменения            │
   │                                     │
   │ Добавить секцию "Преимущества"      │
   │ после первого блока на главной      │
   │                                     │
   │ + <h2>Преимущества</h2>            │
   │ + <p>Быстро, надёжно, удобно</p>   │
   │                                     │
   │  [✅ Одобрить]  [❌ Отклонить]     │
   └─────────────────────────────────────┘

5. Клиент нажимает "Одобрить"
   → POST /agent/approve/{id}
   → WP Plugin выполняет update_post
   → Результат возвращается в чат

6. Или "Отклонить" → proposal закрыт, действие не выполнено
```

## 4.4 Agent UI Cards (интерактивные карточки)

```
Zero может показать карточку вместо текстового ответа:

Agent UI Card flow:
1. Zero вызывает POST /api/agent-ui/ui-create
   → type: single_choice | multi_choice | confirmation | form
   → options: [{ id, label, description }]
   → TTL: 5 минут

2. Карточка появляется в чате:
   ┌─────────────────────────────────────┐
   │ Какой формат предпочитаете?         │
   │                                     │
   │ ○ Gutenberg Blocks (рекомендуется)  │
   │ ○ Classic HTML                      │
   │ ○ AI Pilot Blocks                   │
   │                                     │
   │         [Выбрать]                   │
   └─────────────────────────────────────┘

3. Клиент выбирает → POST /api/agent-ui/ui-respond
   → Карточка закрывается
   → Server возвращает assistantResponse
   → Ответ агента появляется в ленте чата

Технически:
- Frontend: polling каждые 3 сек (GET /api/agent-ui/ui-active)
- Backend: site_url → site_id resolution
- Card dismiss: immediate при resolve
- option_id: snake_case
- assistantResponse + followUpMessage поддерживаются
```

## 4.5 CI/CD (деплой)

```
GitHub Push
  → GitHub Actions
    → SSH на VPS (193.176.78.35)
      → docker stop -t 30 (graceful)
      → Backup SQLite (если auth-api)
      → docker build && docker run
      → Health check (/api/health/db)
      → Rollback если БД пуста
      → Отчёт: users/sites/sessions/schema

Web Chat:  push to main → build → deploy
Auth API:  push to master → build → deploy
WP Plugin: ручная установка (через WP Admin / ZIP upload)
```

---

# 5. AGENT UI CARDS

Независимая система интерактивных карточек в чате. Не зависит от WordPress blocks.

| Kind | Компонент | Use case |
|------|-----------|----------|
| `single_choice` | AgentChoiceCard | 2-6 вариантов (один ответ) |
| `multi_choice` | AgentChoiceCard | 2-10 вариантов (несколько ответов) |
| `confirmation` | AgentConfirmationCard | Yes/No подтверждение |
| `form` | (future) | Структурированная форма |

**Безопасность:**
- Браузер отправляет только `option_id` (не значения)
- Исполняемые значения остаются на сервере
- TTL 5 минут, одноразовое разрешение
- Идемпотентность: resolved карточка иммутабельна

**Архитектура:**
- Backend: `agent_ui_cards` таблица, REST CRUD
- Frontend: `agentUi` Pinia store + polling (3 сек)
- При resolve: `assistantResponse` + `followUpMessage` добавляются в ленту чата

---

# 6. DUAL-MODE AUTHORING

Система определяет как редактировать контент на каждом конкретном сайте:

| Режим | Условие | Описание |
|-------|---------|----------|
| `aipilot_blocks` | Extension available | Типизированные компоненты + валидация |
| `gutenberg_core` | Default | Core/third-party Gutenberg blocks |
| `classic_html` | No block comments | Семантический HTML, shortcodes |
| `builder_managed` | Elementor/Bricks/Divi | Limited metadata, read + analysis |
| `readonly` | No write caps | Анализ, диагностика, рекомендации |

**Принцип:** Отсутствие AI Pilot Blocks — нормальное состояние, не ошибка. Сайт без расширения полностью функционален.

**Capability Profile (schema v1.1):**
```json
{
  "schemaVersion": "1.1",
  "connector": { "name": "AI Pilot Remote Site API", "version": "2.1.1" },
  "intelligence": { structure, contentList, contentRead, health, diagnostics, media },
  "authoring": {
    "write": true,
    "defaultMode": "gutenberg_core",
    "availableModes": ["gutenberg_core", "classic_html"]
  },
  "extensions": {
    "aipilotBlocks": { "available": false }
  },
  "agentUi": { "enabled": true }
}
```

---

# 7. ИНФРАСТРУКТУРА

## 7.1 Сервер

| Параметр | Значение |
|----------|----------|
| Хост | VPS 193.176.78.35 |
| Локация | Калининград, GMT+2 |
| Reverse Proxy | Caddy (авто-TLS) |
| Контейнеризация | Docker |

## 7.2 Домены

| Домен | Назначение | Прокси |
|-------|-----------|--------|
| `pilotsite.ru` | OpenClaw Gateway | → localhost:18789 |
| `chat.pilotsite.ru` | Web Chat | → localhost:3000 |

## 7.3 Контейнеры

| Контейнер | Образ | Порт |
|-----------|-------|------|
| `ai-pilot-chat` | ai-pilot-web-chat | 127.0.0.1:3000 |
| `ai-pilot-auth` | ai-pilot-auth-api | 127.0.0.1:3001 |
| `openclaw-gateway-1` | ghcr.io/openclaw/openclaw | 0.0.0.0:18789 |

## 7.4 Безопасность

- JWT (access 15min + refresh 7d, rotation)
- Refresh tokens: SHA256 hash, одноразовые
- Connect codes: per-IP rate limit (5/min), TTL 5 мин
- Idempotency: SHA256 dedup на action_requests
- Option allowlist (17 опций) на WP Plugin
- DOMPurify на v-html в Web Chat
- Gateway token: shared secret, только server-side
- `admin_email` убран из контекста

---

# 8. ТЕКУЩИЙ СТАТУС

## Что работает (Production)

| Компонент | Версия | Статус |
|-----------|--------|--------|
| Auth API | 0.6.0 (schema v23, node:sqlite) | ✅ Live |
| Web Chat | 0.1.4 (Tailwind v4, onboarding UX) | ✅ Live |
| WP Plugin | 2.3.0 (job.yousite.agency) / 2.2.2 (obelisk) | ✅ Live |
| Brain (память) | 0.8.1-aipilot1, introspection + dynamic ik_ keys | ✅ Live |
| Gateway (OpenClaw) | — | ✅ Live |
| JWT auth + refresh | — | ✅ |
| Site connect (codes + metadata) | 0.6.0 contract | ✅ |
| Capability detection | v1.1 | ✅ |
| Mode Router | — | ✅ |
| Agent UI Cards | v1.3 | ✅ |
| Action Proposals (+ реальное выполнение, идемпотентный replay) | — | ✅ |
| Brain memory outbox | 30 completed / 0 failed | ✅ |
| Динамическое provisioning tenant'ов | 0.6.0 | ✅ |
| CI/CD (GitHub Actions) | auth-api + web-chat | ✅ |
| Caddy TLS | — | ✅ |

## В процессе / Запланировано

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| PHASE 3 (Brain primary; MEMORY.md fallback only) | — | ⏳ ждёт решения |
| PHASE 2 memory (массовая миграция chats, cross-site поиск) | — | ⏳ не запускать без решения |
| Email верификация (SMTP) | Low | ⏳ |
| Connect-code UI в WP Admin | Medium | ⏳ баг (код не генерируется) |
| AI Pilot Blocks integration (Stage 5) | Future | 📋 |
| Builder adapters (Elementor/Bricks) | Future | 📋 |
| Telegram-канал | Low | ❌ Отложен |

---

# 9. ИНВАРИАНТЫ

Железобетонные правила системы. Нарушение = баг.

```
INV-001: Никаких паролей в открытом виде
         bcrypt hash, никогда не логировать

INV-002: Gateway Token не покидает сервер
         Только server-side env, никогда клиенту

INV-003: Connect Code одноразовый
         DELETE после использования, TTL 5 мин

INV-004: Idempotency всех действий
         SHA256 ключ, INSERT OR FAIL

INV-005: Human-in-the-loop для write operations
         Proposal → Approve → Execute

INV-006: Extension optionality
         Core не падает без AI Pilot Blocks

INV-007: Agent UI independence
         Карточки не зависят от WP blocks

INV-008: Browser submits IDs only
         Карточки отправляют optionId, не значения

INV-009: JWT только в памяти (Pinia)
         Не в localStorage, не в sessionStorage

INV-010: v-html только через DOMPurify
         Никаких исключений

INV-011: Кэш — временный, сайт — истина
         TTL 1 час, проверка актуальности

INV-012: No write without capabilities check
         Каждый write → capability verification
```

---

# 10. ССЫЛКИ

## Репозитории

| Репозиторий | URL |
|-------------|-----|
| Auth API | [github.com/EVGexpert/ai-pilot-auth-api](https://github.com/EVGexpert/ai-pilot-auth-api) |
| Web Chat | [github.com/EVGexpert/ai-pilot-web-chat](https://github.com/EVGexpert/ai-pilot-web-chat) |
| WP Plugin | [github.com/EVGexpert/ai-pilot-wp-plugin](https://github.com/EVGexpert/ai-pilot-wp-plugin) |

## Компонентные спецификации (ANSS)

| Спек | Файл |
|------|------|
| Dual-Mode Architecture | [`ai-pilot-dual-mode.anss.md`](./ai-pilot-dual-mode.anss.md) |
| Auth API | [`ai-pilot-auth-api.anss.md`](./ai-pilot-auth-api.anss.md) |
| Web Chat | [`ai-pilot-web-chat.anss.md`](./ai-pilot-web-chat.anss.md) |
| WP Plugin | [`ai-pilot-wp-plugin.anss.md`](./ai-pilot-wp-plugin.anss.md) |
| Brain-First Hybrid Memory | [`brain-first-hybrid-memory.anss.md`](./brain-first-hybrid-memory.anss.md) |
| Проект и бизнес-модель | [`ai-pilot-project-spec-and-business.md`](./ai-pilot-project-spec-and-business.md) |
| Change Spec: Onboarding 0.6.0 | [`onboarding-0.6.0-change-spec.md`](./onboarding-0.6.0-change-spec.md) |

## Документация

| Док | Расположение |
|-----|--------------|
| User Persistence Workflow | auth-api: `docs/USER_PERSISTENCE_WORKFLOW.md` |
| Deploy Healthcheck | auth-api: `docs/DEPLOY_HEALTHCHECK.md` |
| Connect Code Security | auth-api: `docs/CONNECT_CODE_SECURITY.md` |
| Security Env | auth-api: `docs/SECURITY_ENV.md` |
| Interaction Audit | wp-plugin: `docs/INTERACTION_AUDIT_2026-05-27.md` |

## Чаты и доступы

| Ресурс | URL |
|--------|-----|
| Web Chat | [chat.pilotsite.ru](https://chat.pilotsite.ru) |
| Gateway | pilotsite.ru (wss://) |

---

_Спецификация обновляется при изменении системы (ANSS §10 Change Specification)._
_Последнее обновление: 2026-08-31_
