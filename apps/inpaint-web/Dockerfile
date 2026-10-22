FROM alpine/git AS base
WORKDIR /app
ARG VERSION=d1b6cfd
RUN git clone https://github.com/lxfater/inpaint-web . && git checkout ${VERSION}

FROM node:24.22.1-alpine3.24 AS build
WORKDIR /app
COPY --from=base /app .
RUN npm install && npm run fast-build

FROM aliuq/nginx:vue
WORKDIR /app
COPY --from=build /app/dist /app

EXPOSE 80
