FROM alpine:3.23

RUN apk add --no-cache \
    bash \
    git \
    curl \
    zsh \
    starship \
    shadow \
    ca-certificates \
    openssl \
    python3 \
    libgcc \
    grep \
    ncurses \
    coreutils \
    util-linux \
    findutils

SHELL ["bash", "-c"]

ARG HOME=/root

ENV TERM=xterm-256color \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    HOME=${HOME} \
    ZSH_CUSTOM=${HOME}/.oh-my-zsh/custom \
    PATH="${HOME}/.local/share/fnm:$PATH" \
    FNM_ARCH=x64-musl \
    FNM_NODE_DIST_MIRROR=https://unofficial-builds.nodejs.org/download/release

COPY ./scripts /tmp/scripts

# zsh / oh-my-zsh
RUN set -eux; \
    chsh -s /bin/zsh && \
    git clone --depth=1 https://github.com/ohmyzsh/ohmyzsh.git ${HOME}/.oh-my-zsh && \
    cp ${HOME}/.oh-my-zsh/templates/zshrc.zsh-template ${HOME}/.zshrc && \
    zsh_user="https://github.com/zsh-users" && \
    git clone --depth=1 ${zsh_user}/zsh-autosuggestions ${ZSH_CUSTOM}/plugins/zsh-autosuggestions && \
    git clone --depth=1 ${zsh_user}/zsh-syntax-highlighting ${ZSH_CUSTOM}/plugins/zsh-syntax-highlighting && \
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting)/g' ~/.zshrc && \
    \
    # add theme
    mv /tmp/scripts/devcontainers.zsh-theme ${ZSH_CUSTOM}/themes/devcontainers.zsh-theme && \
    cat /tmp/scripts/bash_theme_snippet.sh >> /root/.bashrc && \
    rm -rf ${HOME}/.oh-my-zsh/.git ${ZSH_CUSTOM}/plugins/zsh-autosuggestions/.git ${ZSH_CUSTOM}/plugins/zsh-syntax-highlighting/.git

# Install fnm
RUN set -eux; \
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell && \
    ln -sf ${HOME}/.local/share/fnm/fnm /usr/local/bin/fnm && \
    source /tmp/scripts/helper.sh && _add_omz_plugin fnm && \
    \
    # add fnm to bashrc and zshrc
    echo "# fnm" >> ~/.bashrc && \
    echo "eval \"\$(fnm env --use-on-cd --shell bash)\"" >> ~/.bashrc && \
    echo "# fnm" >> ~/.zshrc && \
    echo "eval \"\$(fnm env --use-on-cd --shell zsh)\"" >> ~/.zshrc && \
    rm -rf /tmp/scripts ${HOME}/.cache
