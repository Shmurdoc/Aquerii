FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --legacy-peer-deps; fi

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --legacy-peer-deps; fi
COPY . .
RUN npm run build

# ── Production ────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
EXPOSE 3000 9464
USER node
CMD ["node", "dist/index.js"]
