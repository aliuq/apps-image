FROM debian:latest AS base

FROM base AS deps
ENV DEBIAN_FRONTEND=noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN=true

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

COPY --from=deps /usr/bin/code /usr/bin/code
COPY --from=deps /usr/local/bin/eza /usr/local/bin/eza
COPY --from=deps /usr/local/bin/fzf /usr/local/bin/fzf
COPY --from=deps /usr/local/bin/zoxide /usr/local/bin/zoxide
COPY --from=deps /usr/local/bin/mise /usr/local/bin/mise
COPY --from=deps /usr/share/fonts/CascadiaCode /usr/share/fonts/CascadiaCode

COPY ./starship.toml /usr/local/starship.toml

ENV HOME=/home/workspace \
    ZSH_CUSTOM=/home/workspace/.oh-my-zsh/custom

ARG USERNAME=coder

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    git \
    wget \
    curl \
    jq \
    openssh-server \
    zsh \
    vim \
    ca-certificates \
    fontconfig \
    && apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/zsh $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME && \
    usermod -aG sudo $USERNAME && \
    \
    # Change home directory to /home/workspace, if not changed, ssh connection will fail due to /etc/passwd
    usermod -d $HOME $USERNAME && \
    \
    # Set default user to $USERNAME
    echo "\n# Start $USERNAME user" >> /root/.bashrc && \
    echo "exec su - $USERNAME" >> /root/.bashrc

RUN chmod g+rw /home && \
    mkdir -p /home/workspace && \
    chown -R $USERNAME:$USERNAME /home/workspace && \
    chmod 755 /home/workspace && \
    \
    # ssh
    mkdir -p $HOME/.ssh && chmod 700 $HOME/.ssh && \
    touch $HOME/.ssh/authorized_keys && chmod 600 $HOME/.ssh/authorized_keys && \
    chown -R $USERNAME:$USERNAME $HOME/.ssh && \
    \
    # Disable password authentication for users
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Install ohmyzsh, zsh-autosuggestions, zsh-syntax-highlighting
RUN sh -c "$(curl -fsSL https://install.ohmyz.sh/)" && \
    chown -R $USERNAME:$USERNAME $HOME/.oh-my-zsh && \
    git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting $ZSH_CUSTOM/plugins/zsh-syntax-highlighting && \
    curl -sS https://starship.rs/install.sh | sudo sh -s -- -y && \
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting starship fzf eza zoxide extract mise)/' $HOME/.zshrc && \
    sudo rm -rf "$HOME/.cache" /tmp/* /var/tmp/*

USER $USERNAME

WORKDIR /home/workspace

SHELL ["/bin/zsh", "-c"]

COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN sudo chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
