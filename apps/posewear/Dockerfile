FROM node:24.22.1-alpine3.24

ENV NODE_ENV=production \
    PORT=80 \
    HOST=0.0.0.0

WORKDIR /app

RUN addgroup -S -g 1001 posewear && \
    adduser -S -u 1001 -G posewear posewear

COPY --chown=posewear:posewear ./app/dist ./dist
COPY --chown=posewear:posewear ./server.js ./server.js

USER posewear

EXPOSE 80

CMD ["node", "/app/server.js"]
