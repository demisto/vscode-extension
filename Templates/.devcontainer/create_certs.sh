#!/bin/bash
#
# Copyright (C) 2020-2021 Bosch.IO GmbH
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0
# License-Filename: LICENSE


CONNECT_SERVER="github.com:443"

FILE=$1

REGEX_BEGIN="/^-----BEGIN CERTIFICATE-----$/"
REGEX_END="/^-----END CERTIFICATE-----$"


# Strip authentication info as "openssl s_client" cannot handle any.
# Pick a server to connect to that is used during the Gradle build, and which reports the proxy's certificate instead of
# its own.
openssl s_client -showcerts  -connect $CONNECT_SERVER | \
    sed -n "$REGEX_BEGIN,$REGEX_END/p" > "$FILE"

if [ ! -f "$FILE" ]; then
    echo "Failed getting the certificates, no output file was created."
    exit
fi

