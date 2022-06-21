ARG IMAGENAME

FROM ${IMAGENAME}
 
ADD certs.crt /usr/local/share/ca-certificates/certs.crt
ADD extra-requirements-py3.txt extra-requirements.txt /
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/certs.crt

RUN update-ca-certificates