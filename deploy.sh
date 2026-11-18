#!/bin/bash
# Build Vodda production images locally and deploy them to a remote server
# over SSH (password-based), loading the image bundle and starting compose.
#
# usage: ./deploy.sh [deploy|build|server|setup|domains|proxy|bashar]
#   bashar — فقط خبرگزاری بشر را build و deploy می‌کند (بدون rebuild ودا)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

DEPLOY_CONFIG_FILE="$PROJECT_DIR/deploy.json"
ENV_PRODUCTION="$PROJECT_DIR/.env.production"
BUNDLE_FILE="$PROJECT_DIR/vodda-docker-bundle.tar.gz"
SSH_OPTIONS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -o TCPKeepAlive=yes -o IPQoS=throughput)

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
    if command -v node &> /dev/null; then
        node -e '
const fs=require("fs");const file=process.argv[1];const key=process.argv[2];
let d;try{d=JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){console.error(e.message);process.exit(2);}
const v=key.split(".").reduce((value,part)=>value?.[part],d);if(v===undefined||v===null||String(v).trim()===""){process.exit(3);}
process.stdout.write(String(v));' "$DEPLOY_CONFIG_FILE" "$key"
    else
        python3 - "$DEPLOY_CONFIG_FILE" "$key" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
value = data
for part in sys.argv[2].split("."):
    if not isinstance(value, dict) or part not in value:
        sys.exit(3)
    value = value[part]
if value is None or str(value).strip() == "":
    sys.exit(3)
sys.stdout.write(str(value))
PY
    fi
}

validate_domain() {
    [[ "$1" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]] || {
        print_error "Invalid domain in deploy.json: $1"; exit 1;
    }
}

render_domain_proxy() {
    local output_file="$1"
    if command -v node &> /dev/null; then
        node - "$PROJECT_DIR/ops/nginx/vodda.conf.template" "$DOMAIN_SITE" "$DOMAIN_APP" "$DOMAIN_API" "$DOMAIN_MONAFASEH" "$BASHAR_HOST" > "$output_file" <<'NODE'
const fs = require('fs');
const [templateFile, site, app, api, monafaseh, bashar] = process.argv.slice(2);
let template = fs.readFileSync(templateFile, 'utf8');
const values = {
  __SITE_DOMAIN__: site,
  __APP_DOMAIN__: app,
  __API_DOMAIN__: api,
  __MONAFASEH_DOMAIN__: monafaseh,
  __BASHAR_HOST__: bashar,
};
for (const [placeholder, value] of Object.entries(values)) {
  if (!template.includes(placeholder)) throw new Error(`Missing ${placeholder} in proxy template`);
  template = template.replaceAll(placeholder, value);
}
process.stdout.write(template);
NODE
    else
        python3 - "$PROJECT_DIR/ops/nginx/vodda.conf.template" "$DOMAIN_SITE" "$DOMAIN_APP" "$DOMAIN_API" "$DOMAIN_MONAFASEH" "$BASHAR_HOST" > "$output_file" <<'PY'
import sys
template_file, site, app, api, monafaseh, bashar = sys.argv[1:7]
with open(template_file, encoding="utf-8") as f:
    template = f.read()
for placeholder, value in {
    "__SITE_DOMAIN__": site,
    "__APP_DOMAIN__": app,
    "__API_DOMAIN__": api,
    "__MONAFASEH_DOMAIN__": monafaseh,
    "__BASHAR_HOST__": bashar,
}.items():
    if placeholder not in template:
        raise SystemExit("Missing %s in proxy template" % placeholder)
    template = template.replace(placeholder, value)
sys.stdout.write(template)
PY
    fi
}

load_deploy_config() {
    [ -f "$DEPLOY_CONFIG_FILE" ] || { print_error "deploy.json not found!"; print_warning "Create it from deploy.example.json."; exit 1; }
    command -v node &> /dev/null || command -v python3 &> /dev/null || { print_error "Node.js or Python 3 is required to read deploy.json."; exit 1; }
    SERVER_IP=$(json_get "ip")            || { print_error "deploy.json must include ip."; exit 1; }
    SERVER_USER=$(json_get "username")     || { print_error "deploy.json must include username."; exit 1; }
    SERVER_PATH=$(json_get "path")         || { print_error "deploy.json must include path."; exit 1; }
    SSH_PASSWORD=$(json_get "password")    || { print_error "deploy.json must include password."; exit 1; }
    DOMAIN_SITE=$(json_get "domains.site") || { print_error "deploy.json must include domains.site."; exit 1; }
    DOMAIN_APP=$(json_get "domains.app") || { print_error "deploy.json must include domains.app."; exit 1; }
    DOMAIN_API=$(json_get "domains.api") || { print_error "deploy.json must include domains.api."; exit 1; }
    DOMAIN_MONAFASEH=$(json_get "domains.monafaseh") || { print_error "deploy.json must include domains.monafaseh."; exit 1; }
    # خبرگزاری بشر: بدون دامنه — روی IP خود سرور سرو می‌شود.
    # اگر بعداً دامنه خواستید، کلید domains.bashar را در deploy.json اضافه کنید.
    BASHAR_HOST=$(json_get "domains.bashar" 2>/dev/null) || BASHAR_HOST="$SERVER_IP"
    validate_domain "$DOMAIN_SITE"
    validate_domain "$DOMAIN_APP"
    validate_domain "$DOMAIN_API"
    validate_domain "$DOMAIN_MONAFASEH"
}

check_sshpass() { command -v sshpass &> /dev/null || { print_error "sshpass is required for password-based SSH deploys."; exit 1; }; }
ssh_cmd() { SSHPASS="$SSH_PASSWORD" sshpass -e ssh "${SSH_OPTIONS[@]}" "$@"; }

scp_cmd_with_progress() {
    local src="$1" dest="$2"
    if command -v rsync &> /dev/null; then
        SSHPASS="$SSH_PASSWORD" sshpass -e rsync -a --partial --append-verify --progress --info=progress2 --timeout=600 \
            -e "ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -o TCPKeepAlive=yes -o IPQoS=throughput" "$src" "$dest"
    else
        SSHPASS="$SSH_PASSWORD" sshpass -e scp "${SSH_OPTIONS[@]}" "$src" "$dest"
    fi
}

setup_server() {
    print_header "Preparing Ubuntu server"
    load_deploy_config
    check_sshpass

    print_step "Installing Docker Engine and Compose from Ubuntu packages..."
    local ubuntu_mirror="${UBUNTU_APT_MIRROR:-http://ir.archive.ubuntu.com/ubuntu/}"
    [[ "$ubuntu_mirror" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/ubuntu/?$ ]] || {
        print_error "UBUNTU_APT_MIRROR must be an Ubuntu archive URL ending in /ubuntu/."; exit 1;
    }

    ssh_cmd "$SERVER_USER@$SERVER_IP" "UBUNTU_APT_MIRROR='$ubuntu_mirror' bash -s" <<'REMOTE'
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
    echo "Server setup requires root; connect as root or use a root SSH account." >&2
    exit 1
fi
. /etc/os-release
if [ "${ID:-}" != ubuntu ] || [ "${VERSION_ID:-}" != 26.04 ]; then
    echo "Expected Ubuntu 26.04; found ${PRETTY_NAME:-unknown}." >&2
    exit 1
fi
if [ "$(dpkg --print-architecture)" != amd64 ]; then
    echo "Expected an amd64 server to match DOCKER_PLATFORM=linux/amd64." >&2
    exit 1
fi

backup_dir=/root/vodda-bootstrap/apt-sources
mkdir -p "$backup_dir"
for source_file in /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list /etc/apt/sources.list; do
    [ -f "$source_file" ] || continue
    if grep -qE 'https?://archive\.ubuntu\.com/ubuntu/?' "$source_file"; then
        backup="$backup_dir/$(basename "$source_file")"
        [ -e "$backup" ] || cp -a "$source_file" "$backup"
        sed -E -i "s|https?://archive\.ubuntu\.com/ubuntu/?|$UBUNTU_APT_MIRROR|g" "$source_file"
    fi
done

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates docker.io docker-compose-v2 docker-buildx
systemctl enable --now docker
docker --version
docker compose version
systemctl is-active --quiet docker
echo "Docker service is active."
REMOTE
}

# بارگذاری سایت استاتیک جدید (وب نسخه ۲) روی ریشه nginx سرور
upload_web_root() {
    print_step "Uploading vodda v2 static web (web/ → /var/www/vodda-web) ..."
    [ -d "$PROJECT_DIR/web" ] || { print_error "web/ directory not found. Run: git pull"; exit 1; }
    tar -C "$PROJECT_DIR/web" -czf - . | ssh_cmd "$SERVER_USER@$SERVER_IP" \
        "rm -rf /var/www/vodda-web && mkdir -p /var/www/vodda-web && tar -xzf - -C /var/www/vodda-web && chmod -R a+rX /var/www/vodda-web && test -f /var/www/vodda-web/index.html"
}

# استقرار فقط سایت استاتیک جدید — بدون rebuild داکر (سریع‌ترین مسیر)
deploy_web_only() {
    print_header "Deploying vodda v2 static web (fast path)"
    load_deploy_config
    check_sshpass
    upload_web_root
    configure_domain_proxy
    verify_public_domains

    echo ""
    echo -e "${GREEN}✓ Web deploy finished${NC}"
    print_domain_endpoints
}

configure_domain_proxy() {
    print_step "Configuring Nginx domain routing..."
    local proxy_config
    proxy_config=$(mktemp)
    render_domain_proxy "$proxy_config"
    SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
        "$proxy_config" "$SERVER_USER@$SERVER_IP:/tmp/vodda-nginx.conf"
    rm -f "$proxy_config"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "set -euo pipefail; apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y nginx curl; install -m 0644 /tmp/vodda-nginx.conf /etc/nginx/sites-available/vodda.conf; ln -sfn /etc/nginx/sites-available/vodda.conf /etc/nginx/sites-enabled/vodda.conf; rm -f /etc/nginx/sites-enabled/default; if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then ufw allow 80/tcp; fi; nginx -t; systemctl enable --now nginx; systemctl reload nginx; test \$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN_SITE' http://127.0.0.1/) = 200; test \$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN_APP' http://127.0.0.1/) = 200; test \$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN_API' http://127.0.0.1/ready) = 200; test \$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN_MONAFASEH' http://127.0.0.1/api/health) = 200; test \$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -H 'Host: $BASHAR_HOST' http://127.0.0.1/) = 200; rm -f /tmp/vodda-nginx.conf"
}

verify_public_domains() {
    print_step "Verifying public HTTPS domains through Arvan..."
    command -v curl &> /dev/null || { print_error "curl is required for public domain checks."; exit 1; }
    local check label url attempt
    local -a public_checks=(
        "Vodda site|https://$DOMAIN_SITE/"
        "Universal App|https://$DOMAIN_APP/"
        "Vodda API|https://$DOMAIN_API/ready"
        "Monafaseh|https://$DOMAIN_MONAFASEH/api/health"
        "Bashar|http://$BASHAR_HOST/"
    )
    for check in "${public_checks[@]}"; do
        label="${check%%|*}"
        url="${check#*|}"
        for attempt in 1 2 3 4; do
            if curl -fsSL --max-redirs 5 --max-time 20 -o /dev/null "$url"; then
                print_step "  ✓ $label"
                break
            fi
            if [ "$attempt" -eq 4 ]; then
                print_error "Public HTTPS check failed for $label ($url). Confirm Arvan SSL and HTTP:80 origin settings."; exit 1
            fi
            sleep 2
        done
    done
}

print_domain_endpoints() {
    echo "Site:              https://$DOMAIN_SITE"
    echo "Universal App:     https://$DOMAIN_APP"
    echo "Backend API:       https://$DOMAIN_API/api/v1"
    echo "Monafaseh:         https://$DOMAIN_MONAFASEH"
    echo "Bashar:            http://$BASHAR_HOST"
}

build_images() {
    print_header "Phase 1: Building production images"
    [ -f "$ENV_PRODUCTION" ] || { print_error ".env.production not found!"; exit 1; }
    check_docker

    local deploy_platform; deploy_platform=$(get_deploy_platform)

    print_step "[1/3] Pulling base images for $deploy_platform if needed..."
    BASE_IMAGES=("golang:1.25-bookworm" "alpine:3.21" "node:24-alpine3.21")
    for img in "${BASE_IMAGES[@]}"; do
        if [ "$(image_platform "$img")" = "$deploy_platform" ]; then echo "  ✓ $img"; else docker pull --platform "$deploy_platform" "$img"; fi
    done

    print_step "[2/3] Building backend and frontend..."
    DOCKER_BUILDKIT=1 docker_compose_cmd -f docker-compose.yml --env-file "$ENV_PRODUCTION" build backend frontend

    print_step "[3/3] Saving images..."
    docker save --platform "$deploy_platform" vodda-backend:prod vodda-frontend:prod | gzip > "$BUNDLE_FILE"
}

deploy_to_server() {
    print_header "Phase 2: Deploying to server"
    load_deploy_config
    check_sshpass

    print_step "[1/7] Preparing server path..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH'"

    print_step "[2/7] Uploading compose file and env..."
    SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
        docker-compose.deploy.yml .env.production \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "chmod 600 '$SERVER_PATH/.env.production'"

    print_step "[3/7] Verifying app image bundle..."
    local local_bundle_sha remote_bundle_sha
    local_bundle_sha=$(sha256sum "$BUNDLE_FILE" | awk '{print $1}')
    remote_bundle_sha=$(ssh_cmd "$SERVER_USER@$SERVER_IP" "sha256sum '$SERVER_PATH/vodda-docker-bundle.tar.gz' 2>/dev/null | cut -d ' ' -f1" || true)
    if [ "$remote_bundle_sha" = "$local_bundle_sha" ]; then
        echo "  ✓ Matching bundle is already on the server; skipping upload."
    else
        print_step "  Uploading bundle with resumable rsync..."
        scp_cmd_with_progress "$BUNDLE_FILE" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/vodda-docker-bundle.tar.gz.uploading"
        ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && echo '$local_bundle_sha  vodda-docker-bundle.tar.gz.uploading' | sha256sum -c - >/dev/null && mv -f vodda-docker-bundle.tar.gz.uploading vodda-docker-bundle.tar.gz"
    fi

    print_step "[4/7] Loading backend and frontend images..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker load < vodda-docker-bundle.tar.gz && docker image inspect vodda-backend:prod vodda-frontend:prod >/dev/null"

    print_step "[5/7] Preparing MySQL and Node base images on the server..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "docker image inspect mysql:8.0 >/dev/null 2>&1 || { docker pull --platform linux/amd64 mirror.gcr.io/library/mysql:8.0 && docker tag mirror.gcr.io/library/mysql:8.0 mysql:8.0 || docker pull --platform linux/amd64 mysql:8.0; }; docker image inspect node:22-alpine >/dev/null 2>&1 || { docker pull --platform linux/amd64 mirror.gcr.io/library/node:22-alpine && docker tag mirror.gcr.io/library/node:22-alpine node:22-alpine || docker pull --platform linux/amd64 node:22-alpine; }"

    print_step "[6/7] Building Monafaseh runtime and one-shot migrator on the server..."
    tar -C "$PROJECT_DIR/monafaseh" \
        --exclude='node_modules' --exclude='.next' --exclude='out' --exclude='.git' \
        --exclude='.env' --exclude='.env.*' --exclude='db/*' --exclude='public/uploads/*' \
        -czf - . | ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH/monafaseh' && tar -xzf - -C '$SERVER_PATH/monafaseh'"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target runner --tag vodda-monafaseh:prod --file monafaseh/Dockerfile monafaseh && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target migrator --tag vodda-monafaseh-migrator:prod --file monafaseh/Dockerfile monafaseh"

    print_step "[6b/7] Building Bashar news agency runtime and one-shot migrator on the server..."
    upload_bashar_source
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target runner --tag vodda-bashar:prod --file bashar/Dockerfile bashar && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target migrator --tag vodda-bashar-migrator:prod --file bashar/Dockerfile bashar"

    print_step "[6c/7] Fixing uploads volume ownership (backend runs as uid 10001)..."
    # کانتینر بک‌اند با کاربر 10001 اجرا می‌شود؛ اگر پوشهٔ data/uploads روی هاست
    # توسط docker با مالکیت root ساخته شده باشد، آپلود آواتار/نمونه‌صوتی با
    # Permission Denied و خطای 500 شکست می‌خورد. این گام مالکیت را همیشه تضمین می‌کند.
    ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH/data/uploads' && chown -R 10001:10001 '$SERVER_PATH/data/uploads' && chmod -R u+rwX '$SERVER_PATH/data/uploads'"

    print_step "[7/7] Starting services..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker image inspect vodda-backend:prod vodda-frontend:prod vodda-monafaseh:prod vodda-monafaseh-migrator:prod vodda-bashar:prod mysql:8.0 >/dev/null && legacy_running=\$(docker inspect -f '{{.State.Running}}' monafaseh 2>/dev/null || true) && (docker stop monafaseh >/dev/null 2>&1 || true) && docker volume create monafaseh_monafaseh-db >/dev/null && if ! docker run --rm --user 0:0 --volume monafaseh_monafaseh-db:/app/db -e DATABASE_URL=file:/app/db/custom.db --entrypoint /bin/sh vodda-monafaseh-migrator:prod -c 'node ./node_modules/prisma/build/index.js db push --accept-data-loss && chown -R 1001:1001 /app/db'; then if [ \"\$legacy_running\" = true ]; then docker start monafaseh >/dev/null; fi; exit 1; fi && docker volume create bashar_bashar-db >/dev/null && if ! docker run --rm --user 0:0 --volume bashar_bashar-db:/app/db -e DATABASE_URL=file:/app/db/custom.db --entrypoint /bin/sh vodda-bashar-migrator:prod -c 'node ./node_modules/prisma/build/index.js db push --accept-data-loss && chown -R 1001:1001 /app/db'; then if [ \"\$legacy_running\" = true ]; then docker start monafaseh >/dev/null; fi; exit 1; fi && if docker compose -f docker-compose.deploy.yml --env-file .env.production up -d --pull never --wait; then docker rm monafaseh >/dev/null 2>&1 || true; docker image rm vodda-monafaseh-migrator:prod >/dev/null 2>&1 || true; docker image rm vodda-bashar-migrator:prod >/dev/null 2>&1 || true; else if [ \"\$legacy_running\" = true ]; then docker start monafaseh >/dev/null; fi; exit 1; fi"

    print_step "[7b/8] Uploading vodda v2 static web..."
    upload_web_root

    print_step "[8/8] Configuring Nginx domain routing..."
    configure_domain_proxy
    verify_public_domains

    echo ""
    echo -e "${GREEN}✓ Deploy finished${NC}"
    print_domain_endpoints
}

upload_bashar_source() {
    tar -C "$PROJECT_DIR/bashar" \
        --exclude='node_modules' --exclude='.next' --exclude='out' --exclude='.git' \
        --exclude='.env' --exclude='.env.*' --exclude='db/*' --exclude='public/uploads/*' \
        --exclude='android' --exclude='apk' --exclude='scripts' --exclude='docs' \
        -czf - . | ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH/bashar' && tar -xzf - -C '$SERVER_PATH/bashar'"
}

# استقرار فقط خبرگزاری بشر — بدون rebuild بک‌اند/فرانت ودا
deploy_bashar_only() {
    print_header "Deploying Bashar news agency only"
    load_deploy_config
    check_sshpass

    print_step "[1/5] Uploading compose file and env..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH'"
    SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
        docker-compose.deploy.yml .env.production \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "chmod 600 '$SERVER_PATH/.env.production'"

    print_step "[2/5] Uploading Bashar source..."
    upload_bashar_source

    print_step "[3/5] Building Bashar runtime and one-shot migrator on the server..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target runner --tag vodda-bashar:prod --file bashar/Dockerfile bashar && DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --target migrator --tag vodda-bashar-migrator:prod --file bashar/Dockerfile bashar"

    print_step "[4/5] Migrating Bashar database schema (SQLite volume)..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker volume create bashar_bashar-db >/dev/null && docker run --rm --user 0:0 --volume bashar_bashar-db:/app/db -e DATABASE_URL=file:/app/db/custom.db --entrypoint /bin/sh vodda-bashar-migrator:prod -c 'node ./node_modules/prisma/build/index.js db push --accept-data-loss && chown -R 1001:1001 /app/db' && { docker image rm vodda-bashar-migrator:prod >/dev/null 2>&1 || true; }"

    print_step "[5/5] Starting Bashar service..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker image inspect vodda-bashar:prod >/dev/null && docker compose -f docker-compose.deploy.yml --env-file .env.production up -d --no-deps --pull never --wait bashar"

    print_step "Publishing latest Android APK for direct download..."
    local apk_file
    apk_file=$(ls -t "$PROJECT_DIR/bashar/apk/"BasijNews*.apk 2>/dev/null | head -n 1)
    if [ -n "${apk_file:-}" ]; then
        ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p /var/www/bashar-download"
        SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
            "$apk_file" "$SERVER_USER@$SERVER_IP:/var/www/bashar-download/BasijNews.apk"
        ssh_cmd "$SERVER_USER@$SERVER_IP" "cp -f /var/www/bashar-download/BasijNews.apk '/var/www/bashar-download/$(basename "$apk_file")'"
        echo "  ✓ http://$BASHAR_HOST/download/BasijNews.apk"
    else
        print_warning "  No BasijNews*.apk found in bashar/apk — APK download not updated."
    fi

    configure_domain_proxy

    print_step "Verifying public Bashar endpoint..."
    command -v curl &> /dev/null || { print_error "curl is required for public checks."; exit 1; }
    local attempt
    for attempt in 1 2 3 4; do
        if curl -fsSL --max-redirs 5 --max-time 20 -o /dev/null "http://$BASHAR_HOST/"; then
            print_step "  ✓ Bashar"
            break
        fi
        if [ "$attempt" -eq 4 ]; then
            print_error "Public HTTP check failed for Bashar (http://$BASHAR_HOST/)."; exit 1
        fi
        sleep 2
    done

    echo ""
    echo -e "${GREEN}✓ Bashar deployed${NC}"
    print_domain_endpoints

    # پاک‌سازی کش بیلد — دیسک سرور کوچک است؛ کش هر دپلوی چند گیگ فضا می‌گیرد
    print_step "Cleaning build cache to keep server disk healthy..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "docker builder prune --all -f >/dev/null 2>&1 || true"
}

deploy_domains_only() {
    print_header "Deploying domain and API configuration without database migration"
    load_deploy_config
    check_sshpass
    build_images

    print_step "Preparing server path and uploading runtime configuration..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "mkdir -p '$SERVER_PATH'"
    SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
        docker-compose.deploy.yml .env.production \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"
    ssh_cmd "$SERVER_USER@$SERVER_IP" "chmod 600 '$SERVER_PATH/.env.production'"

    print_step "Verifying app image bundle..."
    local local_bundle_sha remote_bundle_sha
    local_bundle_sha=$(sha256sum "$BUNDLE_FILE" | awk '{print $1}')
    remote_bundle_sha=$(ssh_cmd "$SERVER_USER@$SERVER_IP" "sha256sum '$SERVER_PATH/vodda-docker-bundle.tar.gz' 2>/dev/null | cut -d ' ' -f1" || true)
    if [ "$remote_bundle_sha" = "$local_bundle_sha" ]; then
        echo "  ✓ Matching bundle is already on the server; skipping upload."
    else
        scp_cmd_with_progress "$BUNDLE_FILE" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/vodda-docker-bundle.tar.gz.uploading"
        ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && echo '$local_bundle_sha  vodda-docker-bundle.tar.gz.uploading' | sha256sum -c - >/dev/null && mv -f vodda-docker-bundle.tar.gz.uploading vodda-docker-bundle.tar.gz"
    fi

    print_step "Loading Backend/Frontend images and restarting app services..."
    ssh_cmd "$SERVER_USER@$SERVER_IP" "cd '$SERVER_PATH' && docker load < vodda-docker-bundle.tar.gz && docker image inspect vodda-backend:prod vodda-frontend:prod >/dev/null && docker compose -f docker-compose.deploy.yml --env-file .env.production up -d --no-deps --pull never --wait backend frontend monafaseh"

    configure_domain_proxy
    verify_public_domains
    echo ""
    echo -e "${GREEN}✓ Domain configuration deployed; database volumes and schema were not migrated${NC}"
    print_domain_endpoints
}

deploy_proxy_only() {
    print_header "Applying Nginx domain routing"
    load_deploy_config
    check_sshpass
    configure_domain_proxy
    verify_public_domains
    print_domain_endpoints
}

# ══════════════════════════════════════════════════════════════
# 🚀 دیپلوی سریع (۰.۷.۰) — تست سریع → build روی سرور → health → rollback خودکار
# ══════════════════════════════════════════════════════════════

run_quick_tests() {
    # تست سریع: lint + tsc فرانت‌اند، vet + go test -short بک‌اند
    if [[ "${SKIP_TESTS:-0}" = "1" ]]; then
        print_warning "Skipping quick tests (--skip-tests)"
        return 0
    fi
    print_header "Phase 0: Quick tests (tsc + lint + go test -short)"
    if [ -d "$PROJECT_DIR/frontend" ] && command -v node &> /dev/null; then
        [ -d "$PROJECT_DIR/frontend/node_modules" ] || \
            (cd "$PROJECT_DIR/frontend" && npm ci --no-audit --no-fund) || { print_error "npm ci failed"; exit 1; }
        (cd "$PROJECT_DIR/frontend" && npm run lint) || { print_error "frontend lint failed"; exit 1; }
        if [ -f "$PROJECT_DIR/frontend/tsconfig.json" ]; then
            (cd "$PROJECT_DIR/frontend" && npx --no-install tsc --noEmit) || { print_error "frontend tsc failed"; exit 1; }
        fi
        print_step "  ✓ frontend: lint + tsc"
    else
        print_warning "  node/frontend missing — frontend tests skipped"
    fi
    if [ -d "$PROJECT_DIR/backend" ] && command -v go &> /dev/null; then
        (cd "$PROJECT_DIR/backend" && go vet ./...) || { print_error "backend go vet failed"; exit 1; }
        (cd "$PROJECT_DIR/backend" && go test ./... -short -count=1) || { print_error "backend tests failed"; exit 1; }
        print_step "  ✓ backend: vet + test -short"
    else
        print_warning "  go/backend missing — backend tests skipped"
    fi
}

verify_public_health() {
    print_header "Phase 2: Public health verification (rule 9.f)"
    command -v curl &> /dev/null || { print_error "curl is required for health checks."; exit 1; }
    local attempt ok=0
    for attempt in 1 2 3 4 5; do
        if curl -fsS -m 20 "https://$DOMAIN_API/health" 2>/dev/null | grep -q '"status":"ok"' \
           && curl -fsS -m 20 -o /dev/null "https://$DOMAIN_SITE/health"; then
            ok=1; break
        fi
        sleep 5
    done
    [ "$ok" = "1" ] || { print_error "Public health check failed (https://$DOMAIN_SITE/health or https://$DOMAIN_API/health)."; exit 1; }
    print_step "  ✓ https://$DOMAIN_SITE/health"
    print_step "  ✓ https://$DOMAIN_API/health"
}

# استفاده: ./deploy.sh prod [--ref=<sha>] [--services=all|frontend|backend] [--skip-tests]
# یا معادل دستی:      ./deploy.sh --target=production
deploy_prod() {
    print_header "Quick production deploy — server-side build"
    local ref="" services="all" a
    for a in "$@"; do
        case "$a" in
            --ref=*)      ref="${a#--ref=}" ;;
            --services=*) services="${a#--services=}" ;;
            --skip-tests) SKIP_TESTS=1 ;;
            *) print_warning "ignored arg: $a" ;;
        esac
    done
    [ -n "$ref" ] || ref="$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || echo main)"
    load_deploy_config
    check_sshpass
    REPO_GIT_URL="$(json_get "repo.gitUrl" 2>/dev/null)" || REPO_GIT_URL="${REPO_GIT_URL:-}"

    run_quick_tests

    print_header "Phase 1: Server-side build & deploy (ref=$ref)"
    [ -f "$PROJECT_DIR/ops/deploy/server-build-deploy.sh" ] || { print_error "ops/deploy/server-build-deploy.sh not found — run git pull."; exit 1; }
    SSHPASS="$SSH_PASSWORD" sshpass -e scp -o StrictHostKeyChecking=accept-new \
        "$PROJECT_DIR/ops/deploy/server-build-deploy.sh" \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/server-build-deploy.sh"
    ssh_cmd "$SERVER_USER@$SERVER_IP" \
        "cd '$SERVER_PATH' && REPO_GIT_URL='$REPO_GIT_URL' bash server-build-deploy.sh --ref='$ref' --services='$services'"

    verify_public_health
    echo ""
    echo -e "${GREEN}✓ Quick deploy finished — production is on $ref${NC}"
    print_domain_endpoints
}

case "${1:-deploy}" in
    build)  build_images ;;
    deploy) setup_server; build_images; deploy_to_server ;;
    server) setup_server; deploy_to_server ;;
    setup)  setup_server ;;
    web)    deploy_web_only ;;
    domains) deploy_domains_only ;;
    proxy) deploy_proxy_only ;;
    bashar) deploy_bashar_only ;;
    prod|--target=production) shift || true; deploy_prod "$@" ;;
    *) echo "Usage: $0 [deploy|build|server|setup|web|domains|proxy|bashar|prod]  (prod = quick deploy; also: --target=production)"; exit 1 ;;
esac
