#!/bin/bash
# Build Vodda production images locally and deploy them to a remote server
# over SSH (password-based), loading the image bundle and starting compose.
#
# usage: ./docker-deploy.sh [deploy|build|server]

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

DEPLOY_CONFIG_FILE="$PROJECT_DIR/deploy.json"
ENV_PRODUCTION="$PROJECT_DIR/.env.production"
BUNDLE_FILE="$PROJECT_DIR/vodda-docker-bundle.tar.gz"

print_header() { echo ""; echo -e "${BLUE}========================================${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}========================================${NC}"; echo ""; }
print_step()    { echo -e "${GREEN}$1${NC}"; }
print_error()   { echo -e "${RED}Error: $1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }

check_docker() {
    command -v docker &> /dev/null || { print_error "Docker is not installed!"; exit 1; }
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"; exit 1
    fi
}

docker_compose_cmd() {
    if docker compose version &> /dev/null; then docker compose "$@"; else docker-compose "$@"; fi
}

get_deploy_platform() {
    local platform
    platform=$(awk -F= '/^DOCKER_PLATFORM=/{gsub(/[[:space:]\042\r]/, "", $2); print $2; exit}' "$ENV_PRODUCTION" 2>/dev/null)
    [ -n "$platform" ] && echo "$platform" || echo "linux/amd64"
}

image_platform() {
    docker image inspect --format '{{.Os}}/{{.Architecture}}{{if .Variant}}/{{.Variant}}{{end}}' "$1" 2>/dev/null || true
}

json_get() {
    local key="$1"
    node -e '
const fs=require("fs");const file=process.argv[1];const key=process.argv[2];
let d;try{d=JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){console.error(e.message);process.exit(2);}
const v=d[key];if(v===undefined||v===null||String(v).trim()===""){process.exit(3);}
process.stdout.write(String(v));' "$DEPLOY_CONFIG_FILE" "$key"
}

load_deploy_config() {
    [ -f "$DEPLOY_CONFIG_FILE" ] || { print_error "deploy.json not found!"; print_warning "Create it from deploy.example.json."; exit 1; }
    command -v node &> /dev/null || { print_error "Node.js is required to read deploy.json."; exit 1; }
    SERVER_IP=$(json_get "ip")            || { print_error "deploy.json must include ip."; exit 1; }
    SERVER_USER=$(json_get "username")     || { print_error "deploy.json must include username."; exit 1; }
    SERVER_PATH=$(json_get "path")         || { print_error "deploy.json must include path."; exit 1; }
    SSH_PASSWORD=$(json_get "password")    || { print_error "deploy.json must include password."; exit 1; }
}

check_sshpass() { command -v sshpass &> /dev/null || { print_error "sshpass is required for password-based SSH deploys."; exit 1; }; }
ssh_cmd() { sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$@"; }

scp_cmd_with_progress() {
    local src="$1" dest="$2"
    if command -v rsync &> /dev/null; then
        sshpass -p "$SSH_PASSWORD" rsync -az --partial --progress --info=progress2 \
            -e "ssh -o StrictHostKeyChecking=no" "$src" "$dest"
    else
        sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no "$src" "$dest"
    fi
}

build_images() {
    print_header "Phase 1: Building production images"
    [ -f "$ENV_PRODUCTION" ] || { print_error ".env.production not found!"; exit 1; }
    check_docker

    local deploy_platform; deploy_platform=$(get_deploy_platform)

    print_step "[1/3] Pulling base images for $deploy_platform if needed..."
    BASE_IMAGES=("golang:1.24-bullseye" "alpine:3.21" "node:24-alpine3.21" "mysql:8.0")
    for img in "${BASE_IMAGES[@]}"; do
        if [ "$(image_platform "$img")" = "$deploy_platform" ]; then echo "  ✓ $img"; else docker pull --platform "$deploy_platform" "$img"; fi
    done

    print_step "[2/3] Building backend and frontend..."
    DOCKER_BUILDKIT=1 docker_compose_cmd -f docker-compose.yml --env-file "$ENV_PRODUCTION" build backend frontend

    print_step "[3/3] Saving images..."
    docker save --platform "$deploy_platform" vodda-backend:prod vodda-frontend:prod mysql:8.0 | gzip > "$BUNDLE_FILE"
}

deploy_to_server() {
    print_header "Phase 2: Deploying to server"
    load_deploy_config
    check_sshpass

    print_step "[1/5] Preparing server path..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH'"

    print_step "[2/5] Uploading compose file and env..."
    sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no \
        docker-compose.deploy.yml .env.production \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

    print_step "[3/5] Uploading image bundle..."
    scp_cmd_with_progress "$BUNDLE_FILE" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/vodda-docker-bundle.tar.gz.uploading"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && mv -f vodda-docker-bundle.tar.gz.uploading vodda-docker-bundle.tar.gz"

    print_step "[4/5] Loading images..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker load < vodda-docker-bundle.tar.gz"

    print_step "[5/5] Starting services..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker image inspect vodda-backend:prod vodda-frontend:prod mysql:8.0 >/dev/null && docker compose -f docker-compose.deploy.yml --env-file .env.production up -d --pull never"

    echo ""
    echo -e "${GREEN}✓ Deploy finished${NC}"
    echo "Backend:  http://$SERVER_IP:3420"
    echo "Frontend: http://$SERVER_IP:3421"
}

case "${1:-deploy}" in
    build)  build_images ;;
    deploy) build_images; deploy_to_server ;;
    server) deploy_to_server ;;
    *) echo "Usage: $0 [deploy|build|server]"; exit 1 ;;
esac
