FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3001
CMD ["node", "src/index.js"]
