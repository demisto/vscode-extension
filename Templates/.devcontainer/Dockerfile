ARG IMAGENAME
ARG LOCAL_WORKSPACE_PATH

FROM ${IMAGENAME}
 
ADD certs.crt /usr/local/share/ca-certificates/certs.crt
ADD requirements.txt extra-requirements.txt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/certs.crt LOCAL_WORKSPACE_PATH=${LOCAL_WORKSPACE_PATH}

RUN cat extra-requirements.txt | xargs -n 1 pip install --no-cache-dir --disable-pip-version-check && update-ca-certificates