FROM node:18.20.2-alpine3.19 as builder
WORKDIR /app
RUN apk add git && git clone https://github.com/lxfater/inpaint-web.git .
RUN npm install
RUN npm run fast-build

FROM nginx:1.21.3-alpine

LABEL version="0.1.0"
LABEL repository="https://github.com/lxfater/inpaint-web"

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
