#/bin/bash
set -e
git pull
docker compose down
GIT_HASH=$(git rev-parse HEAD) docker compose build
GIT_HASH=$(git rev-parse HEAD) docker compose up -d
git rev-parse HEAD
