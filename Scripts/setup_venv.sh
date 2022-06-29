#!/bin/bash

set -e

dockerImage=$1
name=$2
dirPath=$3
extraReqs=$4

cd "$dirPath"
testImage=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep devtest"$dockerImage")
echo "Using test image env: $testImage"
docker rm -f "${name}" || true
pythonVersion=$(docker run --name ${name} ${testImage} "python -c 'import sys; print(sys.version_info[0])'")
echo "Using python version: $pythonVersion"
docker rm -f "${name}" || true
docker run --name "${name}" "$testImage" 'pip freeze > /requirements.txt'
docker cp "${name}":/requirements.txt .
docker rm -f "${name}" || true

# check if virutalenv command exists
if ! [ -x "$(command -v virutalenv)" ]; then
    echo 'virtualenv is not installed. Sourcing the poetry'
    source "$(poetry env info -p)"/bin/activate
fi

virtualenv -p python"${pythonVersion}" "${dirPath}"/venv --clear
"${dirPath}"/venv/bin/pip install -r "${dirPath}"/requirements.txt
if [ "${pythonVersion}" = "3" ]; then
    "${dirPath}"/venv/bin/pip install -r "$extraReqs"
fi