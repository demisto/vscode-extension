#!/bin/bash

set -e

dockerImage=$1
name=$2
dirPath=$3
extraReqs=$4
pythonPath=$5

cd "$dirPath"
testImage=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep devtest"$dockerImage" | head -1)
echo "Using test image env: $testImage"
docker rm -f "${name}" || true
pythonVersion=$(docker run --name ${name} ${testImage} "python -c 'import sys; print(sys.version_info[0])'")
echo "Using python version: $pythonVersion"
docker rm -f "${name}" || true
docker run --name "${name}" "$testImage" 'pip list --format=freeze > /requirements.txt'
docker cp "${name}":/requirements.txt .
docker rm -f "${name}" || true
source "${pythonPath}"/activate || true

python -m virtualenv -p python"${pythonVersion}" "${dirPath}"/venv
cat requirements.txt | xargs -n 1 "${dirPath}"/venv/bin/pip install --disable-pip-version-check
"${dirPath}"/venv/bin/pip install autopep8 --disable-pip-version-check
if [ "${pythonVersion}" = "3" ]; then
    "${dirPath}"/venv/bin/pip install -r "$extraReqs" --disable-pip-version-check
fi