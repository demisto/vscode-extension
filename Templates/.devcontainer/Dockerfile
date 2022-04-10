ARG IMAGENAME

FROM ${IMAGENAME}
 
RUN pip install pytest pytest-mock requests-mock mypy flake8 autopep8 freezegun --no-cache-dir --disable-pip-version-check
ADD certs.crt /usr/local/share/ca-certificates/certs.crt 
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/certs.crt


RUN update-ca-certificates