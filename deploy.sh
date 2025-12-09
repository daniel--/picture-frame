#!/bin/bash
set -e
git pull
sudo docker compose down
GIT_HASH=$(git rev-parse HEAD)
sudo env GIT_HASH="$GIT_HASH" docker compose build
sudo env GIT_HASH="$GIT_HASH" docker compose up -d
# Wait for all containers to be healthy
containers=$(sudo docker compose ps -q)
for cid in $containers; do
  health_status=$(sudo docker inspect --format='{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "none")
  if [ "$health_status" = "none" ]; then
    continue
  fi
  while [ "$health_status" != "healthy" ]; do
    if [ "$health_status" = "unhealthy" ]; then
      echo "Container $cid is unhealthy!"
      exit 1
    fi
    echo "Waiting for container $cid to become healthy (current: $health_status)..."
    sleep 2
    health_status=$(sudo docker inspect --format='{{.State.Health.Status}}' "$cid")
  done
  echo "Container $cid is healthy."
done

echo "Built with git hash: $GIT_HASH"
