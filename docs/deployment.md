# WebChat Deployment

## Runtime contract (production)

| Parameter | Value |
|---|---|
| Container name | `ai-pilot-chat` |
| Image | `ai-pilot-chat:<version>` (pinned version, never `latest`) |
| Port binding | `127.0.0.1:3000:80` |
| Network | `ai-pilot-internal` (**required** — container must resolve `ai-pilot-auth`) |
| Restart policy | `unless-stopped` |
| Upstream | `ai-pilot-auth:3001` (auth-api, via nginx proxy) |
| Host mapping | `host.docker.internal:host-gateway` (gateway WS at `:18789`) |
| Gateway WS | `wss://pilotsite.ru/` — path `/ws/` on the chat domain is NOT the gateway WS endpoint |

A container started without `ai-pilot-internal` cannot resolve `ai-pilot-auth`
and nginx exits with `host not found in upstream` (restart loop). Verify before
starting: `docker inspect ai-pilot-chat --format '{{json .NetworkSettings.Networks}}'`.

## Workflows

- `ci.yml` — runs on `push` / `pull_request` to `main`: `npm ci`, `npm test`,
  `npm run build`. No SSH, no Docker, no deploy.
- `deploy.yml` — manual only (`workflow_dispatch`), requires explicit `version`
  input, uses GitHub Environment `production`. Never triggered by pushes.

## Manual deploy procedure (workflow equivalent)

```bash
VERSION=0.1.3
docker stop -t 30 ai-pilot-chat
docker rename ai-pilot-chat ai-pilot-chat-rollback-${VERSION}-$(date -u +%Y%m%d-%H%M%S)
docker run -d --name ai-pilot-chat --restart unless-stopped \
  --network ai-pilot-internal --add-host host.docker.internal:host-gateway \
  -p 127.0.0.1:3000:80 ai-pilot-chat:${VERSION}
# health: RestartCount=0, curl http://127.0.0.1:3000/ = 200,
#         no "host not found in upstream" in docker logs
# only after smoke: docker tag ai-pilot-chat:${VERSION} ai-pilot-chat:stable
#                   docker tag ai-pilot-chat:${VERSION} ai-pilot-chat:latest
```

Rollback containers are kept — never delete them automatically.

## Incident 2026-08-09

Push to `main` triggered a legacy automatic deploy workflow. The workflow built
and started a container **without** the `ai-pilot-internal` network; nginx could
not resolve `ai-pilot-auth` and entered a restart loop. The automatic deploy was
removed in favor of a manual controlled deployment (`workflow_dispatch` with an
explicit version, Environment `production`, health/network guards and rollback).
No secrets or tokens are referenced in this document.
