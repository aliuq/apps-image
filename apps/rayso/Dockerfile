FROM alpine/git AS source
WORKDIR /app
ARG VERSION={{version}}
RUN git clone https://github.com/raycast/ray-so . && git checkout ${VERSION}

FROM node:24-alpine AS base
WORKDIR /app

FROM base AS build-base
RUN npm install -g bun

FROM build-base AS deps
COPY --from=source /app/package.json ./
RUN bun install

FROM build-base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=source /app .

RUN \
  # If `output:` does not exist, add `  output: "standalone",` immediately after `const nextConfig = {`.
  # If `output:` already exists, change its value to `"standalone"`.
  if ! grep -q 'output:' next.config.js; then \
    sed -i '/const nextConfig = {/a\  output: "standalone",' next.config.js; \
  else \
    sed -i 's/output: .*/output: "standalone",/' next.config.js; \
  fi && \
  \
  # Build the Next.js application
  bun run build && \
  \
  # If `.next/standalone/app/(navigation)/themes/assets` does not exist, copy the assets
  # Copy app/(navigation)/themes/assets to .next/standalone/app/(navigation)/themes/assets
  if [ ! -d ".next/standalone/app/(navigation)/themes/assets" ]; then \
    mkdir -p ".next/standalone/app/(navigation)/themes/"; \
    cp -r "app/(navigation)/themes/assets" ".next/standalone/app/(navigation)/themes/"; \
  fi && \
  \
  # Remove .next/cache to reduce image size
  rm -rf .next/cache .next/server

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
