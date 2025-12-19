FROM alpine/git AS source
WORKDIR /app
ARG READEST_VERSION=v0.9.94
RUN git clone -b ${READEST_VERSION} --recurse-submodules https://github.com/readest/readest .

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest-10 --activate

FROM base AS build
WORKDIR /app
# Uncomment the following line to increase the Node.js memory limit (if needed)
ENV NODE_OPTIONS="--max-old-space-size=6144"

COPY --from=source /app .
# Copy the variables starting with `NEXT_PUBLIC_` from
# `/app/apps/readest-app/.env.local.example` to /app/apps/readest-app/.env.local,
# and set their values as environment variable placeholders in the format `KEY=\$KEY`.
RUN env_source=/app/apps/readest-app/.env.local.example; \
    env_target=/app/apps/readest-app/.env.local; \
    awk -F= '/^NEXT_PUBLIC_/ && $1 != "" { printf "%s=\$%s\n", $1, $1 }' $env_source >> $env_target && \
    \
    # Replace `NEXT_PUBLIC_SUPABASE_URL` to `https://your-supabase-url.com` placeholder for avoid `Invalid URL` error during build
    sed -i 's|^NEXT_PUBLIC_SUPABASE_URL=.*$|NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.com|' $env_target

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @readest/readest-app setup-vendors && \
    pnpm --filter=@readest/readest-app setup-pdfjs && \
    pnpm --filter=@readest/readest-app build-web

# Replace `https://your-supabase-url.com` in `.next` js files with environment variable
RUN find /app/apps/readest-app/.next -name "*.js" -exec sed -i "s|https://your-supabase-url.com|\$NEXT_PUBLIC_SUPABASE_URL|g" {} +

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

RUN pnpm fetch --prod && pnpm install -r --offline --prod && \
    \
    # Install gettext for envsubst
    apt-get update && apt-get install -y gettext-base && \
    rm -rf /var/lib/apt/lists/*

# Add at the end to leverage cache
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh && \
    rm -rf packages/tauri* apps/readest-app/src-tauri

WORKDIR /app/apps/readest-app
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 3000
