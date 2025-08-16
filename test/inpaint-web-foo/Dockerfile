FROM alpine/git AS source
WORKDIR /app
RUN git clone https://github.com/lxfater/inpaint-web . && git checkout {{sha}}

FROM node:18.20.2-alpine3.19 AS build
WORKDIR /app
COPY --from=source /app .

RUN --mount=type=cache,target=/root/.npm \
    npm ci

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/node_modules/.cache \
    npm run fast-build

FROM aliuq/nginx:vue
WORKDIR /app
COPY --from=build /app/dist /app

EXPOSE 80
