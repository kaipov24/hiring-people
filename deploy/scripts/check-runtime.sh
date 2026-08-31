#!/usr/bin/env sh
set -eu

app_url="${PUBLIC_APP_URL:-http://localhost:8080}"
local_url="${LOCAL_APP_URL:-http://localhost:8080}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  app_url="${PUBLIC_APP_URL:-$app_url}"
fi

printf 'Checking containers...\n'
docker compose ps

retry_curl() {
  url="$1"
  attempts="${2:-12}"
  delay_seconds="${3:-5}"
  attempt=1

  while [ "$attempt" -le "$attempts" ]; do
    if curl --fail --show-error --silent "$url"; then
      return 0
    fi

    printf '\nWaiting for %s (%s/%s)...\n' "$url" "$attempt" "$attempts"
    sleep "$delay_seconds"
    attempt=$((attempt + 1))
  done

  return 1
}

printf '\nChecking local nginx health...\n'
retry_curl "${local_url%/}/health" 12 5
printf '\n'

printf '\nChecking API readiness...\n'
docker compose exec -T api node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/health/ready').then(async (response) => { const body = await response.text(); console.log(body); process.exit(response.ok ? 0 : 1); }).catch((error) => { console.error(error.message); process.exit(1); })"

if [ "${app_url%/}" != "${local_url%/}" ]; then
  printf '\nChecking public app health...\n'
  retry_curl "${app_url%/}/health" 18 5
  printf '\n'

  printf '\nChecking public API readiness...\n'
  retry_curl "${app_url%/}/api/health/ready" 18 5
  printf '\n'
fi
