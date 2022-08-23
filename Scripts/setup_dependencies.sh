#!/bin/bash
set -e

# workaround to support M1
export PATH=/opt/homebrew/bin:$PATH

dependencies=$1

# if empty dependencies
if [ -z "$dependencies" ]; then
    echo "No dependencies to install"
    exit 0
fi

# check if brew installed
if ! [ -x "$(command -v brew)" ]; then
    echo "Please install Homebrew first to install dependencies. Homebrew installation command:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
fi
brew update
# check if "docker" in dependencies
if [[ $dependencies == *"docker"* ]]; then
    brew install --cask docker || echo "Install Docker manually"
fi

brew install $dependencies

if [[ $dependencies == *"pyenv"* ]]; then
    # If pyenv not already exists in zshrc, add it
    if [ -f ~/.zshrc ] && [ -x "$(command -v pyenv)" ]; then
        echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
        echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
        echo 'eval "$(pyenv init -)"' >> ~/.zshrc
    fi

    export PYENV_ROOT="$HOME/.pyenv";
    export PATH="$PYENV_ROOT/bin":$PATH;
    eval "$(pyenv init -)" || echo "No pyenv, procceding without";
    # get latest python version from the pyenv list
    LATEST_PYTHON=$(pyenv install --list | grep --extended-regexp "^\s*[0-9][0-9.]*[0-9]\s*$" | tail -1);
    pyenv install "$LATEST_PYTHON" 2.7.18;
    pyenv global "$LATEST_PYTHON" 2.7.18;
fi
