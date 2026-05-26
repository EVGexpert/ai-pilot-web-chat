# AI Pilot — Архитектура подключения и передачи данных

> Дата: 2026-05-26 | Предыдущая версия: ARCHITECTURE.md (старый)

---

## 💎 Ключевые изменения

| Что | Было | Стало |
|-----|------|-------|
| **Gateway из фронта** | Прямой вызов `/v1/chat/completions` с VITE_GATEWAY_TOKEN | Только через Auth API. Gateway токен на сервере |
| **Nginx** | `/v1/` прокси в Gateway | Удалён — Gateway недоступен из браузера |
| **Approve/reject** | Только audit log | Реальное выполнение через WP Plugin `/agent/propose` → `/agent/approve/{id}` |
| **Action parsing** | Эвристика (`detectActionIntent`) | Структурированный JSON через ```` ```action ```` блоки + `ACTION_SCHEMA` валидация |
| **Валидация** | Нет | JSON Schema + `validateActionJson()` |
| **session_summary** | Нет | Авто-обновление для длинных сессий (>12 сообщений) |
| **site_memory** | Нет | Таблица `site_memory` (v7), добавляется в системный промпт |
| **Schema БД** | v3 | v7 (config, summary, cached_columns, site_memory) |
| **Деплой** | `$(pwd)/auth-data` (относительный) | `/root/ai-pilot-web-chat/auth-data` (абсолютный) |
| **GitHub Actions** | `appleboy/ssh-action@v1.2.0` | `@v1.2.1` + `script_stop` + `git stash --include-untracked` |

---

## Схема компонентов

```
┌──────────────────────────────────────────────┐
│  WordPress (obelisk.evgexpert.ru)            │
│  AI Pilot Plugin (v2.1.1)                    │
│  Endpoints: /propose, /approve, /reject      │
│  Auth: X-AI-Pilot-Token header + wp_hash     │
└─────────────────┬────────────────────────────┘
                  │ HTTPS
                  ▼
┌──────────────────────────────────────────────┐
│  VPS — pilotsite.ru (193.176.78.35)          │
│                                              │
│  ┌──────────┐   ┌──────────────────────┐     │
│  │  Caddy   │──▶│  Vue 3 Frontend      │     │
│  │  :443    │   │  chat.pilotsite.ru   │     │
│  │  HTTPS   │   │                      │     │
│  └────┬─────┘   │  /api/* → Auth API   │     │
│       │         └──────────────────────┘     │
│       │         ⚠️ Прямой вызов Gateway      │
│       │         удалён. VITE_GATEWAY_TOKEN    │
│       │         не существует                 │
│       ▼                                      │
│  ┌────────────────────┐    ┌──────────────┐  │
│  │  Auth API (:3001)  │◀──▶│  SQLite      │  │
│  │  Fastify + JWT     │    │  aipilot.db  │  │
│  │                    │    │  v7 schema   │  │
│  │  Функции:          │    │              │  │
│  │  ├── login/register│    │  Tables:     │  │
│  │  ├── chat/send     │    │  ├─ users    │  │
│  │  ├── actions/approve│   │  ├─ sites    │  │
│  │  ├── actions/reject│   │  ├─ messages  │  │
│  │  ├── site_memory   │    │  ├─ sessions │  │
│  │  └── audit_log     │    │  ├─ jobs     │  │
│  │                    │    │  ├─ audit    │  │
│  │  Gateway token     │    │  ├─ config   │  │
│  │  только тут (env)  │    │  └─ memory   │  │
│  └────────┬───────────┘    └──────────────┘  │
│           │                                   │
│           ▼                                   │
│  ┌────────────────────┐                       │
│  │  Gateway (:18789)  │◀── DeepSeek V4 Flash  │
│  │  OpenClaw          │                       │
│  │  Token auth        │                       │
│  └────────────────────┘                       │
│                                               │
│  Docker контейнеры:                            │
│  ├── ai-pilot-chat     (Nginx + статика)       │
│  ├── ai-pilot-auth     (Fastify + SQLite)      │
│  ├── openclaw-gateway-1                        │
│  ├── ollama                                    │
│                                               │
│  Volume: /root/ai-pilot-web-chat/auth-data     │
└──────────────────────────────────────────────┘
```

---

## Поток данных — отправка сообщения

### Все пользователи (админ + клиент) — через единый endpoint

```
1. POST /api/auth/login     → Auth API → JWT
2. POST /api/chat/send      → Auth API (JWT verify)
   {
     message: "создай пост...",
     siteUrl: "https://obelisk.evgexpert.ru",
     sessionId: "..."
   }

   Auth API:
   ├── findSiteByUserAndUrl()  → site
   ├── findOrCreateSession()   → session
   ├── getSiteMemory()         → память сайта
   ├── getMessagesBySession()  → последние 12 сообщений
   ├── session.summary         → если история длинная
   ├── buildSystemPrompt()     → системный промпт + контекст
   ├── FETCH Gateway           → model response
   ├── parseActions()          → парсинг ```action JSON
   ├── updateSessionSummary()  → авто-обновление summary
   └── return { message, actions, sessionId }

3. Gateway → DeepSeek V4 Flash → Ответ
```

### Каждое сообщение в промпте получает:

```text
1. Системный промпт           (правила + инструкция JSON)
2. Контекст сайта (кэш)       (название, WP версия, плагины, посты)
3. Память сайта (site_memory) (предпочтения, запреты, решения)
4. Summary сессии            (если > 12 сообщений)
5. Последние 8-16 сообщений   (полный текст)
6. Текущее сообщение          (с префиксом [client:URL])
```

---

## Action Proposal — полный цикл

```
1. Модель возвращает ответ с блоком ```action

   \`\`\`action
   {
     "answer": "Я подготовил...",
     "actions": [{
       "type": "create_post",
       "target": {"title": "Новый пост"},
       "patch": {"content": "Текст"},
       "requires_approval": true
     }]
   }
   \`\`\`

2. Auth API.parseActions() извлекает JSON:
   - Валидирует через ACTION_SCHEMA
   - Создаёт action объекты с raw (type, target, patch)
   - Возвращает cleanContent (без JSON-блока)

3. Frontend рендерит ActionProposalCard
   - Показывает diff изменений
   - Кнопки Approve / Reject

4. User нажимает Approve
   → POST /api/chat/actions/approve
     { actionId, sessionId, siteUrl, action: { type, target, patch } }

5. Auth API.executeWpAction():
   ├── POST /wp-json/aipilot/v1/agent/propose  (создать proposal)
   └── POST /wp-json/aipilot/v1/agent/approve/{id}  (выполнить)

6. Audit event пишется в audit_events
```

---

## Структура БД (schema v7)

```sql
-- v4: config
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT, ...);

-- v5: summary
ALTER TABLE chat_sessions ADD COLUMN summary TEXT;
ALTER TABLE chat_sessions ADD COLUMN summary_updated_at TEXT;

-- v6: cached columns for sites
ALTER TABLE sites ADD COLUMN cached_structure TEXT;
ALTER TABLE sites ADD COLUMN cached_soul TEXT;
ALTER TABLE sites ADD COLUMN cached_at TEXT;
ALTER TABLE sites ADD COLUMN verified INTEGER;

-- v7: site_memory
CREATE TABLE site_memory (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT DEFAULT 'agent',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id),
  UNIQUE(site_id, key)
);
```

---

## Эндпоинты Auth API (полный список)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход → JWT + sites |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/auth/me` | Инфо о пользователе + его сайты |
| POST | `/api/chat/send` | Отправить сообщение (через Gateway) |
| GET | `/api/chat/sessions` | Список сессий с превью |
| POST | `/api/chat/new` | Новая сессия |
| GET | `/api/chat/history` | История сообщений |
| POST | `/api/chat/actions/approve` | Подтвердить действие → WP |
| POST | `/api/chat/actions/reject` | Отклонить действие (audit) |
| GET | `/api/sites` | Список сайтов пользователя |
| POST | `/api/sites/connect` | Подключить сайт |
| GET | `/api/sites/:id/memory` | Память сайта (с WP) |
| POST | `/api/sites/:id/memory` | Запись в site_memory |
| GET | `/api/sites/:id/memory-local` | Чтение site_memory |
| GET | `/api/stats` | Статистика (без авторизации) |
| POST | `/api/backup` | Бэкап БД |
| GET | `/api/health` | Health check |

---

## Эндпоинты WP Plugin (v2.1.1)

| Метод | Путь | Capability |
|-------|------|------------|
| GET | `/wp-json/aipilot/v1/agent/context` | site_info |
| GET | `/wp-json/aipilot/v1/agent/scan` | site_info |
| POST | `/wp-json/aipilot/v1/agent/memory` | site_info |
| POST | `/wp-json/aipilot/v1/agent/propose` | full_access |
| GET | `/wp-json/aipilot/v1/agent/pending` | site_info |
| POST | `/wp-json/aipilot/v1/agent/approve/{id}` | full_access |
| POST | `/wp-json/aipilot/v1/agent/reject/{id}` | full_access |
| GET | `/wp-json/aipilot/v1/agent/proposal/{id}` | site_info |
| GET | `/wp-json/aipilot/v1/overview` | site_info |
| HEAD | `/wp-json/aipilot/v1/agent/status` | site_info |

---

## Деплой (GitHub Actions)

```yaml
name: Auto Deploy
on: push → main

jobs:
  deploy:
    # appleboy/ssh-action@v1.2.1
    # SSH → git pull → docker build → docker run

    # Volume: /root/ai-pilot-web-chat/auth-data → /app/data
    # (абсолютный путь, не зависит от $PWD)

    # JWT_SECRET и GATEWAY_TOKEN — hardcoded в deploy.yml
    # (заменить на GitHub Secrets при необходимости)
```

---

## Безопасность

- ✅ Gateway токен — только на сервере, не в JS-бандле
- ✅ WP токен — не передаётся в системный промпт
- ✅ JWTs — 7 дней, секрет в БД (auto-generated)
- ✅ Rate limiting — 20 запросов/мин на auth endpoint
- ✅ Human-in-the-loop — действия выполняются только после approve
- ✅ Audit log — все approve/reject логируются
- ⚠️ WP токен хранится в БД открыто (не зашифрован)

---

## Текущие ограничения

1. **WP Plugin на obelisk** — не обновлён до v2.1.1
2. **Модель не всегда возвращает ```action JSON** — донастройка промпта
3. **Нет стриминга** — ответ приходит целиком
4. **Нет token rotation** — токены не ротируются
5. **Нет rollback** — изменения WP нельзя откатить
