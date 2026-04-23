FROM ubuntu:24.04

# Remove the default 'ubuntu' user if it exists to avoid conflicts with the new user we will create later.
# This is important to ensure that the container runs with the correct user permissions.
RUN if id "ubuntu" &>/dev/null; then \
        echo "Deleting user 'ubuntu'" && userdel -f -r ubuntu || echo "Failed to delete ubuntu user"; \
    else \
        echo "User 'ubuntu' does not exist"; \
    fi;

ARG OPENCLAW_VERSION="2026.4.22"
ARG USERNAME=openclaw
ARG USER_UID=1009
ARG USER_GID=1009

ENV TERM=xterm-256color \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    HOME=/home/$USERNAME \
    ZSH_CUSTOM=/home/$USERNAME/.oh-my-zsh/custom \
    PATH="/home/$USERNAME/.local/bin:/home/$USERNAME/.local/share/mise/shims:/home/$USERNAME/.bun/bin:$PATH"

# Install runtime deps only (build tools removed; python3 from apt avoids source compilation)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        sudo \
        git \
        wget \
        curl \
        jq \
        unzip \
        tar \
        xz-utils \
        ca-certificates \
        zsh \
        vim && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Creating the user and usergroup
RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USERNAME -m -s /bin/zsh $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

RUN set -eux; \
    # mise
    export MISE_INSTALL_PATH=/usr/local/bin/mise && curl -sL https://mise.run | sh && \
    # ffmpeg
    wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar xf ffmpeg-release-amd64-static.tar.xz && \
    cd ffmpeg-*-static && \
    cp ffmpeg ffprobe /usr/local/bin/ && \
    cd .. && \
    rm -rf ffmpeg-*

USER $USERNAME
WORKDIR $HOME/.openclaw

# For development
RUN set -eux; \
    # ohmyzsh
    sh -c "$(curl -fsSL https://install.ohmyz.sh/)" "" --unattended && \
    zsh_repo="https://github.com/zsh-users" && \
    git clone --depth=1 $zsh_repo/zsh-autosuggestions ${ZSH_CUSTOM}/plugins/zsh-autosuggestions && \
    git clone --depth=1 $zsh_repo/zsh-syntax-highlighting ${ZSH_CUSTOM}/plugins/zsh-syntax-highlighting && \
    \
    # starship
    curl -sS https://starship.rs/install.sh | sh -s -- -y && \
    \
    # ohmyzsh config
    plugins="git zsh-autosuggestions zsh-syntax-highlighting starship extract mise bun uv" && \
    sed -i "s/plugins=(git)/plugins=($plugins)/" $HOME/.zshrc && \
    \
    # clean
    rm -rf $HOME/.cache /tmp/* /var/tmp/* && \
    \
    # Bindkey '^H' to backward-delete-char in zsh
    echo "bindkey '^H' backward-delete-char" >> $HOME/.zshrc; \
    # Add alias cls for clear in zsh
    echo "alias cls='clear'" >> $HOME/.zshrc;

# For agent
RUN set -eux; \
    mise use -g -y usage bun node@lts yarn@1 pnpm python@3 pipx uv rg && \
    mise cache clear

# Python tools
RUN set -eux; \
    python3 -m pip install --no-cache-dir --upgrade pip && \
    for pkg in \
        black \
        flake8 \
        autopep8 \
        yapf \
        mypy \
        pydocstyle \
        pycodestyle \
        bandit \
        pipenv \
        virtualenv \
        pytest \
        yt-dlp; \
    do \
        uv tool install --no-cache $pkg; \
    done && \
    uv cache clean

# OpenClaw
RUN set -eux; \
    bun add -g openclaw@${OPENCLAW_VERSION} && \
    # Trust the openclaw package globally to run postinstall scripts.
    # Download bundled  plugins to avoid error `Error: Cannot find module *`
    bun pm trust openclaw -g && \
    if openclaw completion -y --shell zsh --write-state --install; then \
        echo "OpenClaw completions installed"; \
    else \
        echo "Warning: OpenClaw completion install failed; continuing without shell completions" >&2; \
    fi && \
    # Add alias `oc` for openclaw when current shell rc not contain alias `oc` and `oc` is not a command,
    # to avoid conflict with existing `oc` command if any
    if ! command -v oc >/dev/null 2>&1 && ! grep -qF "alias oc=" "$HOME/.zshrc"; then \
        echo "alias oc='openclaw'" >> "$HOME/.zshrc"; \
    fi && \
    bun pm cache rm -g && \
    \
    # Archive global bun packages to avoid re-downloading them when container restarts
    cd $HOME/.bun/install/global && \
    tar -czf /tmp/node_modules.tar.gz node_modules && \
    rm -rf node_modules && \
    cd $HOME/.openclaw

# Copy files
COPY --chown=$USERNAME:$USERNAME ./starship.toml /usr/local/starship.toml
COPY --chown=$USERNAME:$USERNAME ./docker-entrypoint.sh /docker-entrypoint.sh
COPY ./update_config.mjs /root/update_config.mjs

RUN sudo chmod +x /docker-entrypoint.sh

SHELL ["/bin/zsh", "-c"]

# Renference: https://github.com/openclaw/openclaw/blob/main/Dockerfile
# Built-in probe endpoints for container health checks:
#   - GET /healthz (liveness) and GET /readyz (readiness)
#   - aliases: /health and /ready
# For external access from host/ingress, override bind to "lan" and set auth.
HEALTHCHECK --interval=3m --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 18789
