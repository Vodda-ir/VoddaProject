#!/bin/bash
# Run Docker test/debug environment (with caching)
# Usage: ./docker-debug.sh [up|down|build|up-build|logs]

set -e
cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.debug.yml"

# Enable BuildKit for layer caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

case "${1:-up}" in
  up)
    echo ">>> Starting test environment (using cached images)..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo ""
    echo ">>> Test environment is running."
    echo "    MySQL:    localhost:3306 (user: vodda, pass: vodda, db: vodda)"
    echo "    Backend: http://localhost:5566"
    echo "    Main:    http://localhost:3000"
    echo ""
    echo ">>> Use '$0 logs' to follow logs."
    echo ">>> Use '$0 up-build' to rebuild images from scratch."
    ;;
  up-build)
    echo ">>> Building and starting test environment..."
    docker compose -f "$COMPOSE_FILE" up --build -d
    echo ""
    echo ">>> Test environment is running. (images rebuilt with cache)"
    echo "    MySQL: localhost:3306 | Backend: http://localhost:5566 | Main: http://localhost:3000"
    ;;
  down)
    echo ">>> Stopping test environment..."
    docker compose -f "$COMPOSE_FILE" down
    echo ">>> Done."
    ;;
  build)
    echo ">>> Building images (with cache)..."
    docker compose -f "$COMPOSE_FILE" build
    echo ">>> Done. Run '$0 up' to start."
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  *)
    echo "Usage: $0 {up|down|build|up-build|logs}"
    echo "  up        - Start using cached images (fast, default)"
    echo "  up-build  - Rebuild images and start"
    echo "  down      - Stop and remove containers"
    echo "  build     - Build images only (with cache)"
    echo "  logs      - Follow logs"
    exit 1
    ;;
esac
