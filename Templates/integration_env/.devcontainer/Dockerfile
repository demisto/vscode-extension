ARG IMAGENAME

FROM ${IMAGENAME}

ADD create_certs.sh .
RUN chmod +x /create_certs.sh \ 
    && /create_certs.sh /usr/local/share/ca-certificates/certs.crt \
    || apk add openssl \ || apt-get insatll openssl || /create_certs.sh /usr/local/share/ca-certificates/certs.crt \
    && update-ca-certificates

ENV NODE_EXTRA_CA_CERTS /usr/local/share/ca-certificates/certs.crt
