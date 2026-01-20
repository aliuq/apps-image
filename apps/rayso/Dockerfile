FROM alpine/git AS source
WORKDIR /app
ARG VERSION=198e40d
RUN git clone --depth=1 https://github.com/raycast/ray-so . && \
    git checkout ${VERSION} && \
    rm -rf .git

FROM node:24-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production \
    ODE_OPTIONS="--max-old-space-size=4096"

RUN npm install -g bun

COPY --from=source /app .

RUN bun install --no-cache && \
  # Configure Next.js for standalone output
  if ! grep -q 'output:' next.config.js; then \
    sed -i '/const nextConfig = {/a\  output: "standalone",' next.config.js; \
  else \
    sed -i 's/output: .*/output: "standalone",/' next.config.js; \
  fi && \
  if grep -q 'staticPageGenerationTimeout' next.config.js; then \
    sed -i 's/staticPageGenerationTimeout: .*/staticPageGenerationTimeout: 1800,/' next.config.js; \
  else \
    sed -i '/const nextConfig = {/a\  staticPageGenerationTimeout: 1800,' next.config.js; \
  fi && \
  # Build the application
  bun run build && \
  # Copy required assets
  if [ ! -d ".next/standalone/app/(navigation)/themes/assets" ]; then \
    mkdir -p ".next/standalone/app/(navigation)/themes/"; \
    cp -r "app/(navigation)/themes/assets" ".next/standalone/app/(navigation)/themes/"; \
  fi

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next && \
    chown -R nextjs:nodejs /app

USER nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
