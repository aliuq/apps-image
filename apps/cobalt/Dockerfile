FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/imputnet/cobalt.git .

FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=base /app .
RUN npm install -g pnpm
# web/src/lib/env.ts
# const defaultApiURL = "https://api.cobalt.tools"; => const defaultApiURL = "$BASE_API";
RUN sed -i 's|const defaultApiURL = "\(.*\)";|const defaultApiURL = "\\$BASE_API";|g' web/src/lib/env.ts
RUN pnpm install && pnpm -C web build

FROM aliuq/nginx:svelte

ENV BASE_API="https://api.cobalt.tools"

COPY --from=builder /app/web/build /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-replace-envs.sh
RUN chmod +x /docker-entrypoint.d/00-replace-envs.sh
