#!/bin/sh

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
    echo "$ME: Extracted /tmp/app.tar.gz to /app"
fi

if [ ! -d "/app/vendor" ]; then
    composer install
    echo "\n$ME: Installed composer dependencies"
fi

php artisan serve --host=0.0.0.0 --port=80
