FROM php:8.0.2-alpine3.13 AS builder

WORKDIR /app
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

ARG LSKY_VERSION=2.1
ARG REPO_URL=https://github.com/lsky-org/lsky-pro/releases/download/${LSKY_VERSION}/lsky-pro-${LSKY_VERSION}.zip
RUN install-php-extensions @composer bcmath pdo_mysql && \
    curl -fsSL ${REPO_URL} -o lsky-pro.zip && \
    unzip lsky-pro.zip && \
    rm lsky-pro.zip && \
    composer install --no-dev --optimize-autoloader --no-interaction --no-progress --no-suggest

FROM php:8.0.2-alpine3.13

LABEL version="2.1"
LABEL repository="https://github.com/lsky-org/lsky-pro"

ENV UPLOAD_MAX_FILESIZE=10M
ENV POST_MAX_SIZE=10M

WORKDIR /app

COPY --from=builder /usr/local/lib/php/extensions /usr/local/lib/php/extensions
COPY --from=builder /usr/local/etc/php/conf.d /usr/local/etc/php/conf.d
COPY --from=builder /usr/local/bin/install-php-extensions /usr/local/bin/install-php-extensions
COPY --from=builder /app /app

RUN install-php-extensions imagick pdo_pgsql pdo_sqlsrv redis && \
    mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT [ "/docker-entrypoint.sh" ]

EXPOSE 80
VOLUME /app
