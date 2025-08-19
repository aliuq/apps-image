FROM alpine/git AS source
WORKDIR /app
ARG VERSION=4b9de83
RUN git clone https://github.com/liyupi/yulegeyu . && git checkout ${VERSION}

FROM node:20.10.0-alpine AS build
WORKDIR /app

COPY --from=source /app .
RUN yarn install --frozen-lockfile --network-timeout 600000
RUN yarn run build

FROM aliuq/nginx:vue

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist /app

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
