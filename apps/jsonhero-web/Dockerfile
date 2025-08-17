FROM alpine/git AS source
WORKDIR /app
ARG VERSION=1515705
RUN git clone https://github.com/triggerdotdev/jsonhero-web . && git checkout ${VERSION}

# Build stage
FROM node:16.17.0-alpine3.16
WORKDIR /app
COPY --from=source /app .
RUN npm install && npm run build

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8787
