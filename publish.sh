#!/bin/bash
set -e

IMAGE="${1:?Usage: ./publish.sh <registry/image>}"
GIT_HASH=$(git rev-parse HEAD)
SHORT_HASH=$(git rev-parse --short HEAD)
APP_NAME="${APP_NAME:-Family Photos}"

docker build \
  --build-arg GIT_HASH="$GIT_HASH" \
  --build-arg APP_NAME="$APP_NAME" \
  -t "${IMAGE}:latest" \
  -t "${IMAGE}:${SHORT_HASH}" \
  .

docker push "${IMAGE}:latest"
docker push "${IMAGE}:${SHORT_HASH}"

echo "Published ${IMAGE}:latest (${SHORT_HASH})"
