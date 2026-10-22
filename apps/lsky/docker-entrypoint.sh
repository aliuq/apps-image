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

# 使用独立的可写配置，不改写只读目录或单文件挂载中的用户配置。
runtime_dir=/tmp/lsky-nginx
rm -rf "$runtime_dir"
mkdir -p "$runtime_dir/conf.d"
for config in /etc/nginx/*; do
    name=${config##*/}
    case "$name" in
        nginx.conf|conf.d) continue ;;
    esac
    ln -s "$config" "$runtime_dir/$name"
done
if [ -d /etc/nginx/conf.d ]; then
    cp -a /etc/nginx/conf.d/. "$runtime_dir/conf.d/"
fi
# 忽略旧入口生成的全局限制，避免与已有 http 级配置重复。
rm -f "$runtime_dir/conf.d/00-upload-limit.conf"
sed \
    -e 's/^[[:space:]]*user[[:space:]][^;]*;/user www-data;/' \
    -e "/^[[:space:]]*include[[:space:]]/s@/etc/nginx/conf.d/@$runtime_dir/conf.d/@g" \
    /etc/nginx/nginx.conf > "$runtime_dir/nginx.conf"

# 仅为镜像自带的 server 同步限制，自定义 server 的指令和 include 保持原样。
post_max_size=$(php -r 'echo ini_get("post_max_size");')
tar -xOzf /tmp/nginx.tar.gz etc/nginx/conf.d/default.conf > "$runtime_dir/default.conf"
if cmp -s /etc/nginx/conf.d/default.conf "$runtime_dir/default.conf"; then
    rm -f "$runtime_dir/conf.d/default.conf"
    sed "/^[[:space:]]*server[[:space:]]*{/a\\    client_max_body_size $post_max_size;" \
        "$runtime_dir/default.conf" > "$runtime_dir/conf.d/default.conf"
else
    echo "$ME: Custom nginx server configuration detected; its request body limits are preserved"
fi
rm "$runtime_dir/default.conf"

# Alpine 的请求体与上游响应临时目录父级也必须允许 www-data 进入。
chown www-data:www-data /var/lib/nginx /var/lib/nginx/tmp

php-fpm -D
