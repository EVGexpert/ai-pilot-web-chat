# AI Pilot — Web Chat 🎯

Веб-чат для управления WordPress-сайтами через OpenClaw Gateway.

## Стек

- **Vue 3** + **Vite**
- **PrimeVue** — UI-компоненты
- **Pinia** — управление состоянием
- **GatewayClient** — WebSocket клиент с автореконнектом и очередью сообщений
- **Axios** — HTTP-запросы

## Быстрый старт

```bash
npm install
cp .env.example .env  # настройте VITE_GATEWAY_WS
npm run dev
```

## Структура

```
src/
├── api/
│   └── gatewayClient.js    — WebSocket клиент (reconnect + queue + ack)
├── components/
│   ├── ChatWindow.vue      — основной чат (REST + WS статус)
│   ├── MessageBubble.vue   — сообщение
│   ├── ActionProposalCard.vue — превью действий
│   ├── AppSidebar.vue      — боковая панель
│   ├── ChatInput.vue       — ввод сообщений
│   ├── MessageArea.vue     — область сообщений
│   ├── TypingIndicator.vue — "печатает..."
│   └── LoginForm.vue       — вход по email+password
├── composables/
│   ├── useChatApi.js       — REST API чата
│   └── useGatewayClient.js — Vue-обёртка для GatewayClient
├── stores/
│   ├── authStore.js        — авторизация
│   └── sitesStore.js       — список сайтов
├── App.vue
└── main.js
```

## WebSocket (GatewayClient)

`GatewayClient` — клиент WebSocket с автоматическим реконнектом:

- **Exponential backoff**: 1s → 2s → 4s → ... → 30s (макс), 10 попыток
- **Message queue**: при offline — сообщения складываются в очередь
- **Flush queue**: после reconnect — все накопленные отправляются
- **Ack mechanism**: messageId + pendingAcks Map, timeout 10s → возврат в очередь
- **Event emitter**: `on/off/emit/once` — события: `open`, `close`, `message`, `error`, `fatal`, `reconnecting`, `queued`, `ack`, `ack_timeout`

> **Note:** Серверная часть (OpenClaw Gateway) уже умеет обрабатывать `messageId`
> и отправлять `ack` — изменений на сервере не требуется.

## Сборка

```bash
npm run build  # → dist/
```
