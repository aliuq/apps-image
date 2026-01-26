FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

# Install gettext for envsubst
RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    rm -rf /var/lib/apt/lists/*

COPY ./app/pruned/node_modules ./node_modules
COPY ./app/apps/readest-app/.env* ./
COPY ./app/apps/readest-app/package.json ./package.json
COPY ./app/apps/readest-app/.next ./.next
COPY ./app/apps/readest-app/public ./public
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 3000
