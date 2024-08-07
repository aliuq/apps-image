FROM alpine:3.19.1

# For nghttp2-dev, we need this respository.
# RUN echo https://dl-cdn.alpinelinux.org/alpine/edge/testing >>/etc/apk/repositories
# RUN echo https://dl-cdn.alpinelinux.org/alpine/v3.19/main >>/etc/apk/repositories
# 

LABEL version="0.0.2"
LABEL maintainer="AliuQ <aliuq@bilishare.com>"

RUN apk update && apk --no-cache add \
    bash git curl zsh starship shadow \
    ca-certificates openssl python3 make gcc g++ libgcc linux-headers grep \
    ncurses coreutils util-linux binutils findutils

SHELL ["bash", "-c"]

ENV NVM_VERSION 0.39.7

# install nvm
RUN touch ~/.bashrc && \
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash && \
    chmod +x $HOME/.nvm/nvm.sh

# install oh-my-zsh
RUN chsh -s /bin/zsh && \
    curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | bash && \
    git clone https://github.com/zsh-users/zsh-autosuggestions ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting ~/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting && \
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting)/g' ~/.zshrc && \
    echo "export USER=\$(whoami)" >> ~/.zshrc

# other
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash && \
    echo "eval \"\$(starship init zsh)\"" >> ~/.zshrc && \
    curl -fs -S --create-dirs -o ~/.config/starship.toml https://raw.githubusercontent.com/aliuq/config/master/starship.toml

RUN apk cache clean && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/log/*

ENTRYPOINT [ "/bin/zsh" ]
