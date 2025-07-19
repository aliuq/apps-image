FROM alpine/git AS base
WORKDIR /app
RUN git clone https://github.com/lsky-org/lsky-pro.git . && git checkout bbdb1fb

FROM node:20-alpine3.20 AS web
WORKDIR /app
COPY --from=base /app .
RUN npm install && npm run prod && rm -rf node_modules

FROM php:8.0.2-alpine3.13 AS builder
WORKDIR /app
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
COPY --from=web /app .
RUN install-php-extensions @composer && \
    composer install --no-dev --optimize-autoloader --no-interaction --no-progress --no-suggest && \
    tar -czf /tmp/app.tar.gz .

FROM nginx:alpine AS nginx

FROM php:8.0.2-fpm-alpine3.12
WORKDIR /app

COPY --from=nginx /etc/nginx /etc/nginx
COPY --from=nginx /docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=nginx /docker-entrypoint.d /docker-entrypoint.d

COPY --from=builder /tmp/app.tar.gz /tmp/app.tar.gz
COPY --from=builder /usr/local/bin/install-php-extensions /usr/local/bin/install-php-extensions

COPY ./docker-entrypoint.sh /docker-entrypoint.d/00-entrypoint.sh
COPY ./default.conf /etc/nginx/conf.d/default.conf

RUN install-php-extensions @composer pdo_mysql pdo_pgsql pdo_sqlsrv bcmath imagick redis && \
    mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    apk update && apk add --no-cache nginx && \
    chmod +x /docker-entrypoint.sh && \
    chmod +x -R /docker-entrypoint.d && \
    rm -rf /var/cache/apk/* && \
    tar -czf /tmp/nginx.tar.gz /etc/nginx

ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD [ "nginx", "-g", "daemon off;"]

EXPOSE 80
VOLUME /etc/nginx
VOLUME /app
