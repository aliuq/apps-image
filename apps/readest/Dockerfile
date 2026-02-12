FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

# Install gettext for envsubst
RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/apps/readest-app

COPY ./app/.next/standalone/ /app
COPY ./app/.next/static /app/apps/readest-app/.next/static
COPY ./app/public /app/apps/readest-app/public
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

WORKDIR /app/apps/readest-app

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 3000
