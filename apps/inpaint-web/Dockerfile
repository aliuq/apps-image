FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/lxfater/inpaint-web.git .

FROM node:18.20.2-alpine3.19 AS build
WORKDIR /app
COPY --from=base /app .
RUN npm install && npm run fast-build

FROM aliuq/nginx:vue
WORKDIR /app
COPY --from=build /app/dist /app

EXPOSE 80
