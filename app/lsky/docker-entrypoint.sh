#!/bin/sh

set -e

ME=$(basename "$0")

if [ ! -z "$UPLOAD_MAX_FILESIZE" ]; then
    sed -i "s/upload_max_filesize = .*/upload_max_filesize = $UPLOAD_MAX_FILESIZE/g" $PHP_INI_DIR/php.ini
    echo "$ME: Set upload_max_filesize to $UPLOAD_MAX_FILESIZE"
fi

if [ ! -z "$POST_MAX_SIZE" ]; then
    sed -i "s/post_max_size = .*/post_max_size = $POST_MAX_SIZE/g" $PHP_INI_DIR/php.ini
    echo "$ME: Set post_max_size to $POST_MAX_SIZE"
fi

if [ ! -d "/app" ] || [ -z "$(ls -A /app)" ]; then
    tar -xzf /tmp/app.tar.gz -C /app
    chmod -R 777 /app
    echo "$ME: Extracted /tmp/app.tar.gz to /app"
fi

if [ ! -d "/etc/nginx" ] || [ -z "$(ls -A /etc/nginx)" ]; then
    tar -xzf /tmp/nginx.tar.gz -C /
    chmod -R 777 /etc/nginx
    echo "$ME: Extracted /tmp/nginx.tar.gz to /etc/nginx"
fi

php-fpm -D
