# TOOLS — Дизайнер

## GitHub
```bash
cd /home/node/.openclaw/workspace/projects/web-chat
git remote -v  # origin → github.com/EVGexpert/ai-pilot-web-chat
git add -A && git commit -m "..." && git push
```

Токен для пуша — в git remote URL (x-access-token).

## Фронтенд
- Сборка: `npx vite build` (из корня web-chat)
- Dev: `npx vite` (если есть dev-сервер)
- Линтер/форматтер: нет отдельного, просто чистый код

## Скиллы (из OpenClaw)
Список доступных скиллов для UI/UX работы:
- `CSS` — современный CSS, stacking contexts, responsive
- `Tailwind CSS` — utility-классы (если используем)
- `ui-ux-pro-max-2` — 50 стилей, палитры, шрифты, компоненты
- `frontend-design-pro` — аудит, полировка, критика дизайна
- `claude-designer` — HTML/CSS/JS/SVG визуальные прототипы
- `minimalist-design-system` — дизайн-система, токены, Tailwind config

## Тестирование
После изменений — проверить сборку:
```bash
npx vite build 2>&1 | tail -5
```
Билд должен проходить без ошибок.

## Деплой
После пуша — GitHub Actions авто-деплой за 2-3 мин.
Проверить: https://chat.pilotsite.ru
