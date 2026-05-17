# AI Pilot — деплой на VPS

## Структура на сервере

```
~/chat/               ← клон ai-pilot-web-chat
├── auth-api/         ← бэкенд аутентификации
├── deploy/
│   ├── Caddyfile     → /etc/caddy/Caddyfile
│   └── docker-compose.yml
├── Dockerfile
└── src/              ← код чата
```

## Шаг 1 — Обновить Caddy

```bash
# Скопировать Caddyfile (или вклеить блоки вручную)
sudo cp ~/chat/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

## Шаг 2 — Запустить все сервисы

```bash
cd ~/chat/deploy
docker compose up -d --build
```

## Проверка

```bash
# Чат
curl -I https://chat.pilotsite.ru

# Auth API
curl https://chat.pilotsite.ru/api/health

# OpenAI API (через Gateway)
curl -X POST https://chat.pilotsite.ru/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ***" \
  -d '{"model":"openclaw","messages":[{"role":"user","content":"Привет"}]}'
```
