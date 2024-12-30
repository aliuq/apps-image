FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/liyupi/yulegeyu.git .

FROM node:20.10.0-alpine AS build
WORKDIR /app
COPY --from=base /app .
RUN yarn install && yarn build

FROM aliuq/nginx:vue

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist /app

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
