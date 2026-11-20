#!/usr/bin/env bash
# server-build-deploy.sh — ساخت و استقرار ودا روی خودِ سرور (بدون نیاز به docker لوکال)
#
# اجرا روی سرور (معمولاً از طریق deploy.sh prod صدا زده می‌شود):
#   REPO_GIT_URL='https://token@github.com/Vodda-ir/VoddaProject.git' \
#     bash server-build-deploy.sh --ref=<sha|branch> [--services=all|frontend|backend] [--inject-failure]
#
# چرخهٔ هر دیپلوی:
#   ۱) همگام‌سازی سورس روی ref مشخص  ۲) تگ‌گذاری ایمیج فعلی برای rollback
#   ۳) docker build با تگ :<sha> و :prod  ۴) compose up  ۵) health check
#   ۶) در صورت شکست → rollback خودکار به ایمیج قبلی → health مجدد
#
# خروجی ماشین‌خوان (خط آخر): DEPLOY_OK | ROLLED_BACK | DEPLOY_FAILED
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo -e "${GREEN}▶ $*${NC}"; }
info() { echo -e "${BLUE}  $*${NC}"; }
warn() { echo -e "${YELLOW}  ! $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; }

BASE_DIR="${VODDA_BASE_DIR:-/www/wwwroot/vodda}"
REPO_DIR="${VODDA_REPO_DIR:-$BASE_DIR/build-src}"
COMPOSE_FILE="$BASE_DIR/docker-compose.deploy.yml"
ENV_FILE="$BASE_DIR/.env.production"
LOG_FILE="$BASE_DIR/deploy-log.csv"
FE_PORT="${FRONTEND_PORT:-3421}"
BE_PORT="${BACKEND_PORT:-3420}"

REF="" ; SERVICES="all" ; INJECT_FAILURE=0
for arg in "$@"; do
  case "$arg" in
    --ref=*)          REF="${arg#--ref=}" ;;
    --services=*)     SERVICES="${arg#--services=}" ;;
    --inject-failure) INJECT_FAILURE=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done
[ -n "$REF" ] || { fail "--ref=<sha|branch> is required"; exit 2; }
[ -f "$COMPOSE_FILE" ] || { fail "compose file not found: $COMPOSE_FILE"; exit 2; }
[ -f "$ENV_FILE" ] || { fail "env file not found: $ENV_FILE"; exit 2; }

T0=$(date +%s)
log_result() {  # log_result <result>
  [ -f "$LOG_FILE" ] || echo "time,sha,services,result,elapsed_sec" > "$LOG_FILE"
  echo "$(date +%Y-%m-%dT%H:%M:%S%z),$SHORT_SHA,$SERVICES,$1,$(( $(date +%s) - T0 ))" >> "$LOG_FILE"
}

# ── ۱) همگام‌سازی سورس روی ref ──────────────────────────────
step "[1/6] Syncing source at $REF"
mkdir -p "$REPO_DIR"
if [ ! -d "$REPO_DIR/.git" ]; then
  url="${REPO_GIT_URL:-https://github.com/Vodda-ir/VoddaProject.git}"
  warn "no git repo at $REPO_DIR — cloning"
  tmp="$REPO_DIR.tmp.$$"
  git clone --filter=blob:none "$url" "$tmp" || { fail "clone failed"; echo "DEPLOY_FAILED"; exit 1; }
  rm -rf "$REPO_DIR" && mv "$tmp" "$REPO_DIR"
fi
git -C "$REPO_DIR" fetch --all --prune --quiet || { fail "git fetch failed"; echo "DEPLOY_FAILED"; exit 1; }
git -C "$REPO_DIR" checkout --force --quiet "$REF" || { fail "checkout $REF failed"; echo "DEPLOY_FAILED"; exit 1; }
git -C "$REPO_DIR" clean -fdq frontend backend
SHORT_SHA="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
info "commit $SHORT_SHA — $(git -C "$REPO_DIR" log -1 --format='%s' | head -c 90)"

# ── ۲) تگ‌گذاری ایمیج فعلی برای rollback ────────────────────
step "[2/6] Tagging current images for rollback"
if [ "$INJECT_FAILURE" = "1" ]; then
  info "(--inject-failure) rollback-last از آخرین دیپلوی واقعی حفظ می‌شود"
else
  for svc in frontend backend; do
    if docker image inspect "vodda-$svc:prod" >/dev/null 2>&1; then
      docker tag "vodda-$svc:prod" "vodda-$svc:rollback-last" && info "vodda-$svc:prod → vodda-$svc:rollback-last"
    else
      warn "vodda-$svc:prod not found yet (first deploy?)"
    fi
  done
fi

# ── گارد دیسک: build روی ۱۷GB فضا نمرهد ─────────────────────
# (۱.۸.۳.۲) اصلاح گارد ۱.۸.۳.۱: prune --allِ همیشگی کش را کامل می‌زد و build سرد
# از سقف رانر عبور می‌کرد (run دوم cancelled شد). اکنون پاک‌سازی لایه‌ای:
#   همیشه: تگ‌های قدیمی :<sha> + ایمیج معلق + باندل تار قدیمی  (کش فعال حفظ می‌شود
#   تا build سریع بماند)  —  در صورت کمبود، ارتقا به builder prune --all تا سقف سخت
step "[2.5/6] Disk guard — stale sha tags + dangling prune (active cache kept for fast build)"
before_mb=$(df -Pm / | awk 'NR==2{print $4}')
docker image prune -f >/dev/null 2>&1 || true
# rmi بدون ‎-f‎: اگر تگ دیگری (مثل :prod/:rollback-last) روی همان ایمیج باشد فقط
# همان تگ برداشته می‌شود و اگر کانتینری در حال استفاده باشد خطا می‌دهد و رد می‌شود — ایمن
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' \
             | grep -E '^vodda-(frontend|backend|monafaseh|monafaseh-migrator|bashar|bashar-migrator):[0-9a-f]{7,40}$' || true); do
  docker rmi "$img" >/dev/null 2>&1 || true
done
rm -f "$BASE_DIR/vodda-docker-bundle.tar.gz" "$BASE_DIR/vodda-docker-bundle.tar.gz.uploading" >/dev/null 2>&1 || true
free_mb=$(df -Pm / | awk 'NR==2{print $4}')
if [ "$free_mb" -lt 2048 ]; then
  warn "disk low after light prune (${free_mb}MB) — escalating to full build-cache prune (cold build, slower)"
  docker builder prune --all -f >/dev/null 2>&1 || true
  free_mb=$(df -Pm / | awk 'NR==2{print $4}')
fi
if [ "$free_mb" -lt 2048 ]; then
  fail "not enough disk for build even after full prune (${free_mb}MB < 2048MB). Free space manually first."
  echo "DEPLOY_FAILED"; exit 1
fi
info "disk free: ${before_mb}MB → ${free_mb}MB after prune"

# ── ۳) build ────────────────────────────────────────────────
build_one() {
  local name="$1" dir="$2" t0 t1
  t0=$(date +%s)
  DOCKER_BUILDKIT=1 docker build -q -t "vodda-$name:$SHORT_SHA" -t "vodda-$name:prod" \
    -f "$REPO_DIR/$dir/Dockerfile" "$REPO_DIR/$dir" >/dev/null || return 1
  t1=$(date +%s)
  info "built vodda-$name:$SHORT_SHA in $((t1 - t0))s"
}
step "[3/6] Building images (services=$SERVICES, sha=$SHORT_SHA)"
case "$SERVICES" in
  all)      build_one backend backend && build_one frontend frontend || { fail "build failed"; echo "DEPLOY_FAILED"; log_result failed; exit 1; } ;;
  frontend) build_one frontend frontend || { fail "build failed"; echo "DEPLOY_FAILED"; log_result failed; exit 1; } ;;
  backend)  build_one backend  backend  || { fail "build failed"; echo "DEPLOY_FAILED"; log_result failed; exit 1; } ;;
  *) fail "bad --services=$SERVICES"; exit 2 ;;
esac

# ── ۴) compose up ───────────────────────────────────────────
compose_up() {
  (cd "$BASE_DIR" && docker compose -f docker-compose.deploy.yml --env-file .env.production \
    up -d --pull never --wait backend frontend)
}

# ── health helpers (سازگار با ایمیج‌های قدیمی‌تر) ─────────────
fe_health() {
  curl -fsS -m 5 "http://127.0.0.1:$FE_PORT/health" 2>/dev/null | grep -q '"status":"ok"' && return 0
  curl -fsS -m 5 -o /dev/null "http://127.0.0.1:$FE_PORT/" 2>/dev/null   # fallback ایمیج قدیمی
}
be_health() {
  local r
  r=$(curl -fsS -m 5 "http://127.0.0.1:$BE_PORT/health" 2>/dev/null) || return 1
  echo "$r" | grep -q '"status":"ok"' || return 1
  if echo "$r" | grep -q '"db":'; then
    echo "$r" | grep -Eq '"db":"(ok|unknown)"' || return 1
  fi
  return 0
}
wait_health() {  # wait_health <attempts>
  local n="$1" i
  for i in $(seq 1 "$n"); do
    if be_health && fe_health; then info "health ✓ (attempt $i)"; return 0; fi
    sleep 8
  done
  return 1
}

# do_rollback باید پیش از اولین فراخوان تعریف شود — در نسخهٔ قبلی بعد از
# «compose up» تعریف شده بود و در همان مسیر خطا «command not found» می‌داد
# یعنی رول‌بک خودکار عملاً هرگز اجرا نمی‌شد.
do_rollback() {
  fail "deployment failed → AUTO-ROLLBACK to previous image"
  local failed=0 svc
  for svc in frontend backend; do
    if docker image inspect "vodda-$svc:rollback-last" >/dev/null 2>&1; then
      docker tag "vodda-$svc:rollback-last" "vodda-$svc:prod" && info "vodda-$svc:rollback-last → vodda-$svc:prod" || failed=1
    fi
  done
  compose_up || failed=1
  return "$failed"
}

step "[4/6] Restarting containers (backend + frontend)"
compose_up || { fail "compose up failed"; do_rollback; exit 1; }

# ── ۵) health check با rollback خودکار ──────────────────────
step "[5/6] Health check (auto-rollback armed)"
if [ "$INJECT_FAILURE" = "1" ]; then
  info "(--inject-failure) simulating broken deploy → firing auto-rollback"
  if do_rollback && wait_health 10; then
    step "✓ rollback healthy — pipeline rollback path verified"
    echo "ROLLED_BACK"; log_result rolledback; exit 0
  fi
  fail "rollback itself failed — manual intervention needed"; echo "DEPLOY_FAILED"; log_result failed; exit 1
fi
if wait_health 10; then
  step "✓ containers healthy — deploy committed (sha=$SHORT_SHA)"
else
  if do_rollback && wait_health 10; then
    warn "deploy rolled back automatically; previous image is serving"
    echo "ROLLED_BACK"; log_result rolledback; exit 0
  fi
  fail "deploy AND rollback both failed — manual intervention needed"
  echo "DEPLOY_FAILED"; log_result failed; exit 1
fi

# ── ۶) تأیید عمومی + لاگ ────────────────────────────────────
step "[6/6] Public health verification"
for i in 1 2 3 4 5; do
  if curl -fsS -m 20 "https://api.vodda.ir/health" 2>/dev/null | grep -q '"status":"ok"' \
     && curl -fsS -m 20 -o /dev/null "https://vodda.ir/health" 2>/dev/null; then
    info "https://vodda.ir/health ✓  https://api.vodda.ir/health ✓"
    break
  fi
  [ "$i" = "5" ] && warn "public check through CDN not green yet (CDN cache?) — local health is ok"
  sleep 4
done
# ── پاک‌سازی پس از دیپلوی موفق (۱.۸.۳.۲) ────────────────────
# فقط کش dangling + ایمیج معلق + تگ‌های قدیمی :<sha> — کش فعال حفظ می‌شود تا
# build بعدی سریع بماند؛ در صورت کمبود دیسک، گارد ۲.۵/۶ دیپلوی بعدی ارتقا می‌دهد
step "[6.5/6] Cleaning stale sha tags and dangling cache to keep server disk healthy"
docker builder prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' \
             | grep -E '^vodda-(frontend|backend|monafaseh|monafaseh-migrator|bashar|bashar-migrator):[0-9a-f]{7,40}$' || true); do
  docker rmi "$img" >/dev/null 2>&1 || true
done

log_result ok
step "✓ DONE in $(( $(date +%s) - T0 ))s — vodda-frontend/backend:$SHORT_SHA"
echo "DEPLOY_OK"
