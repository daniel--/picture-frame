#/bin/bash
set -e
git pull
sudo docker compose down
GIT_HASH=$(git rev-parse HEAD) sudo docker compose build
GIT_HASH=$(git rev-parse HEAD) sudo docker compose up -d
git rev-parse HEAD
