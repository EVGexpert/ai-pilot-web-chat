# Внедрение рекомендаций — план работ

Источник: `wordpress-chat-integration-recommendations.md`

## 🔴 P0 — Немедленно (сегодня)

### 1. Убрать прямой Gateway из фронта
**Текущее:** Админский чат идёт `Frontend → /v1/chat/completions → Gateway`
**Цель:** `Frontend → Auth API → Gateway`

**Что сделать:**
- gatewayClient.js: убрать `sendMessage()` с прямым вызовом Gateway
- Auth API: добавить endpoint для админского чата (сейчас только client flow)
- Админ тоже идёт через Auth API, как и клиент
- Убрать `VITE_GATEWAY_TOKEN` из фронта (он больше не нужен)

### 2. Убрать WP токен из system prompt
**Текущее:** `buildSystemPrompt()` вставляет `API токен: ${site.api_token}`
**Цель:** Модель не видит секреты

**Что сделать:**
- Убрать `API токен` из system prompt
- Сервер сам берёт токен из БД при вызове WP

### 3. Добавить историю в LLM context
**Текущее:** В Gateway уходит только `system + текущее сообщение`
**Цель:** `system + последние 8-16 сообщений + текущее`

**Что сделать:**
- auth-api/chat.js: загружать `getMessagesBySession(session.id).slice(-12)`
- Добавить `session_summary` для длинных сессий (>8000 токенов)
- Добавить колонку `summary` в `chat_sessions`

### 4. GATEWAY_TOKEN в БД
**Текущее:** В env контейнера, теряется при перезапуске
**Цель:** В таблице `config`, как `JWT_SECRET`

**Что сделать:**
- `getGatewayToken()` в db.js (как `getJwtSecret()`)
- При первом запуске импорт из env, далее из БД
- Убрать `-e GATEWAY_TOKEN` из `docker run`

## 🟡 P1 — В ближайшие дни

### 5. Session summary
- Колонки: `summary TEXT, summary_updated_at TEXT`
- Авто-обновление при длинных сессиях
- Gateway отправляет summary + последние сообщения

### 6. Site memory
- Таблица `site_memory` (key-value по сайту)
- Долгосрочные правила, предпочтения клиента
- Включается в контекст при каждом запросе

### 7. Structured action JSON от модели
- Вместо `detectActionIntent` (эвристика) → JSON Schema validation
- Модель возвращает `{answer, actions: [{type, target, patch}]}`
- Сервер валидирует JSON перед показом карточки

### 8. Audit log — действия WordPress
- Логировать все approve/reject/action
- Связать с `audit_events` таблицей

## 🟢 P2 — На среднюю перспективу

### 9. L1-L4 контекст сайта
- Site Card (всегда в промпте)
- Page Context (только при работе со страницей)
- Site Memory (релевантная память)
- Full Scan (RAG, не в промпт)

### 10. RAG по структуре сайта
- Embeddings через Ollama
- Поиск релевантных страниц/блоков

### 11. Rollback для изменений
- Сохранять diff до выполнения
- Возможность откатить

### 12. Token rotation
- Авто-ротация WP токенов
- Версионирование
