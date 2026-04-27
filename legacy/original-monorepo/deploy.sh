#!/bin/bash

# ============================================
# Complete Docker Build and Deploy Script for Vodda
# This single script handles everything:
#   1. Building Docker images on local machine
#   2. Packaging images into a bundle
#   3. Transferring to server
#   4. Deploying on server (load + up only)
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

DEPLOY_CONFIG_FILE="$PROJECT_DIR/deploy.config"

ENV_PRODUCTION="$PROJECT_DIR/.env.production"

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}Error: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        exit 1
    fi

    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"
        exit 1
    fi
}

docker_compose_cmd() {
    if docker compose version &> /dev/null; then
        docker compose "$@"
    else
        docker-compose "$@"
    fi
}

load_deploy_config() {
    if [ ! -f "$DEPLOY_CONFIG_FILE" ]; then
        print_error "deploy.config file not found: $DEPLOY_CONFIG_FILE"
        print_warning "Copy deploy.config.example to deploy.config and fill it."
        exit 1
    fi

    # shellcheck disable=SC1090
    source "$DEPLOY_CONFIG_FILE"

    if [ -z "${SERVER_IP:-}" ] || [ -z "${SERVER_USER:-}" ] || [ -z "${SERVER_PATH:-}" ] || [ -z "${SSH_PASSWORD:-}" ]; then
        print_error "deploy.config is incomplete. Required: SERVER_IP, SERVER_USER, SERVER_PATH, SSH_PASSWORD"
        exit 1
    fi
}

check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        print_warning "sshpass is not installed. Installing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y sshpass
        elif command -v yum &> /dev/null; then
            sudo yum install -y sshpass
        elif command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            print_error "Cannot install sshpass automatically. Please install it manually."
            exit 1
        fi
    fi
}

ssh_cmd() {
    sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$@"
}

scp_cmd_with_progress() {
    local src="$1"
    local dest="$2"

    if command -v rsync &> /dev/null; then
        sshpass -p "$SSH_PASSWORD" rsync -az --progress --info=progress2 \
            -e "ssh -o StrictHostKeyChecking=no" \
            "$src" "$dest"
    else
        sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no "$src" "$dest"
    fi
}

build_images() {
    print_header "Phase 1: Building Docker Images (Production)"

    if [ ! -f "$ENV_PRODUCTION" ]; then
        print_error ".env.production file not found!"
        print_warning "Please create .env.production file with production settings."
        exit 1
    fi

    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml file not found!"
        exit 1
    fi

    if [ ! -f "docker-compose.deploy.yml" ]; then
        print_error "docker-compose.deploy.yml file not found!"
        exit 1
    fi

    check_docker

    print_step "[1/4] Building backend and main images..."
    DOCKER_BUILDKIT=1 docker_compose_cmd -f docker-compose.yml --env-file "$ENV_PRODUCTION" build backend main

    print_step "[2/4] Verifying built images..."
    IMAGES=("vodda-backend:prod" "vodda-main:prod")
    MISSING_IMAGES=()

    for img in "${IMAGES[@]}"; do
        if ! docker image inspect "$img" &> /dev/null; then
            MISSING_IMAGES+=("$img")
        fi
    done

    if [ ${#MISSING_IMAGES[@]} -ne 0 ]; then
        print_error "The following images were not found:"
        for img in "${MISSING_IMAGES[@]}"; do
            echo "  - $img"
        done
        exit 1
    fi

    print_success "All images are present"

    print_step "[3/4] Cleaning old bundles..."
    rm -f vodda-images.tar vodda-docker-bundle.zip

    print_step "[4/4] Saving images to tar file..."
    docker save -o vodda-images.tar vodda-backend:prod vodda-main:prod

    print_success "Images saved"
}

package_bundle() {
    print_header "Phase 2: Creating Bundle Package"

    print_step "Creating zip bundle..."
    zip -q vodda-docker-bundle.zip \
        vodda-images.tar \
        docker-compose.deploy.yml \
        .env.production

    BUNDLE_SIZE=$(du -h vodda-docker-bundle.zip | cut -f1)
    print_success "Bundle created successfully"
    echo -e "Bundle file: ${YELLOW}vodda-docker-bundle.zip${NC}"
    echo -e "File size: ${YELLOW}$BUNDLE_SIZE${NC}"
}

deploy_to_server() {
    print_header "Phase 3: Deploy to Server"

    if [ ! -f "vodda-docker-bundle.zip" ]; then
        print_error "vodda-docker-bundle.zip file not found!"
        print_warning "Build phase may have failed."
        exit 1
    fi

    check_sshpass
    load_deploy_config

    echo -e "${BLUE}Server Configuration:${NC}"
    echo ""

    echo ""
    print_warning "Server information:"
    echo "  IP: $SERVER_IP"
    echo "  User: $SERVER_USER"
    echo "  Path: $SERVER_PATH"
    echo ""

    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 0
    fi

    print_step "[1/2] Transferring bundle to server..."
    scp_cmd_with_progress vodda-docker-bundle.zip "$SERVER_USER@$SERVER_IP:/tmp/"
    print_success "Transfer completed"

    print_step "[2/2] Deploying on server..."

    ssh_cmd "$SERVER_USER@$SERVER_IP" <<__REMOTE__
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\${GREEN}========================================\${NC}"
echo -e "\${GREEN}Deploying Vodda on Server\${NC}"
echo -e "\${GREEN}========================================\${NC}"
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "\${RED}Error: Docker is not installed on server!\${NC}"
    exit 1
fi

echo -e "\${GREEN}[1/6] Preparing directories...\${NC}"
mkdir -p $SERVER_PATH
mkdir -p $SERVER_PATH/data/mysql
chmod -R 777 $SERVER_PATH/data
cd $SERVER_PATH

mv /tmp/vodda-docker-bundle.zip .

rm -f vodda-images.tar docker-compose.deploy.yml .env.production

echo -e "\${GREEN}[2/6] Extracting bundle...\${NC}"
unzip -q -o vodda-docker-bundle.zip

if [ -f ".env" ]; then
    echo -e "\${GREEN}✓ Keeping existing .env (JWT and DB settings preserved)\${NC}"
    rm -f .env.production
else
    if [ -f ".env.production" ]; then
        mv .env.production .env
        echo -e "\${GREEN}✓ Created .env from bundle\${NC}"
    fi
fi

if [ ! -f "vodda-images.tar" ] || [ ! -f "docker-compose.deploy.yml" ] || [ ! -f ".env" ]; then
    echo -e "\${RED}Error: Some required files were not found!\${NC}"
    exit 1
fi

echo -e "\${GREEN}[3/6] Loading Docker images...\${NC}"
docker load -i vodda-images.tar

echo -e "\${GREEN}[4/6] Stopping previous services (if they exist)...\${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.deploy.yml --env-file .env down 2>/dev/null || true
elif docker compose version &> /dev/null 2>&1; then
    docker compose -f docker-compose.deploy.yml --env-file .env down 2>/dev/null || true
fi

echo -e "\${GREEN}[5/6] Starting services...\${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.deploy.yml --env-file .env up -d
elif docker compose version &> /dev/null 2>&1; then
    docker compose -f docker-compose.deploy.yml --env-file .env up -d
else
    echo -e "\${RED}Error: Neither docker-compose nor docker compose is available!\${NC}"
    exit 1
fi

echo -e "\${GREEN}[6/6] Cleaning old images/cache...\${NC}"
docker image prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true

echo ""
echo -e "\${GREEN}✓ Deploy completed successfully!\${NC}"
BACKEND_PORT=\$(grep -E "^BACKEND_PORT=" .env | cut -d'=' -f2 || echo "5566")
MAIN_PORT=\$(grep -E "^MAIN_PORT=" .env | cut -d'=' -f2 || echo "5567")

echo "Backend: http://$SERVER_IP:\$BACKEND_PORT/healthz"
echo "Main:    http://$SERVER_IP:\$MAIN_PORT"
__REMOTE__

    print_header "All Done"
    echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP${NC}"
    echo -e "${YELLOW}cd $SERVER_PATH${NC}"
    echo -e "${YELLOW}docker compose -f docker-compose.deploy.yml ps${NC}"
}

show_menu() {
    print_header "Vodda Docker Build & Deploy"
    echo "Choose an option:"
    echo ""
    echo "  1) Full deploy (build + package + deploy to server)"
    echo "  2) Build only (build + package)"
    echo "  3) Deploy only (transfer existing bundle to server)"
    echo "  4) Exit"
    echo ""
    read -p "Enter your choice [1-4]: " choice
    echo ""

    case $choice in
        1)
            build_images
            package_bundle
            deploy_to_server
            ;;
        2)
            build_images
            package_bundle
            print_success "Build and package completed!"
            ;;
        3)
            deploy_to_server
            ;;
        4)
            exit 0
            ;;
        *)
            print_error "Invalid option!"
            exit 1
            ;;
    esac
}

if [ "$1" == "--build" ] || [ "$1" == "-b" ]; then
    build_images
    package_bundle
elif [ "$1" == "--deploy" ] || [ "$1" == "-d" ]; then
    deploy_to_server
elif [ "$1" == "--full" ] || [ "$1" == "-f" ]; then
    build_images
    package_bundle
    deploy_to_server
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -b, --build    Build and package only"
    echo "  -d, --deploy   Deploy existing bundle to server"
    echo "  -f, --full     Full deploy (build + package + deploy)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Required for deploy/full:"
    echo "  - deploy.config (SERVER_IP, SERVER_USER, SERVER_PATH, SSH_PASSWORD)"
    exit 0
else
    show_menu
fi
