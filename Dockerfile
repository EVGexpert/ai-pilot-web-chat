# Stage 1: Build
FROM node:24-alpine AS build
ARG VITE_GATEWAY_TOKEN
ARG VITE_GATEWAY_WS
ENV VITE_GATEWAY_TOKEN=${VITE_GATEWAY_TOKEN}
ENV VITE_GATEWAY_WS=${VITE_GATEWAY_WS:-wss://pilotsite.ru}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
