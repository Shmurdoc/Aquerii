# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --frozen-lockfile; else npm install --legacy-peer-deps; fi

COPY . .

ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Non-root
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: redirect all 404s to index.html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Override main nginx.conf to remove 'user' directive (incompatible with non-root) and set pid path
COPY <<'EOF' /etc/nginx/nginx.conf
pid /run/nginx.pid;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    include /etc/nginx/conf.d/*.conf;
}
EOF

RUN chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/run /run /var/log/nginx \
    && touch /run/nginx.pid && chown appuser:appgroup /run/nginx.pid

USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
