#!/bin/bash
# Run the Vodda backend + frontend locally in debug mode.
#
# usage: ./docker-debug.sh [up|up-d|down|logs|build|test|restart|reset]

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
    echo ""
}

case "${1:-up}" in
    up)
        echo "▶ starting Vodda services in debug mode..."
        docker_compose_cmd up --build
        ;;
    up-d)
        echo "▶ starting Vodda services in background..."
        docker_compose_cmd up -d --build
        print_services
        echo "logs: ./docker-debug.sh logs"
        ;;
    down)
        echo "▶ stopping services..."
        docker_compose_cmd down
        ;;
    restart)
        echo "▶ restarting services..."
        docker_compose_cmd down
        docker_compose_cmd up -d --build
        print_services
        ;;
    reset)
        echo "▶ resetting debug containers and volumes..."
        docker_compose_cmd down -v
        rm -rf ./data/mysql
        docker_compose_cmd up -d --build
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
