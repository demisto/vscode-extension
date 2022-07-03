ARG IMAGENAME

FROM ${IMAGENAME}

ADD create_certs.sh /
RUN chmod +x /create_certs.sh \ 
    && /create_certs.sh /usr/local/share/ca-certificates/certs.crt \
    && update-ca-certificates \
    # install mypy only in py3
    && if [ python -c 'import sys; print(sys.version_info[0])' == "3" ]; then \
        pip install extra-requirements-py3.txt; \
    fi

ENV NODE_EXTRA_CA_CERTS /usr/local/share/ca-certificates/certs.crt
