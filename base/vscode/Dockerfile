FROM debian:12 AS base

FROM base AS deps

ARG VERSION=1.106.1

# deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl jq unzip tar ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# apps
RUN set -eux; \
    arch=$(dpkg --print-architecture) && \
    \
    # code
    code_url=https://update.code.visualstudio.com; \
    code_target=$([ "$arch" = "amd64" ] && echo "cli-linux-x64" || ([ "$arch" = "arm64" ] && echo "cli-linux-arm64" )); \
    if [ -z "$code_target" ]; then echo "Unsupported architecture: $arch" && exit 1; fi; \
    wget -qO- ${code_url}/${VERSION}/${code_target}/stable | tar xvz -C /usr/bin/ && \
    # eza
    \
    eza_url=https://github.com/eza-community/eza/releases/latest/download; \
    eza_arch=$([ "$arch" = "amd64" ] && echo "x86_64-unknown-linux-gnu" || ([ "$arch" = "arm64" ] && echo "aarch64-unknown-linux-gnu" )); \
    wget -c ${eza_url}/eza_${eza_arch}.tar.gz -O - | tar xvz -C /usr/local/bin && \
    \
    # fzf
    fzf_api_url=https://api.github.com/repos/junegunn/fzf/releases/latest; \
    fzf_url=https://github.com/junegunn/fzf/releases/download; \
    fzf_var=$(curl -s $fzf_api_url | jq -r '.tag_name'); \
    fzf_fmt_ver=$(echo $fzf_var | sed 's/v//'); \
    wget -c ${fzf_url}/${fzf_var}/fzf-${fzf_fmt_ver}-linux_${arch}.tar.gz -O - | tar xvz -C /usr/local/bin && \
    \
    # zoxide
    zoxide_url=https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh; \
    curl -sSfL $zoxide_url | sh -s -- --bin-dir=/usr/local/bin && \
    \
    # mise
    export MISE_INSTALL_PATH=/usr/local/bin/mise && curl -sL https://mise.run | sh && \
    \
    # nerd font
    wget -O CascadiaCode.zip https://github.com/ryanoasis/nerd-fonts/releases/latest/download/CascadiaCode.zip; \
    mkdir -p /usr/share/fonts/CascadiaCode; \
    unzip CascadiaCode.zip -d /usr/share/fonts/CascadiaCode; \
    rm CascadiaCode.zip

FROM base

ARG USERNAME=coder
ARG USER_UID=1000
ARG USER_GID=1000

ENV TERM=xterm-256color \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    HOME=/home/$USERNAME \
    ZSH_CUSTOM=/home/$USERNAME/.oh-my-zsh/custom

# Install deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo git wget curl jq unzip tar \
    openssh-server zsh vim ca-certificates fontconfig \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Creating the user and usergroup
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USERNAME -m -s /bin/zsh $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Copy binaries from builder stage
COPY --from=deps --chown=$USERNAME:$USERNAME /usr/bin/code /usr/bin/code
COPY --from=deps --chown=$USERNAME:$USERNAME /usr/local/bin/ /usr/local/bin/
COPY --from=deps --chown=$USERNAME:$USERNAME /usr/share/fonts/ /usr/share/fonts/
COPY --chown=$USERNAME:$USERNAME ./starship.toml /usr/local/starship.toml

RUN \
    # Update font cache
    fc-cache -fv && \
    \
    # Setup SSH with security hardening
    mkdir -p /var/run/sshd && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && \
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
    echo "AllowUsers $USERNAME" >> /etc/ssh/sshd_config && \
    \
    # Setup workspace
    chmod g+rw /home && \
    mkdir -p /home/workspace && \
    chown -R $USERNAME:$USERNAME /home/workspace && \
    mkdir -p $HOME/.config && \
    chown -R $USERNAME:$USERNAME $HOME/.config && \
    \
    # Setup user ssh environment, chmod 700 for .ssh and 600 for authorized_keys
    mkdir -p $HOME/.ssh && chmod 700 $HOME/.ssh && \
    touch $HOME/.ssh/authorized_keys && chmod 600 $HOME/.ssh/authorized_keys && \
    chown -R $USERNAME:$USERNAME $HOME/.ssh

# Switch to non-root user
USER $USERNAME
WORKDIR /home/workspace

RUN \
    # ohmyzsh
    sh -c "$(curl -fsSL https://install.ohmyz.sh/)" "" --unattended && \
    git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM}/plugins/zsh-autosuggestions && \
    git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM}/plugins/zsh-syntax-highlighting && \
    \
    # starship
    curl -sS https://starship.rs/install.sh | sh -s -- -y && \
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting starship fzf eza zoxide extract mise)/' $HOME/.zshrc && \
    rm -rf $HOME/.cache /tmp/* /var/tmp/*

COPY --chown=$USERNAME:$USERNAME ./docker-entrypoint.sh /docker-entrypoint.sh
RUN sudo chmod +x /docker-entrypoint.sh

SHELL ["/bin/zsh", "-c"]

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 22 8080
