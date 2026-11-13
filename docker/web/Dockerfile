# Веб-сервер MILO (этап 11, решение B-22): Caddy с HTTPS (Let's Encrypt) отдаёт PWA и
# передаёт /api и /socket.io в backend. Сборка из корня репозитория:
#   docker build -f docker/web/Dockerfile -t milo-web .
# API на том же домене — адрес относительный, CORS для веб-версии не нужен.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mobile/package.json mobile/
RUN npm ci -w frontend --include-workspace-root=false --no-audit --no-fund
COPY frontend/ frontend/
ENV VITE_API_URL=/api/v1
RUN npm run build -w frontend

FROM caddy:2.11-alpine
COPY docker/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
