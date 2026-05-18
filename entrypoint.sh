#!/bin/sh
set -e

# Запускаем auth-api в фоне
cd /app/auth
node src/index.js &

# Даём время auth-api стартануть
sleep 1

# Запускаем nginx на переднем плане
nginx -g "daemon off;"
