FROM alpine/git AS source
WORKDIR /app
ARG VERSION=4d40739
RUN git clone https://github.com/antfu-collective/icones . && git checkout ${VERSION}

FROM node:22.14.0-alpine3.20 AS build
WORKDIR /app
COPY --from=source /app .
RUN corepack enable && corepack prepare --activate
RUN pnpm install && pnpm run build

FROM aliuq/nginx:vue

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist /app

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
