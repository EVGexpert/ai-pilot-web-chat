# Changelog

## 0.1.2 — 2026-07-31 (STABLE BASELINE)

Production-версия, развёрнутая на сервере (image `ai-pilot-chat:0.1.2-login-ui-v3`).

### Added
- Login UI v3: двухколоночный редизайн страницы входа (brand panel, удалено поле name, изолированные стили).
- Agent UI Cards frontend: `AssistantUiRenderer`, `AgentChoiceCard`, `AgentConfirmationCard`, Pinia store `agentUi`, сервис `agentUiService`.
- Card resolve возвращает `assistantResponse` + `followUp` в чат.
- `option_id` в snake_case для respondCard; немедленный dismiss карточки при resolve.
- ActionProposalCard: состояния `processing` / `failed`, спиннер, disabled-кнопки.
- Production-сборка: `Dockerfile.production` + `nginx.production.conf` (SPA fallback, proxy на auth-api и Gateway).
- Тесты: vitest (ActionProposalCard, agentUi, sitesStore, LoginForm) — 65 проверок.

### Changed
- DOMPurify-санитизация HistoryPanel (v-html).
- Watch `[sessionId, siteId]` без гонок при переключении сессий.
- JSON-строка options карточек парсится в store (исправлены пустые radio-кнопки).

### Known Limitations
- Тег `v0.2.0` в истории — legacy-тег, не соответствует текущему package.json (0.1.2).
- `npm ci` в production-окружении требует `NODE_ENV=development` (иначе devDependencies, включая vite/vitest, не устанавливаются).
- На GitHub main часть изменений отсутствует — push не выполнялся (см. отчёт).
- В репозитории присутствует legacy-подпапка `auth-api/` (старая копия бэкенда) — не является частью web-chat runtime.
