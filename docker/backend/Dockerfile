# Образ backend MILO (этап 11). Сборка из корня репозитория (npm workspaces):
#   docker build -f docker/backend/Dockerfile -t milo-backend .
# Стадии: build — зависимости и сборка (из неё же запускаются миграции: нужен Prisma CLI);
# runtime — только рабочие зависимости и dist, пользователь без прав root.

FROM node:22-alpine AS build
WORKDIR /app
# Манифесты всех пакетов: npm ci сверяет lock-файл со всем монорепо
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mobile/package.json mobile/
# Скрипты пакетов (postinstall prisma generate) — позже, когда есть схема
RUN npm ci -w backend --include-workspace-root=false --ignore-scripts --no-audit --no-fund
COPY backend/ backend/
RUN npm run db:generate -w backend && npm run build -w backend

# Миграции перед запуском сервера: `prisma migrate deploy` (сервис migrate в compose.prod.yaml)
FROM build AS migrate
WORKDIR /app/backend
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mobile/package.json mobile/
RUN npm ci -w backend --include-workspace-root=false --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
