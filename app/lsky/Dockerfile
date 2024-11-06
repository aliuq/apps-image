FROM php:8.0.2-alpine3.13 AS builder

WORKDIR /app
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

ARG LSKY_VERSION=2.1
ARG REPO_URL=https://github.com/lsky-org/lsky-pro/releases/download/${LSKY_VERSION}/lsky-pro-${LSKY_VERSION}.zip
RUN install-php-extensions @composer && \
    curl -fsSL ${REPO_URL} -o lsky-pro.zip && \
    unzip lsky-pro.zip && \
    rm lsky-pro.zip && \
    composer install --no-dev --optimize-autoloader --no-interaction --no-progress --no-suggest && \
    tar -czf /tmp/app.tar.gz .

FROM nginx:alpine AS nginx

FROM php:8.0.2-fpm-alpine3.12

LABEL version="2.1"
LABEL repository="https://github.com/lsky-org/lsky-pro"

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
VOLUME /app
VOLUME /etc/nginx
