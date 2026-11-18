#!/bin/bash
# Run Vodda and Monafaseh together locally in debug mode.
#
# usage: ./debug.sh [up|up-d|down|logs|build|test|restart|reset]

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"

COMPOSE_FILE="docker-compose.debug.yml"
ENV_FILE=".env.local"

docker_compose_cmd() {
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    else
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    fi
}

print_services() {
    echo ""
    echo "services:"
    echo "  Backend:  http://localhost:3420   (health: /health)"
    echo "  Frontend: http://localhost:3421"
    echo "  MySQL:    localhost:3422"
    echo "  Monafaseh: http://localhost:${MONAFASEH_PORT:-3423}"
    echo "  Bashar:   http://localhost:${BASHAR_PORT:-3424}"
    echo ""
}

case "${1:-up}" in
    up)
        echo "▶ starting Vodda + Monafaseh services in debug mode..."
        docker_compose_cmd up --build
        ;;
    up-d)
        echo "▶ starting Vodda + Monafaseh services in background..."
        docker_compose_cmd up -d --build --wait
        print_services
        echo "logs: ./debug.sh logs"
        ;;
    down)
        echo "▶ stopping services..."
        docker_compose_cmd down
        ;;
    restart)
        echo "▶ restarting services..."
        docker_compose_cmd down
        docker_compose_cmd up -d --build --wait
        print_services
        ;;
    reset)
        echo "▶ resetting Vodda MySQL data (Monafaseh SQLite and uploads are preserved)..."
        docker_compose_cmd down
        rm -rf ./data/mysql
        docker_compose_cmd up -d --build --wait
        print_services
        ;;
    logs)
        docker_compose_cmd logs -f
        ;;
    build)
        echo "▶ building debug images..."
        docker_compose_cmd build --no-cache
        ;;
    test)
        echo "▶ running backend tests..."
        (cd backend && go test ./...)
        echo "▶ running frontend build check..."
        (cd frontend && npm run build)
        ;;
    *)
        echo "Usage: $0 [up|up-d|down|logs|build|test|restart|reset]"
        exit 1
        ;;
esac
