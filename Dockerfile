# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
FROM node:22-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS build

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID

ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile

COPY packages packages
RUN pnpm build

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/common/dist packages/common/dist
COPY --from=build /app/packages/web/dist packages/web/dist

USER node
EXPOSE 8080

CMD ["node", "packages/api/dist/index.js"]
