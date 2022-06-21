ARG IMAGENAME
ARG LOCAL_WORKSPACE_PATH
ARG CONTAINER_WORKSPACE_PATH

FROM ${IMAGENAME}

ADD certs.crt /usr/local/share/ca-certificates/certs.crt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/certs.crt 

RUN update-ca-certificates

# install zsh and pyenv
RUN cd ~ \
    && sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.1.2/zsh-in-docker.sh)" -- \
    -p https://github.com/zsh-users/zsh-autosuggestions \
    -p https://github.com/zsh-users/zsh-completions \
    -p https://github.com/zsh-users/zsh-syntax-highlighting \
    -p git 

RUN git clone https://github.com/pyenv/pyenv.git ~/.pyenv \
    && echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc \
    && echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc \
    && echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# start zsh
CMD [ "zsh" ]
