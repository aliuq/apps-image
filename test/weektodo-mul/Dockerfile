FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/manuelernestog/weektodo.git . && git checkout {{sha}}

FROM node:16.20.2-alpine3.18 AS builder
WORKDIR /app
COPY --from=base /app .
RUN yarn install --frozen-lockfile
RUN yarn run build

FROM nginx:1.21.3-alpine

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
