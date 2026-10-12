#!/usr/bin/env bash
set -euo pipefail
# Only called on an ephemeral GitHub-hosted runner. Never targets a developer DB.
docker run --detach --name resqph-ci-mongo --publish 27017:27017 mongo:8.0 --replSet rs-ci --bind_ip_all
for attempt in {1..60}; do
  if docker exec resqph-ci-mongo mongosh --quiet --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec resqph-ci-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs-ci",members:[{_id:0,host:"localhost:27017"}]})'
for attempt in {1..60}; do
  if docker exec resqph-ci-mongo mongosh --quiet --eval 'if (!db.hello().isWritablePrimary) quit(1)' >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
echo 'Disposable CI replica set did not become writable' >&2
exit 1
