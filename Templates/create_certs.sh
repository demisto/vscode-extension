#!/bin/bash

# We connect to a random server and not paloaltonetworks.com to get external certificates. 
CONNECT_SERVER="github.com:443"

FILE=$1

REGEX_BEGIN="/^-----BEGIN CERTIFICATE-----$/"
REGEX_END="/^-----END CERTIFICATE-----$"

# Parse the certificate to a file
openssl s_client -showcerts  -connect $CONNECT_SERVER | \
    sed -n "$REGEX_BEGIN,$REGEX_END/p" > "$FILE"

if [ ! -f "$FILE" ]; then
    echo "Failed getting the certificates, no output file was created."
    exit
fi

