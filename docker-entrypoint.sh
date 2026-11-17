#!/bin/sh
set -e

# Started as root: make sure the data volume is writable by the app user, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data
  chown -R node:node /app/data
  export HOME=/home/node
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

# Already running as a non-root user (e.g. `docker run --user ...`): just start.
exec "$@"