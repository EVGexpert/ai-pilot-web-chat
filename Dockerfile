# Stage 1: Build
FROM node:24-alpine AS build
WORKDIR /app
# Reproducibility: npm ci must always install devDependencies (vite, vitest),
# even if the build environment exports NODE_ENV=production.
ENV NODE_ENV=development
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
