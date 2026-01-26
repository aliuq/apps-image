FROM node:20-alpine AS runner

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production \
    CI_MODE=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_DISABLE_POSTHOG="true" \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next && \
    chown -R nextjs:nodejs /app

USER nextjs

COPY --chown=nextjs:nodejs ./app/web/public ./public
COPY --chown=nextjs:nodejs ./app/web/.next/standalone/apps/dashboard-icons/app/web ./
COPY --chown=nextjs:nodejs ./app/web/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
