#!/bin/bash

set -e

# This is to take python2 from pyenv
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin":"/opt/homebrew/bin":"$PATH"
eval "$(pyenv init -)" || echo "No pyenv, procceding without"

dockerImage=$1
name=$2
dirPath=$3
pythonPath=$4

# workaround to support M1
export PATH=/opt/homebrew/bin:$PATH

cd "$dirPath"
# removing compiled and cached files
rm -rf *.pyc
rm -rf __pycache__
rm -rf .mypy_cache
rm -rf .pytest_cache

# Getting the test image
testImage=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "$dockerImage" | head -1)
echo "Using test image env: $testImage"
docker rm -f "${name}" &> /dev/null || true
pythonVersion=$(docker run --name ${name} ${testImage} "python -c 'import sys; print(sys.version_info[0])'")
echo "Using python version: $pythonVersion"
docker rm -f "${name}" || true
docker run --name "${name}" "$testImage" 'pip list --format=freeze > /requirements.txt'
docker cp "${name}":/requirements.txt .
docker rm -f "${name}" || true



# check if virtualenv module is installed
isVirtualEnvInstalled=true
$pythonPath -m virtualenv --version > /dev/null 2>&1 || isVirtualEnvInstalled=false
if [ "$isVirtualEnvInstalled" = "false" ]; then
    $pythonPath -m pip install virtualenv
fi

$pythonPath -m virtualenv -p python"${pythonVersion}" venv

venv/bin/pip --version || (echo "No pip, check your python"${pythonVersion}" installation" && exit 1)

while read line; do
    venv/bin/pip install --disable-pip-version-check --no-cache-dir $line || echo "Could not install dependency $line, proceeding"
done < requirements.txt