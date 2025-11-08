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

COPY . .

# Reinstall dependencies to recreate proper symlinks after COPY
RUN pnpm install --frozen-lockfile

RUN pnpm database generate

RUN pnpm api build

FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm --activate

ENV NODE_ENV=production

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/

# Install all dependencies (NestJS build may need some devDependencies at runtime)
RUN pnpm install --frozen-lockfile

COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/client ./packages/database/client

COPY --from=build /app/packages/api/dist ./packages/api/dist

RUN mkdir -p /app/tmp && chmod 777 /app/tmp

RUN chown -R node:node /app

EXPOSE 8000

USER node

CMD ["node", "packages/api/dist/main.js"]
