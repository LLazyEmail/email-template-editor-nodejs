# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=9000 \
    DB_FILE=/app/data/db.json \
    PUBLIC_DIR=/app/public
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY public ./public
COPY db.json ./data/db.json
RUN chown -R node:node /app/data /app/public
USER node
EXPOSE 9000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "dist/server.js"]
