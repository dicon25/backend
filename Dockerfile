FROM node:slim AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates

RUN corepack enable && corepack prepare pnpm --activate

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm --filter @scholub/database run generate

RUN pnpm --filter @scholub/api run build

FROM base AS deps

ENV CI=true

RUN pnpm install --frozen-lockfile --prod

FROM node:23-bookworm-slim AS development

WORKDIR /app

RUN corepack enable && corepack prepare pnpm --activate

ENV NODE_ENV=development

RUN apt-get update -y
RUN apt-get install -y openssl ca-certificates libssl3

COPY --from=build /app/package.json .
COPY --from=build /app/pnpm-workspace.yaml .
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/packages/database/package.json ./packages/database/

COPY --from=build /app/packages/api/dist ./packages/api/dist

COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/client ./packages/database/client

COPY --from=deps /app/node_modules node_modules

RUN mkdir -p /app/tmp && chmod 777 /app/tmp

EXPOSE 8000

USER node

CMD ["pnpm", "--filter", "@rollforming-mes/api", "run", "start:dev"]