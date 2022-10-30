#!/bin/bash
set -e

# workaround to support M1 and Linux
export PATH=/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:"$PATH"

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

if [[ $dependencies == *"python"* ]]; then
    brew install python@3.10 || echo "Install python manually"
fi


brew install $dependencies || true

if [[ $dependencies == *"pyenv"* ]]; then
    # If pyenv not already exists in zshrc, add it
    export PYENV_ROOT="$HOME/.pyenv";
    export PATH="$PYENV_ROOT/bin":$PATH;
    eval "$(pyenv init -)"
    # get latest python version from the pyenv list
    LATEST_PYTHON=$(pyenv install --list | grep --extended-regexp "^\s*3[0-9.]*[0-9]\s*$" | tail -1 | xargs);
    pyenv install $LATEST_PYTHON --force
    pyenv install 2.7.18 --force
    pyenv global $LATEST_PYTHON 2.7.18;
fi
# check if python is availible
if ! [ -x "$(command -v python)" ]; then
    echo "Python is not availible. setting poetry to python3"
    poetry env use python3 || poetry env use /home/linuxbrew/.linuxbrew/bin/python3 || true
fi