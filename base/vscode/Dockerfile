FROM debian:latest AS base

FROM base AS build
ENV DEBIAN_FRONTEND=noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN=true

# 只安装构建必需的包，并在同一层清理缓存
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    ca-certificates \
    jq \
    unzip \
    && apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

ARG VERSION=1.103.2

# code
RUN arch=$(dpkg --print-architecture) && \
    code_target=$([ "$arch" = "amd64" ] && echo "cli-linux-x64" || ([ "$arch" = "arm64" ] && echo "cli-linux-arm64" )) && \
    if [ -z "$code_target" ]; then echo "Unsupported architecture: $arch" && exit 1; fi && \
    wget -qO- https://update.code.visualstudio.com/${VERSION}/${code_target}/stable | tar xvz -C /usr/bin/

# eza
RUN arch=$(dpkg --print-architecture) && \
    eza_arch=$([ "$arch" = "amd64" ] && echo "x86_64-unknown-linux-gnu" || ([ "$arch" = "arm64" ] && echo "aarch64-unknown-linux-gnu" )) && \
    wget -c https://github.com/eza-community/eza/releases/latest/download/eza_${eza_arch}.tar.gz -O - | tar xvz -C /usr/local/bin

# fzf
RUN arch="$(dpkg --print-architecture)" && \
    fzf_var=$(curl -s https://api.github.com/repos/junegunn/fzf/releases/latest | jq -r '.tag_name') && \
    fzf_fmt_ver=$(echo $fzf_var | sed 's/v//') && \
    wget -c https://github.com/junegunn/fzf/releases/download/$fzf_var/fzf-$fzf_fmt_ver-linux_$arch.tar.gz -O - | tar xvz -C /usr/local/bin

# zoxide
RUN curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh -s -- --bin-dir=/usr/local/bin

# mise
RUN export MISE_INSTALL_PATH=/usr/local/bin/mise && curl https://mise.run | sh

# Nerd Font
RUN wget -O CascadiaCode.zip https://github.com/ryanoasis/nerd-fonts/releases/latest/download/CascadiaCode.zip && \
    mkdir -p /usr/share/fonts/CascadiaCode && \
    unzip CascadiaCode.zip -d /usr/share/fonts/CascadiaCode && \
    rm CascadiaCode.zip

FROM base

COPY --from=build /usr/bin/code /usr/bin/code
COPY --from=build /usr/local/bin/eza /usr/local/bin/eza
COPY --from=build /usr/local/bin/fzf /usr/local/bin/fzf
COPY --from=build /usr/local/bin/zoxide /usr/local/bin/zoxide
COPY --from=build /usr/local/bin/mise /usr/local/bin/mise
COPY --from=build /usr/share/fonts/CascadiaCode /usr/share/fonts/CascadiaCode

COPY ./starship.toml /usr/local/starship.toml

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    git \
    wget \
    curl \
    jq \
    zsh \
    ca-certificates \
    fontconfig \
    && apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

ARG USERNAME=coder
# Create a non-root user
RUN useradd -m -s /bin/zsh $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME && \
    usermod -aG sudo $USERNAME && \
    \
    # 图形界面
    mkdir -p /etc/lightdm && \
    echo "[Seat:*]" > /etc/lightdm/lightdm.conf && \
    echo "autologin-user=$USERNAME" >> /etc/lightdm/lightdm.conf && \
    echo "autologin-user-timeout=0" >> /etc/lightdm/lightdm && \
    \
    # 控制台
    mkdir -p /etc/systemd/system/getty@tty1.service.d && \
    echo "[Service]" > /etc/systemd/system/getty@tty1.service.d/override.conf && \
    echo "ExecStart=" >> /etc/systemd/system/getty@tty1.service.d/override.conf && \
    echo "ExecStart=-/sbin/agetty --autologin $USERNAME --noclear %I \$TERM" >> /etc/systemd/system/getty@tty1.service.d/override.conf

RUN chmod g+rw /home && \
    mkdir -p /home/workspace && \
    chown -R $USERNAME:$USERNAME /home/workspace

USER $USERNAME

WORKDIR /home/workspace

ENV HOME=/home/workspace \
    ZSH_CUSTOM=/home/workspace/.oh-my-zsh/custom

# Install ohmyzsh、zsh-autosuggestions、zsh-syntax-highlighting
RUN sh -c "$(curl -fsSL https://install.ohmyz.sh/)" && \
    chown -R $USERNAME:$USERNAME $HOME/.oh-my-zsh && \
    git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting $ZSH_CUSTOM/plugins/zsh-syntax-highlighting && \
    curl -sS https://starship.rs/install.sh | sudo sh -s -- -y && \
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting starship fzf eza zoxide extract mise)/' $HOME/.zshrc && \
    sudo rm -rf "$HOME/.cache" /tmp/* /var/tmp/*

SHELL ["/bin/zsh", "-c"]

COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN sudo chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
