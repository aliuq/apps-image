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

COPY --chown=nextjs:nodejs ./app/public ./public
COPY --chown=nextjs:nodejs ./app/.next/standalone/apps/rayso/app ./
COPY --chown=nextjs:nodejs ./app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
