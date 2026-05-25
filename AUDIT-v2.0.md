# AI Pilot — Аудит v2.0
**Дата:** 2026-05-25
**Предыдущий аудит:** AUDIT-v1.0.md (2026-05-21)

---

## 1. Exec Summary

За месяц система выросла из прототипа в работающий продукт: JWT-авторизация, SQLite, чат с DeepSeek, action proposal карточки. Основные проблемы сейчас — стабильность инфраструктуры и согласованность компонентов при перезапусках.

**Критичных (P0) проблем — 2**
**Высоких (P1) — 3**
**Средних (P2) — 4**

---

## 2. Таблица токенов и секретов

| Токен | Где | Как передаётся | Риск | Статус |
|-------|-----|---------------|------|--------|
| **GATEWAY_TOKEN** | Env контейнера `ai-pilot-auth` | `docker run -e` | P0 — при перезапуске нужно не забыть передать | ⚠️ Не починен |
| **JWT_SECRET** | SQLite → `config.jwt_secret` | Автогенерация | Низкий — живёт в БД | ✅ Починен сегодня |
| **VITE_GATEWAY_TOKEN** | JS-бандл (build-time) | Vite сборка | P1 — если env пустой при сборке, токена нет в бандле | ✅ Хардкод в authStore (fallback) |
| **X-AIPILOT-Token** | WP Options / SQLite `sites.api_token` | `site_info` capability | P1 — на obelisk `pending` | ❌ Не настроен |

---

## 3. P0 — Критические проблемы

### 3.1 GATEWAY_TOKEN теряется при перезапуске контейнера

**Симптом:** Auth API возвращает 401 при попытке чата, в логах `[Gateway] Notification failed: 401`

**Корень:** Токен передаётся через `-e GATEWAY_TOKEN=***` при `docker run`. Если маска/плейсхолдер — контейнер стартует с токеном `***` (3 символа). Gateway его не принимает.

**Фикс:** Хранить в БД (таблица `config`, как `JWT_SECRET`). При первом запуске импортировать из env, при последующих — читать из БД.

**Статус:** Код готов, не залит (ожидает пересборки образа)

### 3.2 better-sqlite3 требует build tools на Alpine

**Симптом:** `npm install --production` падает с `gyp ERR! Could not find any Python installation`

**Корень:** `better-sqlite3` — native модуль. На Alpine нужны `python3`, `make`, `g++`. После очистки Docker-кэша (`docker buildx prune -f`) все native модули компилируются заново, а build tools не установлены в образе.

**Фикс:** Добавить `RUN apk add --no-cache python3 make g++` в Dockerfile.

**Статус:** Починено в коде, образ не пересобран (из-за циклических проблем с bcrypt)

---

## 4. P1 — Высокие проблемы

### 4.1 X-AIPILOT-Token на obelisk — `pending`

**Симптом:** Auth API не может получить контекст сайта и писать память. `refresh_context` и `sync_wp_memory` jobs падают.

**Корень:** WP Plugin на obelisk не обновлён (v1). Даже если обновить — `full_access` capability отключена по умолчанию.

**Фикс:** 
1. Обновить плагин на obelisk до последней версии из git
2. В админке WP включить `full_access` и другие нужные capability
3. Сгенерировать новый API-токен
4. Прописать токен в auth-api (через register site или напрямую в БД)

### 4.2 schema_version БД расходится с кодом

**Симптом:** `refresh_context` падает с `no such column: cached_structure`

**Корень:** Таблица `sites` в SQLite не имеет колонки `cached_structure`, но код пытается в неё писать. Схема БД создавалась разными версиями кода.

**Фикс:** Создать миграцию v4/v5 в db.js, добавляющую недостающие колонки.

### 4.3 Системный промпт не применяется к DeepSeek

**Симптом:** Модель игнорирует инструкцию «не выполняй действия, только предлагай». Карточка Action Proposal появляется не всегда.

**Корень:** DeepSeek V4 Flash имеет 21K токенов встроенного контекста (системный промпт OpenClaw). Наш промпт — лишь малая добавка, модель часто его перебивает своим training'ом.

**Возможные фиксы (по приоритету):**
1. RAG + wiki — подтягивать релевантные примеры в контекст при каждом запросе
2. Context Engine — `systemPromptAddition` от OpenClaw
3. Ollama + эмбеддинги — few-shot примеры в контекст

---

## 5. P2 — Средние проблемы

### 5.1 bcrypt → bcryptjs при пересборке

**Симптом:** При смене `bcrypt` на `bcryptjs` (или обратно) ломается верификация паролей. Пользователи не могут войти.

**Корень:** Пароли хешируются кастомной функцией из `password.js`, не зависимой от bcrypt. При переключении импорта ломается `bcrypt.compare()`.

**Фикс:** Использовать ТОЛЬКО `password.js` (как в git), не импортировать bcrypt напрямую. Фикс уже сделан — auth.js восстановлен из git.

### 5.2 `export default db` отсутствовал в db.js

**Симптом:** При запуске `import db from '../db.js'` падает с `does not provide an export named 'default'`

**Корень:** Мои правки db.js (добавление `getConfigValue`, `getJwtSecret`) случайно удалили `export default db`.

**Фикс:** Добавлен обратно. Сейчас в git + на сервере.

### 5.3 package.json расходится с package-lock.json

**Симптом:** `npm ci` падает при добавлении новых зависимостей (bcryptjs, bcrypt).

**Корень:** `package-lock.json` не обновляется при изменении `package.json`. `npm ci` требует строгого соответствия.

**Фикс:** Удалить `package-lock.json` из Dockerfile (`COPY package.json ./`) или использовать `npm install` вместо `npm ci`.

### 5.4 Логин возвращает `role: 'client'` для всех

**Симптом:** admin123@pilot.ru получает `role: 'client'` при логине. Админские привилегии (сайдбар, история всех клиентов) определяются по `role === 'admin'`, который никогда не выставляется.

**Корень:** В `generateToken()` роль жёстко зашита как `'client'`.

**Фикс:** Читать роль из БД при генерации токена.

---

## 6. Что починили сегодня

| Проблема | Фикс |
|----------|------|
| GATEWAY_TOKEN пустой в контейнере | Прописан реальный токен при `docker run` |
| JWT_SECRET сгорал при рестарте | Перенесён в БД (таблица `config`) |
| db.js без default export | Добавлен `export default db` |
| bcrypt vs bcryptjs | Восстановлен `password.js` из git |
| gatewayToken не отдавался при логине | Добавлен в ответ login (из `config.js`) |
| Dockerfile не собирался на чистом кэше | Добавлены build tools (python3, make, g++) |
| Фронтенд не получал gatewayToken | Добавлен параметр `gwToken` в `authStore.login()` |
| deploy.yml не передавал токен в build | Добавлен `--build-arg VITE_GATEWAY_TOKEN` |
| ActionProposalCard не интегрирован | MessageBubble → MessageArea → ChatWindow |
| detectActionIntent не ловил «написать» | Regex расширен (`/напис(ать|а|и|ем|у|ан)/i`) |

---

## 7. План работ (приоритет)

### 🔴 Этап 1 — Стабильность (1-2 дня)

1. **GATEWAY_TOKEN в БД** — как JWT_SECRET: при первом запуске импорт из env, далее из DB
2. **Миграция БД** — добавить недостающие колонки (cached_structure и др.)
3. **Пересобрать образ auth-api** с фиксами (build tools, password.js, gatewayToken)
4. **Обновить плагин на obelisk** + настроить API токен

### 🟡 Этап 2 — Action Proposal (2-3 дня)

5. **RAG контекст** — Ollama + эмбеддинги, few-shot примеры для модели
6. **Context Engine** — подключить `systemPromptAddition` от OpenClaw
7. **Улучшить детекцию намерений** — не только ключевые слова, но и NLP-анализ

### 🟢 Этап 3 — Мониторинг (3-5 дней)

8. **Audit log** — полное логирование всех действий агента
9. **Health checks** — алерты при падении компонентов
10. **Dashboard** — статус всех сайтов, очередь задач, ошибки
