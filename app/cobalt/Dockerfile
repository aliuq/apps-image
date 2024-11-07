FROM node:23-alpine AS builder
WORKDIR /app
RUN apk add git && git clone https://github.com/imputnet/cobalt.git .
RUN npm install -g pnpm
# web/src/lib/env.ts
# const apiURL = "https://api.cobalt.tools"; => const apiURL = "$BASE_API";
RUN sed -i 's|const apiURL = "\(.*\)";|const apiURL = "\\$BASE_API";|g' web/src/lib/env.ts
RUN pnpm install && pnpm -C web build

FROM aliuq/nginx:svelte

LABEL version="10.3"
LABEL repository="https://github.com/imputnet/cobalt"

ENV BASE_API="https://api.cobalt.tools"

COPY --from=builder /app/web/build /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-replace-envs.sh
RUN chmod +x /docker-entrypoint.d/00-replace-envs.sh
