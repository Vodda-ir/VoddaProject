# ============================================================
# Monafaseh — Production Dockerfile (multi-stage build)
# ============================================================
# سه مرحله:
#   1. deps — نصب نسخه‌های قفل‌شده با Bun
#   2. builder — build کردن Next.js + Prisma client با Node 22
#   3. runner — اجرای Next.js با Node 22 و فقط فایل‌های لازم
#
# تصویر نهایی بر پایه‌ی node:22-alpine است.
# شامل:
#   • Next.js standalone server
#   • Prisma client + migrations
#   • sharp برای پردازش تصویر
#   • SQLite database (با volume mount برای persistence)
# ============================================================

# ─── Stage 1: deps ────────────────────────────────────────────
FROM oven/bun:1.3.4-alpine AS deps

WORKDIR /app

# کپی manifest و lockfile واقعی پروژه برای cache بهتر
COPY package.json bun.lock ./

# نصب نسخه‌های دقیق ثبت‌شده در bun.lock
RUN bun install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# کپی node_modules از stage deps
COPY --from=deps /app/node_modules ./node_modules

# کپی کد منبع
COPY . .

# متغیرهای محیطی برای build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/db/custom.db"

# تولید Prisma client
RUN npx prisma generate

# وابستگی‌های ترانزیتی Prisma CLI برای اجرای db push در image نهایی
RUN mkdir -p /app/prisma-cli-deps/node_modules/@standard-schema && \
    for package in c12 chokidar citty confbox consola deepmerge-ts defu destr dotenv effect empathic exsolve fast-check giget jiti node-fetch-native nypm ohash pathe perfect-debounce pkg-types pure-rand rc9 readdirp tinyexec; do \
      cp -a "/app/node_modules/$package" /app/prisma-cli-deps/node_modules/; \
    done && \
    cp -a /app/node_modules/@standard-schema/spec /app/prisma-cli-deps/node_modules/@standard-schema/

# build کردن Next.js (با output: standalone برای تصویر سبک‌تر)
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────
FROM node:22-alpine AS runner

# سازگاری glibc برای ابزارهای Node روی Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# متغیرهای محیطی
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/db/custom.db"

# ایجاد کاربر غیر-root برای امنیت
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# کپی فایل‌های ضروری از builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma-cli-deps/node_modules/ ./node_modules/
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/scripts/seed-ads.ts ./scripts/seed-ads.ts
COPY --from=builder /app/scripts/seed-ad-slots.ts ./scripts/seed-ad-slots.ts

# کپی entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# ایجاد پوشه‌ی دیتابیس و uploads با ownership درست
RUN mkdir -p /app/db /app/public/uploads/ads /app/public/uploads/avatars /app/public/uploads/blog && \
    chown -R nextjs:nodejs /app

# Volume برای persistence دیتابیس و uploads
VOLUME ["/app/db", "/app/public/uploads"]

# تغییر به کاربر غیر-root
USER nextjs

# پورت
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Entry point
CMD ["/app/docker-entrypoint.sh"]
