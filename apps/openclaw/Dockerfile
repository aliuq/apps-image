FROM ubuntu:24.04

ARG OPENCLAW_VERSION="{{version}}"
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
    rm -rf $HOME/.cache /tmp/* /var/tmp/*

# For agent
RUN set -eux; \
    mise use -g -y usage bun node@lts yarn@1 pnpm python@3 pipx uv && \
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
        yt-dlp \
        playwright; \
    do \
        uv tool install --no-cache $pkg; \
    done && \
    uv cache clean

# OpenClaw
RUN set -eux; \
    bun add -g openclaw@${OPENCLAW_VERSION} && \
    openclaw completion -y --shell zsh --write-state --install && \
    bun pm cache rm -g

# Copy files
COPY --chown=$USERNAME:$USERNAME ./starship.toml /usr/local/starship.toml
COPY --chown=$USERNAME:$USERNAME ./docker-entrypoint.sh /docker-entrypoint.sh
COPY ./update_config.mjs /root/update_config.mjs

RUN sudo chmod +x /docker-entrypoint.sh

SHELL ["/bin/zsh", "-c"]

ENTRYPOINT ["/docker-entrypoint.sh"]
