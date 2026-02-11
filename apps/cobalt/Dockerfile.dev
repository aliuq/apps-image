FROM aliuq/nginx:svelte

ENV NODE_ENV=production \
    BASE_API="https://api.cobalt.tools"

COPY ./app/web/build /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-replace-envs.sh

RUN chmod +x /docker-entrypoint.d/00-replace-envs.sh
