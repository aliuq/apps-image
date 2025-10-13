FROM alpine/git AS source
WORKDIR /app
ARG READEST_VERSION=v0.9.85
RUN git clone -b ${READEST_VERSION} --recurse-submodules https://github.com/readest/readest .

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest-10 --activate

FROM base AS build
WORKDIR /app
# ENV NODE_OPTIONS="--max-old-space-size=6144"

COPY --from=source /app .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@readest/readest-app setup-pdfjs && \
    pnpm --filter=@readest/readest-app build-web

RUN rm -rf /app/apps/readest-app/.next/cache && \
    pnpm --filter=@readest/readest-app install dotenv-cli @next/bundle-analyzer -P

FROM base
ENV NODE_ENV=production
WORKDIR /app

COPY --from=source /app .
COPY --from=build /app/apps/readest-app/package.json /app/apps/readest-app/package.json
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/readest-app/.next /app/apps/readest-app/.next
COPY --from=build /app/apps/readest-app/public /app/apps/readest-app/public
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

RUN pnpm fetch --prod && pnpm install -r --offline --prod

RUN chmod +x /docker-entrypoint.sh && \
    mv /app/apps/readest-app/.env.local.example /app/apps/readest-app/.env.local && \
    rm -rf packages/tauri* apps/readest-app/src-tauri

WORKDIR /app/apps/readest-app
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 3000
