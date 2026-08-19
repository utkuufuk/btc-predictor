FROM node:22-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/api/package.json src/api/package.json
COPY src/web/package.json src/web/package.json
RUN pnpm install --frozen-lockfile

COPY src src
RUN pnpm build

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/api/package.json src/api/package.json
COPY src/web/package.json src/web/package.json
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY --from=build /app/src/api/dist src/api/dist
COPY --from=build /app/src/web/dist src/web/dist

USER node
EXPOSE 8080

CMD ["node", "src/api/dist/index.js"]
