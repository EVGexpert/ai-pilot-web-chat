# AI Pilot — Web Chat 🎯

Веб-чат для управления WordPress-сайтами через OpenClaw Gateway.

## Стек

- **Vue 3** + **Vite**
- **PrimeVue** — UI-компоненты
- **Pinia** — управление состоянием
- **openclaw-webchat-vue** — WebSocket клиент к Gateway
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
├── components/
│   ├── ChatWindow.vue      — основной чат
│   ├── MessageBubble.vue   — сообщение
│   ├── ActionPreview.vue   — превью действий
│   ├── SiteSelector.vue    — выбор сайта
│   ├── TypingIndicator.vue — "печатает..."
│   └── LoginForm.vue       — вход по токену
├── stores/
│   ├── chatStore.js        — состояние чата
│   ├── authStore.js        — авторизация
│   └── sitesStore.js       — список сайтов
├── api/                    — HTTP-клиенты
├── App.vue
└── main.js
```

## Сборка

```bash
npm run build  # → dist/
```
