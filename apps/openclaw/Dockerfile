FROM ubuntu:24.04

ARG OPENCLAW_VERSION="2026.3.22"
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
        ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Creating the user and usergroup
RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USERNAME -m -s /bin/bash $USERNAME && \
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

# For agent
RUN set -eux; \
    # mise apps
    mise use -g -y usage bun node@lts python@3 pipx uv && \
    \
    # python
    python3 -m pip install --no-cache-dir --upgrade pip && \
    for pkg in \
        yt-dlp \
        playwright; \
    do \
        uv tool install --no-cache $pkg; \
    done && \
    \
    # Openclaw
    bun add -g openclaw@${OPENCLAW_VERSION} && \
    \
    # clean
    mise cache clear && bun pm cache rm -g && uv cache clean

COPY --chown=$USERNAME:$USERNAME ./docker-entrypoint.sh /docker-entrypoint.sh
RUN sudo chmod +x /docker-entrypoint.sh

COPY ./update_config.mjs /root/update_config.mjs

SHELL ["/bin/bash", "-c"]

ENTRYPOINT ["/docker-entrypoint.sh"]
