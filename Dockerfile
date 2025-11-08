# ================================
# Stage 1: Base - 기본 환경 설정
# ================================
FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm --activate


RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --frozen-lockfile

FROM base AS build

# Copy all source code
COPY . .

# Reinstall to fix symlinks after copying source
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter @scholub/database run generate

# Build application
RUN pnpm --filter @scholub/api run build

# ================================
# Stage 3: Production - 최종 실행 이미지
# ================================
FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate

# Install system dependencies
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/

# Install all dependencies (including runtime dependencies like multer)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generated client
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/client ./packages/database/client

# Copy built application
COPY --from=build /app/packages/api/dist ./packages/api/dist

# Create temp directory with proper permissions
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Change ownership to node user
RUN chown -R node:node /app

# Expose port
EXPOSE 8000

# Switch to non-root user
USER node

# Start application
CMD ["node", "packages/api/dist/main.js"]
