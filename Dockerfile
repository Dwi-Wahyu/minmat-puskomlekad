# Gunakan image Bun resmi
FROM oven/bun:1.3.10-alpine AS builder

WORKDIR /app

# Tambahkan tools pembangunan (hanya untuk kompilasi library)
RUN apk add --no-cache python3 make g++

# Salin file package dan lockfile
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Salin semua source code
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG ORIGIN
ENV ORIGIN=$ORIGIN
ARG REDIS_URL
ENV REDIS_URL=$REDIS_URL
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Build aplikasi menggunakan adapter-bun
RUN bun run build

# --- Runtime Stage ---
FROM oven/bun:1.3.10-alpine

WORKDIR /app

# Hanya salin hasil build dan node_modules yang dibutuhkan
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Environment variables
ENV NODE_ENV=production
# Bun secara default membaca port dari environment atau config
ENV PORT=3000

EXPOSE 3000

# Jalankan dengan runtime Bun
CMD ["bun", "./build/index.js"]