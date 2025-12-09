#!/bin/bash
set -e
git pull
sudo docker compose down
GIT_HASH=$(git rev-parse HEAD)
sudo env GIT_HASH="$GIT_HASH" docker compose build
sudo env GIT_HASH="$GIT_HASH" docker compose up -d
echo "Built with git hash: $GIT_HASH"
