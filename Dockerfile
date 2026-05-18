FROM node:24-alpine AS auth-build
WORKDIR /app/auth
COPY auth-api/package.json auth-api/package-lock.json ./
RUN npm ci --production
COPY auth-api/ .

FROM node:24-alpine
RUN apk add --no-cache nginx
COPY --from=auth-build /app/auth /app/auth
COPY --from=auth-build /usr/local/lib/node_modules /usr/local/lib/node_modules 2>/dev/null || true

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
