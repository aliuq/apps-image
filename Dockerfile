FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/imputnet/cobalt.git . && git checkout 71bb2de

FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=base /app .
RUN corepack enable && corepack prepare --activate
RUN pnpm install --frozen-lockfile
RUN WEB_DEFAULT_API=\$BASE_API pnpm -C web build

FROM aliuq/nginx:svelte

ENV BASE_API="https://api.cobalt.tools"

COPY --from=builder /app/web/build /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-replace-envs.sh
RUN chmod +x /docker-entrypoint.d/00-replace-envs.sh
