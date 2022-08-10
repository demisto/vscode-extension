ARG IMAGENAME

FROM ${IMAGENAME}

ADD create_certs.sh /
ADD extra-requirements-py3.txt /
RUN chmod +x /create_certs.sh \ 
    && /create_certs.sh /usr/local/share/ca-certificates/certs.crt \
    && update-ca-certificates \
    && apk update || apt-get update -y || echo "Could not update package mangaer" \
    && apk add bash || echo "No alpine, no need to install bash" \
    && apk add git || apt-get install git -y || echo "Could not install git" \
    && apk add build-base || apt-get install build-essential -y || echo "Could not install build-essential" \
    # check if pip command exists
    && if [ -x "$(command -v pip)" ]; then \
    pip install autopep8; \
    if [ $(python -c 'import sys; print(sys.version_info[0])') == "3" ]; then \
        pip install -r /extra-requirements-py3.txt; \
    fi \
    fi

ENV NODE_EXTRA_CA_CERTS /usr/local/share/ca-certificates/certs.crt
