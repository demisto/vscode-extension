#!/bin/sh

set -e

dockerImage=$1
name=$2
dirPath=$3
extraReqs=$4
extraReqsPY3=$5

cd "$dirPath"
docker rm -f "${name}" || true
pythonVersion=$(docker run --name "${name}" "${dockerImage}" python -c 'import sys; print(sys.version_info[0])')
docker cp "${name}":/requirements.txt .
docker rm -f "${name}" || true

virtualenv -p python"${pythonVersion}" "${dirPath}"/venv
"${dirPath}"/venv/bin/pip install -r "${dirPath}"/requirements.txt
"${dirPath}"/venv/bin/pip install -r "${extraReqs}"
if [ "${pythonVersion}" = "3" ]; then
    "${dirPath}"/venv/bin/pip install -r "${extraReqsPY3}"
fi