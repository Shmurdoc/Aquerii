FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY package*.json ./
RUN npm ci
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
