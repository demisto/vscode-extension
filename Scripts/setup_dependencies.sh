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
brew install $dependencies
# check if "docker" in dependencies
if [[ $dependencies == *"docker"* ]]; then
    brew install --cask docker
    docker ps
fi