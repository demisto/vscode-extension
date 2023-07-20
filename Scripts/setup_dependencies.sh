#!/bin/bash
set -e

dependencies=$1

# if empty dependencies
if [ -z "$dependencies" ]; then
    echo "No dependencies to install"
    exit 0
fi

if [[ $dependencies == *"python"* ]]; then     
    PYENV_ROOT="$HOME/.pyenv";
    PATH="$PYENV_ROOT/bin":$PATH;
    pyenv_broken=true
    eval "$(pyenv init -)" || pyenv_broken=false
    pyenv update || pyenv_broken=false

    if [ "$pyenv_broken" = true ];
    then
        echo "pyenv could not be found, installing pyenv"
        rm -rf $PYENV_ROOT
        curl https://pyenv.run | bash
        eval "$(pyenv init -)"
    fi

    # get latest python version from the pyenv list
    # regex for python version 3.10.*
    LATEST_PYTHON=$(pyenv install --list | grep --extended-regexp "^\s*3\.10\.[0-9]{1,2}\s*$" | tail -1 | xargs);
    pyenv install $LATEST_PYTHON
    pyenv install 2.7.18
    pyenv global $LATEST_PYTHON 2.7.18;
fi

if [[ $dependencies == *"poetry" ]]
then
    echo "Installing poetry"
    curl -sSL https://install.python-poetry.org | python3 -
fi
