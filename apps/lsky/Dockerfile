FROM php:8.2.35-alpine3.24 AS builder

WORKDIR /app
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

ARG LSKY_VERSION=2.1
ARG REPO_URL=https://github.com/lsky-org/lsky-pro/releases/download/${LSKY_VERSION}/lsky-pro-${LSKY_VERSION}.zip
# 稳定版归档内的旧依赖不兼容 PHP 8.2，仅定向更新相关包并排除开发依赖
RUN curl -fsSL ${REPO_URL} -o lsky-pro.zip && \
    unzip lsky-pro.zip && \
    rm lsky-pro.zip && \
    install-php-extensions ftp @composer && \
    composer update \
        nesbot/carbon:2.73.0 \
        laminas/laminas-diactoros:2.24.2 \
        nette/schema:1.4.0 \
        nette/utils:4.1.6 \
        phpspec/prophecy:1.22.0 \
        --with-dependencies --minimal-changes \
        --no-dev --optimize-autoloader --no-interaction --no-progress && \
    tar -czf /tmp/app.tar.gz .

FROM nginx:alpine AS nginx

FROM php:8.2.35-fpm-alpine3.24

WORKDIR /app

COPY --from=nginx /etc/nginx /etc/nginx
COPY --from=nginx /docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=nginx /docker-entrypoint.d /docker-entrypoint.d

COPY --from=builder /tmp/app.tar.gz /tmp/app.tar.gz
COPY --from=builder /usr/local/bin/install-php-extensions /usr/local/bin/install-php-extensions

COPY ./docker-entrypoint.sh /docker-entrypoint.d/90-lsky-entrypoint.sh
COPY --chmod=0755 ./nginx-entrypoint.sh /usr/local/bin/lsky-entrypoint
COPY ./default.conf /etc/nginx/conf.d/default.conf

RUN install-php-extensions @composer ftp pdo_mysql pdo_pgsql pdo_sqlsrv bcmath imagick redis && \
    mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    apk update && apk add --no-cache nginx && \
    chmod +x /docker-entrypoint.sh && \
    chmod +x -R /docker-entrypoint.d && \
    rm -rf /var/cache/apk/* && \
    tar -czf /tmp/nginx.tar.gz /etc/nginx

ENTRYPOINT [ "/usr/local/bin/lsky-entrypoint" ]
CMD [ "nginx", "-g", "daemon off;"]

EXPOSE 80
VOLUME /etc/nginx
VOLUME /app
