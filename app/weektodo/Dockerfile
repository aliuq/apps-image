FROM node:16.20.2-alpine3.18 as builder
WORKDIR /app
RUN apk add git && git clone https://github.com/manuelernestog/weektodo.git .
RUN yarn install --frozen-lockfile
RUN yarn run build

FROM nginx:1.21.3-alpine

LABEL version="2.2.0"
LABEL repository="https://github.com/manuelernestog/weektodo"

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
