FROM alpine/git AS source
WORKDIR /app
ARG BRANCH=5.x
ARG VERSION=0f029b4
RUN git clone -b ${BRANCH} --recurse-submodules https://github.com/weserv/images . && git checkout ${VERSION}

FROM docker.io/rockylinux/rockylinux:10

LABEL maintainer="Kleis Auke Wolthuizen <info@kleisauke.nl>"

ARG NGINX_VERSION=1.29.4

# Copy the contents of this repository to the container
COPY --from=source /app /var/www/imagesweserv
WORKDIR /var/www/imagesweserv

# Update packages
RUN set -eux; && \
    dnf update -y \
    # Install libvips and needed dependencies
    && dnf install -y epel-release \
    && crb enable \
    && dnf install -y https://rpms.remirepo.net/enterprise/remi-release-10.rpm \
    && dnf config-manager --set-enabled remi \
    && dnf install -y --nogpgcheck https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-10.noarch.rpm \
    && dnf group install -y 'Development Tools' \
    && dnf install -y --setopt=tsflags=nodocs --setopt=install_weak_deps=False \
        meson \
        vips-devel \
        vips-jxl \
        vips-heif \
        vips-poppler \
        vips-magick-im7 \
        jemalloc-devel \
        openssl-devel \
        pcre2-devel \
        zlib-devel \
        nginx-filesystem \
    # Build and install Meson-based project
    && meson setup build --prefix=/usr -Dcli=true \
    && meson compile -C build \
    && meson install -C build \
    # Build and install nginx along with the weserv module
    && mkdir -p nginx \
    && curl -Ls https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz | tar xzC nginx --strip-components=1 \
    && cd nginx \
    && ./configure \
        --prefix=/usr/share/nginx \
        --sbin-path=/usr/sbin/nginx \
        --modules-path=/usr/lib64/nginx/modules \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --http-log-path=/var/log/nginx/access.log \
        --http-client-body-temp-path=/var/lib/nginx/tmp/client_body \
        --http-proxy-temp-path=/var/lib/nginx/tmp/proxy \
        --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi \
        --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi \
        --http-scgi-temp-path=/var/lib/nginx/tmp/scgi \
        --pid-path=/run/nginx.pid \
        --lock-path=/run/lock/subsys/nginx \
        --user=nginx \
        --group=nginx \
        --add-module=/var/www/imagesweserv \
        --with-file-aio \
        --with-http_ssl_module \
        --with-http_v2_module \
        --with-http_realip_module \
        --with-http_stub_status_module \
        --with-http_secure_link_module \
        --with-pcre-jit \
    && make -j$(nproc) \
    && make install \
    && ldconfig \
    && cd ../ \
    # Remove build directories and dependencies
    && rm -rf build nginx \
    && dnf group remove -y 'Development Tools' \
    && dnf remove -y \
        meson \
        vips-devel \
        openssl-devel \
        pcre2-devel \
        zlib-devel \
    && dnf clean all \
    # Ensure nginx directories exist with the correct permissions
    && mkdir -m 700 /var/lib/nginx \
    && mkdir -m 700 /var/lib/nginx/tmp \
    && mkdir -m 700 /usr/lib64/nginx \
    && mkdir -m 755 /usr/lib64/nginx/modules \
    # Forward request and error logs to docker log collector
    && ln -sf /dev/stdout /var/log/nginx/weserv-access.log \
    && ln -sf /dev/stderr /var/log/nginx/weserv-error.log \
    # Copy nginx configuration to the appropriate location
    && cp ngx_conf/*.conf /etc/nginx

# Set default timezone (can be overridden with -e "TZ=Continent/City")
ENV TZ=Europe/Amsterdam \
    # Use jemalloc on glibc-based Linux systems to reduce the effects of memory fragmentation
    LD_PRELOAD=/usr/lib64/libjemalloc.so

EXPOSE 80

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
