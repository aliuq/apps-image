FROM node:18.20.4-alpine3.20 AS builder

WORKDIR /app
RUN apk add git && git clone https://github.com/vastsa/FileCodeBoxFronted.git .
RUN sed -i 's/VITE_API_BASE_URL_PROD=.*/VITE_API_BASE_URL_PROD=\\$BASE_API/g' .env.production
RUN npm install -g pnpm
RUN pnpm install && pnpm build

FROM aliuq/nginx:vue

LABEL version="0.0.2"
LABEL repository="https://github.com/vastsa/FileCodeBoxFronted"

ENV BASE_API=

COPY --from=builder /app/dist /app
COPY ./docker-entrypoint.sh /docker-entrypoint.d/0-replace-base-api.sh
