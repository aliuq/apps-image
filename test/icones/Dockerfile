FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/antfu-collective/icones . && git checkout fb6710e

FROM node:22.14.0-alpine3.20 AS build
WORKDIR /app
COPY --from=base /app .
RUN corepack enable && corepack prepare --activate
RUN pnpm install && pnpm run build

FROM aliuq/nginx:vue

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist /app

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
