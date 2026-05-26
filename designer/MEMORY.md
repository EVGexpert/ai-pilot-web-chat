# MEMORY — Дизайнер AI Pilot

## Проект
AI Pilot — веб-чат для управления WordPress-сайтами через ИИ.
Фронтенд: Vue 3 + Vite, PrimeVUI, Pinia.
Домен: chat.pilotsite.ru

## GitHub
Репозиторий: github.com/EVGexpert/ai-pilot-web-chat
Токен: из git remote (`projects/web-chat/.git`)

## Текущий стек
- Vue 3 + Composition API
- Vite 8
- PrimeVUI компоненты
- Pinia (stores: authStore, sitesStore)
- Кастомные CSS переменные (см. style.css)
- Тёмная/светлая тема через `data-theme` атрибут

## Где что лежит
- `src/` — весь исходный код
- `src/components/` — Vue компоненты
- `src/stores/` — Pinia stores
- `src/api/` — API клиенты
- `src/style.css` — глобальные стили и CSS-переменные
- `src/App.vue` — корневой компонент
- `src/router.js` — маршруты
- `docs/` — архитектура, аудиты

## Принципы дизайна
- Минимализм
- Чистая типографика
- Осмысленная анимация (только когда нужна)
- Mobile-first
- Доступность (contrast, focus states, aria)
