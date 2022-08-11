#!/bin/bash

set -e

dockerImage=$1
name=$2
dirPath=$3
extraReqs=$4
pythonPath=$5

# workaround to support M1
export PATH=/opt/homebrew/bin:$PATH

cd "$dirPath"
testImage=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "$dockerImage" | head -1)
echo "Using test image env: $testImage"
docker rm -f "${name}" &> /dev/null || true
pythonVersion=$(docker run --name ${name} ${testImage} "python -c 'import sys; print(sys.version_info[0])'")
echo "Using python version: $pythonVersion"
docker rm -f "${name}" || true
docker run --name "${name}" "$testImage" 'pip list --format=freeze > /requirements.txt'
docker cp "${name}":/requirements.txt .
docker rm -f "${name}" || true

$pythonPath -m virtualenv -p python"${pythonVersion}" venv
# install all dependency one by one. If one or more fails, we continue.
while read line; do venv/bin/pip install --disable-pip-version-check "$line" || echo "Could not install dependency $line, proceeding"; done < requirements.txt
venv/bin/pip install autopep8 --disable-pip-version-check
venv/bin/pip install flake8 --disable-pip-version-check
if [ "${pythonVersion}" = "3" ]; then
    venv/bin/pip install -r "$extraReqs" --disable-pip-version-check
fi