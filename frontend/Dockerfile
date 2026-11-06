# ── deps ──
FROM node:24-alpine3.21 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack pnpm i --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# ── build ──
FROM node:24-alpine3.21 AS build
WORKDIR /app
RUN corepack enable
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL=/api/backend
ARG NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL=/api/auth
ARG NEXT_PUBLIC_LIVE_WS_BASE=wss://api.vodda.ir
ARG SERVER_API_URL=http://backend:3420/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL=$NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL
ENV NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL=$NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL
ENV NEXT_PUBLIC_LIVE_WS_BASE=$NEXT_PUBLIC_LIVE_WS_BASE
ENV SERVER_API_URL=$SERVER_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runtime (standalone) ──
FROM node:24-alpine3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
ARG PORT=3421
ENV PORT=$PORT
ENV HOSTNAME=0.0.0.0
EXPOSE 3421
CMD ["node", "server.js"]
