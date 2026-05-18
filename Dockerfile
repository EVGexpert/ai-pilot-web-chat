FROM node:24-alpine AS auth-build
WORKDIR /app/auth
COPY auth-api/package.json auth-api/package-lock.json ./
RUN npm ci --production
COPY auth-api/ .

FROM nginx:alpine AS web
# Auth API binary
COPY --from=auth-build /app/auth /app/auth

# Web chat
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Supervisor-like entrypoint — запускаем nginx + auth-api
RUN echo '#!/bin/sh\n\
set -e\n\
cd /app/auth && node src/index.js &\n\
sleep 1\n\
nginx -g "daemon off;"\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
