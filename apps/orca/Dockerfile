FROM ghcr.io/aliuq/devcontainer:core

ARG ORCA_VERSION="1.4.281"

ENV PATH="/opt/orca-server/bin:$MISE_DATA_DIR/shims:$PATH"

RUN set -eux; \
    arch=$(dpkg --print-architecture); \
    case "$arch" in \
        amd64) ORCA_ARCH=x64 ;; \
        arm64) ORCA_ARCH=arm64 ;; \
        *) echo "Unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    archive="orca-server-linux-${ORCA_ARCH}.tar.gz"; \
    release_url="https://github.com/stablyai/orca/releases/download/v${ORCA_VERSION}"; \
    curl -fsSL "${release_url}/${archive}" -o "/tmp/${archive}"; \
    sudo mkdir -p /opt/orca-server; \
    sudo tar -xzf "/tmp/${archive}" -C /opt/orca-server --strip-components=1; \
    rm -f "/tmp/${archive}"

RUN set -eux; \
    mise use -g -y tailscale@latest; \
    zsh -c 'source "$HOME/.zshrc"; omz plugin enable starship';

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sudo chmod 0755 /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

VOLUME /root/.config/orca
VOLUME /root/orca
VOLUME /var/lib/tailscale

EXPOSE 6768
