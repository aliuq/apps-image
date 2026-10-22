FROM alpine/git AS base
WORKDIR /app
ARG VERSION=0296d29
RUN git clone https://github.com/manuelernestog/weektodo . && git checkout ${VERSION}

FROM node:24.22.1-alpine3.24 AS builder
WORKDIR /app
COPY --from=base /app .
# 上游 Vue CLI 4 的 node-ipc 引擎声明仅包含旧版 Node，实际兼容性由构建验证
RUN yarn install --frozen-lockfile --ignore-engines --network-timeout 600000
# Webpack 4 使用 MD4，仅在编译时启用 OpenSSL 旧算法支持
RUN NODE_OPTIONS=--openssl-legacy-provider yarn run build

FROM nginx:1.30.6-alpine3.24

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
