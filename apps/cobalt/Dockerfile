FROM alpine/git AS source
WORKDIR /app
ARG VERSION=e4b5388
RUN git clone https://github.com/imputnet/cobalt . && git checkout ${VERSION}

FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=source /app .
RUN corepack enable && corepack prepare --activate
RUN pnpm install --frozen-lockfile
RUN WEB_DEFAULT_API=\$BASE_API pnpm -C web build

FROM aliuq/nginx:svelte

ENV BASE_API="https://api.cobalt.tools"

COPY --from=builder /app/web/build /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-replace-envs.sh
RUN chmod +x /docker-entrypoint.d/00-replace-envs.sh
