# AI Pilot — Архитектура и взаимодействие системы
## Audit Document v1.0 · 2026-05-21

---

## 1. Общая архитектура

```
┌─────────────────────┐      HTTPS/WSS      ┌──────────────┐
│  chat.pilotsite.ru  │ ◀──────────────────▶ │  pilotsite   │
│  (Vue 3 + Nginx)    │                     │  (Gateway)   │
│                     │                     │  DeepSeek V4 │
│  ai-pilot-chat      │                     │  Flash       │
│  (Docker контейнер) │                     └──────┬───────┘
└─────────┬───────────┘                            │
          │ /api/*                                  │
          ▼                                         │
┌──────────────────────┐                            │
│  ai-pilot-auth       │  JWT + SQLite              │
│  (Docker контейнер)  │                            │
│  порт 3001            │                            │
└──────────┬───────────┘                            │
           │ HTTP (host.docker.internal:18789)       │
           └─────────────────────────────────────────┘
                      ▲                              │
                      │ HTTPS                        │
                      ▼                              ▼
           ┌──────────────────────┐
           │  WordPress Site      │
           │  (AI Pilot Plugin)   │
           │  obelisk.evgexpert.ru│
           └──────────────────────┘
```

---

## 2. WordPress Plugin (v2.1.0)

### Назначение
Подключает WordPress-сайт к AI Pilot, предоставляет REST API для удалённого управления.

### REST Endpoints (namespace: `/wp-json/aipilot/v1`)

| Endpoint | Method | Auth | Назначение |
|----------|--------|------|------------|
| `/ping` | GET | Нет | Health check, версия плагина |
| `/agent/connect-code` | POST | **Нет (публичный)** | Генерирует одноразовый код + API токен |
| `/agent/verify-code?code=XXX` | GET | Нет | Проверяет код, возвращает токен |
| `/agent/context` | GET | X-AI-Pilot-Token | Контекст сайта (структура, soul, память) |
| `/agent/scan` | GET | X-AI-Pilot-Token | Сканирование сайта (посты, плагины, тема) |
| `/agent/memory` | GET/POST | X-AI-Pilot-Token | Чтение/запись истории обращений |
| `/agent/action` | POST | X-AI-Pilot-Token | Выполнение действий (create_post, update_option и др.) |
| `/agent/propose` | POST | X-AI-Pilot-Token | Human-in-the-loop: предложение действия |
| `/agent/pending` | GET | X-AI-Pilot-Token | Список ожидающих proposals |
| `/site` | GET | X-AI-Pilot-Token | Информация о сайте |
| `/agent/soul` | GET/PUT | X-AI-Pilot-Token | Tone of Voice настройки |

### Механизм подключения (connect-code flow)
1. Клиент нажимает «Подключить к AI Pilot» в админке WP
2. JS-скрипт вызывает `POST /wp-json/aipilot/v1/agent/connect-code` (публичный)
3. Плагин генерирует:
   - API токен (64 символа, `wp_generate_password`)
   - Одноразовый код (8 символов, 5 минут)
   - Сохраняет токен в `wp_options`
4. Открывается попап: `chat.pilotsite.ru/connect?code=XXX&site=URL`
5. Auth API верифицирует код через `GET /agent/verify-code`
6. WP возвращает `{verified, site_url, site_name, token}`
7. Auth API сохраняет сайт с токеном в SQLite
8. Попап показывает успех

### ⚠️ Важно: публичный connect-code
С версии 2.1.0 endpoint `/agent/connect-code` не требует аутентификации. Это сделано для бустрапа — чтобы подключить сайт, на котором ещё нет сохранённого токена. Безопасность обеспечивается:
- Одноразовым кодом (8 символов, 5 минут)
- Привязкой к URL сайта при верификации

### API Token
- Хранится в `wp_options` (`aipilot_last_token`)
- Хеш токена: `aipilot_api_token_hash` (через `wp_hash`)
- Передаётся в заголовке `X-AI-Pilot-Token`
- Разрешения: `site_info`, `posts_read/create/update/delete`, `plugins_*`, `themes_*`, `options_*` и др.

---

## 3. Auth API (v0.2.0)

### Технологии
- **Runtime:** Node.js 24, Fastify
- **БД:** SQLite (sql.js — WASM, без native модулей)
- **Auth:** JWT (jsonwebtoken) + crypto.scryptSync для паролей
- **Deploy:** Docker, multi-stage build

### База данных (SQLite)

```sql
-- Пользователи
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'client',  -- 'admin' | 'client'
  email_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Сайты клиентов
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,         -- FK → users.id
  url TEXT NOT NULL,
  name TEXT,
  api_token TEXT,                -- токен для WP API
  wp_version TEXT,               -- версия WordPress
  verified INTEGER DEFAULT 0,
  cached_structure TEXT,         -- JSON, кэш структуры
  cached_soul TEXT,              -- JSON, кэш Tone of Voice
  cached_at TEXT,                -- время кэша
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Коды верификации email
CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Сессии чата
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_id TEXT,                  -- FK → sites.id
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Сообщения чата (история)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,      -- FK → chat_sessions.id
  role TEXT NOT NULL,            -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  metadata TEXT,                 -- JSON
  source TEXT DEFAULT 'gateway',
  created_at TEXT NOT NULL
);
```

### REST API Endpoints

#### Auth (`/api/auth`)
| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/login` | Нет | Вход: `{email, password}` → `{token, user, sites}` |
| POST | `/register` | Нет | Регистрация: `{email, password, name}` |
| POST | `/verify-email` | Нет | Подтверждение email по коду |
| GET | `/me` | JWT | Профиль + список сайтов |

#### Sites (`/api/sites`)
| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/connect-code` | JWT | Подключение по одноразовому коду |
| POST | `/connect` | JWT | Подключение с прямым токеном |
| GET | `/` | JWT | Список сайтов (админ видит все) |
| GET | `/:id` | JWT | Информация о сайте |
| POST | `/scan` | JWT | Сканирование сайта (прокси на WP) |
| GET | `/:id/memory` | JWT | История обращений с WP |
| PATCH | `/:id/token` | JWT | Обновить API токен сайта |
| DELETE | `/:id` | JWT | Удалить сайт |

#### Chat (`/api/chat`)
| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/send` | JWT | Отправить сообщение → Gateway → ответ |
| GET | `/history` | JWT | История сообщений |

#### System
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Статистика БД |

### Поток отправки сообщения (`POST /api/chat/send`)
1. **Проверка JWT** — `authGuard`
2. **Поиск сайта** — `findSiteByUserAndUrl(userId, siteUrl)`
3. **Проверка API токена** — если `pending` или отсутствует → 400
4. **Создание сессии** — `findOrCreateSession(userId, siteId)`
5. **Кэш контекста** — если есть кэш (< 1 часа), используем
6. **Фоновое обновление** — `refreshContextCache()` fire-and-forget (3s timeout)
7. **Сборка промпта** — `buildSystemPrompt(site, url, message, context)`
8. **Сохранение сообщения** — в `messages` таблицу
9. **Запрос к Gateway** — POST `/v1/chat/completions`
   - `model: openclaw`
   - `messages: [{role: system, content: контекст}, {role: user, content: [client:URL] сообщение}]`
   - Таймаут: 30 секунд (AbortController)
10. **Сохранение ответа** — в `messages` таблицу
11. **WP Memory** — fire-and-forget: `POST /wp-json/aipilot/v1/agent/memory`

### JWT Authentication
- Алгоритм: HS256
- Секрет: из переменной окружения `JWT_SECRET`
- Срок: 7 дней
- Payload: `{sub: userId, role: 'admin'|'client', email}`
- Роли:
  - **admin** — видит все сайты, все диалоги
  - **client** — видит только свои сайты и диалоги

### Связь с Gateway
- URL: `http://host.docker.internal:18789` (в Docker сети)
- Заголовок: `Authorization: Bearer <GATEWAY_TOKEN>`
- Gateway токен: хранится в `GATEWAY_TOKEN` env (с фолбеком на хардкод)

---

## 4. Web Chat Frontend (Vue 3)

### Технологии
- Vue 3 + Vite
- PrimeVue (UI компоненты)
- Pinia (state management)
- Nginx (production сервинг)

### Режимы работы

#### Админ-режим
- Прямое WebSocket-соединение с Gateway
- HTTP API для отправки сообщений (`POST /v1/chat/completions`)
- Видит все сайты, диалоги всех клиентов

#### Клиент-режим
- Общение через Auth API (`POST /api/chat/send`)
- Единственный сайт (из контекста подключения)
- История диалога (через `/api/chat/history`)

### Компоненты
- `ChatWindow.vue` — основной чат (админ/клиент)
- `ChatInput.vue` — поле ввода
- `MessageArea.vue` — отображение сообщений
- `LoginForm.vue` — форма входа
- `ConnectPopup.vue` — попап подключения сайта
- `SiteSelector.vue` — выбор сайта (админ)

### Connect Flow (WordPress → AI Pilot)
1. WP Admin → кнопка «Подключить к AI Pilot»
2. AJAX-запрос к `/wp-json/aipilot/v1/agent/connect-code`
3. Получение одноразового кода
4. Открытие попапа: `chat.pilotsite.ru/connect?code=XXX&site=URL`
5. ConnectPopup:
   - Форма входа/регистрации
   - Отправка кода + siteUrl в `/api/sites/connect-code`
   - Auth API верифицирует код через WP `/agent/verify-code`
   - Сайт сохраняется с API токеном
   - Сканирование сайта (опционально)
   - Перенаправление

---

## 5. Gateway (OpenClaw)

### Конфигурация
- Порт: 18789
- Bind: lan
- Auth mode: token
- Модель: DeepSeek V4 Flash
- Caddy reverse proxy: `pilotsite.ru → localhost:18789`

### WebSocket протокол (Gateway Protocol v3-4)
- `connect.challenge` → клиент отправляет `{method: connect, auth: {token}}`
- После успешной аутентификации — получение session key
- Используется для получения обновлений в реальном времени

### HTTP API (OpenAI-compatible)
- `POST /v1/chat/completions` — отправка сообщения
  - `model: openclaw` — маршрутизация на основного агента
  - `Authorization: Bearer <token>`

---

## 6. Развёртывание (Deploy)

### GitHub Actions
- Push в `main` → триггер `Auto Deploy`
- SSH на VPS → `git pull`
- `docker build` обоих контейнеров (chat + auth-api)
- `docker run` с параметрами:
  - Сеть `aipilot` (общение между контейнерами)
  - Volume `auth-data:/app/data` (персистентность SQLite)
  - `--add-host host.docker.internal:host-gateway` (доступ к Gateway)

### Сервер
- VPS, Калининград (GMT+2)
- Docker Engine
- Caddy v2 (reverse proxy, Let's Encrypt)
- Домены: `pilotsite.ru`, `chat.pilotsite.ru`

---

## 7. Безопасность

| Уровень | Механизм |
|---------|----------|
| **Транспорт** | HTTPS (Caddy + Let's Encrypt) |
| **Gateway** | Bearer token (64 hex символа) |
| **Auth API** | JWT (HS256, 7 дней) |
| **Пароли** | scrypt (salt:hex, 64 bytes key) |
| **WP API** | Bearer token в заголовке `X-AI-Pilot-Token` |
| **Connect Code** | 8 символов, 5 минут, одноразовый |
| **Rate Limit** | Fastify rate-limit (20/min) |
| **CORS** | Только `chat.pilotsite.ru`, `pilotsite.ru` |
| **Docker** | Изолированная сеть `aipilot`, порты только localhost |

---

## 8. Текущее состояние (Snapshot v1.0)

| Компонент | Версия | Статус |
|-----------|--------|--------|
| WordPress Plugin | v2.1.0 | 🟢 Работает |
| Auth API | v0.2.0 | 🟢 Работает |
| Web Chat | – | 🟢 Работает |
| Gateway | 2026.5.18 | 🟢 Работает |
| SQLite | 1.14.1 | 🟢 Мигрировано из JSON |
| БД | 8 users, 1 site, 0 messages | 🟢 |
| Deploy | GitHub Actions → SSH → Docker | 🟢 |

### Git Tags
- `ai-pilot-web-chat`: `v0.2.0` (commit `f8e8b44`)
- `ai-pilot-wp-plugin`: `v2.1.0` (commit `e4745f1`)

---

*Документ сгенерирован Zero 🎯 для аудита системы AI Pilot.*
