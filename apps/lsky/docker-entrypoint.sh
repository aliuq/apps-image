#!/bin/sh

set -e

ME=$(basename "$0")

UPLOAD_MAX_FILESIZE=${UPLOAD_MAX_FILESIZE:-10M}
POST_MAX_SIZE=${POST_MAX_SIZE:-15M}

sed -i "s/upload_max_filesize = .*/upload_max_filesize = $UPLOAD_MAX_FILESIZE/g" $PHP_INI_DIR/php.ini
echo "$ME: Set upload_max_filesize to $UPLOAD_MAX_FILESIZE"

sed -i "s/post_max_size = .*/post_max_size = $POST_MAX_SIZE/g" $PHP_INI_DIR/php.ini
echo "$ME: Set post_max_size to $POST_MAX_SIZE"

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

# 与 PHP-FPM 使用同一用户，确保可读取应用创建的 0700 上传目录
sed -i 's/^[[:space:]]*user[[:space:]][^;]*;/user www-data;/' /etc/nginx/nginx.conf
# Alpine 的请求体与上游响应临时目录父级也必须允许该用户进入
chown www-data:www-data /var/lib/nginx /var/lib/nginx/tmp

# 从 PHP 的实际配置同步请求体上限，同时兼容已有的 nginx 数据卷
post_max_size=$(php -r 'echo ini_get("post_max_size");')
printf 'client_max_body_size %s;\n' "$post_max_size" > /etc/nginx/conf.d/00-upload-limit.conf

php-fpm -D
