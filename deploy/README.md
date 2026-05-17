# AI Pilot — деплой на VPS
# =========================

## Структура на сервере

```
~/ai-pilot-web-chat/       ← клон GitHub репозитория
├── deploy/
│   ├── Caddyfile          → копируется в /etc/caddy/Caddyfile
│   └── docker-compose.yml → запускает OpenClaw + web-chat
├── Dockerfile
├── nginx.conf
└── src/                   ← код чата
```

## Шаг 1 — Скопировать Caddyfile

```bash
sudo cp ~/ai-pilot-web-chat/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

**Важно:** если в твоём `/etc/caddy/Caddyfile` уже есть другие сайты — не затирай их. Вклей блоки `pilotsite.ru` и `chat.pilotsite.ru` в нужное место.

## Шаг 2 — Запустить контейнеры

```bash
cd ~/ai-pilot-web-chat
docker compose -f deploy/docker-compose.yml up -d
```

## Шаг 3 — Проверить

```bash
# Gateway API
curl -I https://pilotsite.ru

# WebSocket чата (если порт открыт)
curl -I https://chat.pilotsite.ru
```
