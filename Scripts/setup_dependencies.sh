#!/bin/bash
set -e

dependencies=$1

# if empty dependencies
if [ -z "$dependencies" ]; then
    echo "No dependencies to install"
    exit 0
fi

if [[ $dependencies == *"python"* ]]; then
    # If pyenv not already exists in zshrc, add it
    curl https://pyenv.run | bash || true
    export PYENV_ROOT="$HOME/.pyenv";
    export PATH="$PYENV_ROOT/bin":$PATH;
    eval "$(pyenv init -)"
    # get latest python version from the pyenv list
    # regex for python version 3.10.*
    LATEST_PYTHON=$(pyenv install --list | grep --extended-regexp "^\s*3\.10\.[0-9]{1,2}\s*$" | tail -1 | xargs);
    pyenv install $LATEST_PYTHON --force
    pyenv install 2.7.18 --force
    pyenv global $LATEST_PYTHON 2.7.18;
fi

if [[ $dependencies == *"poetry" ]]
then
    echo "Installing poetry"
    curl -sSL https://install.python-poetry.org | python3 -
fi
