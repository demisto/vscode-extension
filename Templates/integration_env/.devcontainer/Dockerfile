ARG IMAGENAME

FROM ${IMAGENAME}

ADD create_certs.sh /
ADD extra-requirements-py3.txt /
RUN chmod +x /create_certs.sh \ 
    && /create_certs.sh /usr/local/share/ca-certificates/certs.crt \
    && update-ca-certificates \
    # check if pip command exists
    && if [ -x "$(command -v pip)" ]; then \
    pip install autopep8; \
    if [ $(python -c 'import sys; print(sys.version_info[0])') == "3" ]; then \
        pip install -r /extra-requirements-py3.txt; \
    fi \
    fi

ENV NODE_EXTRA_CA_CERTS /usr/local/share/ca-certificates/certs.crt
