#!/usr/bin/env sh
set -eu

app_url="${PUBLIC_APP_URL:-http://localhost:8080}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  app_url="${PUBLIC_APP_URL:-$app_url}"
fi

printf 'Checking containers...\n'
docker compose ps

printf '\nChecking nginx health...\n'
curl --fail --show-error --silent "${app_url%/}/health"
printf '\n'

printf '\nChecking API readiness...\n'
docker compose exec -T api node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/health/ready').then(async (response) => { const body = await response.text(); console.log(body); process.exit(response.ok ? 0 : 1); }).catch((error) => { console.error(error.message); process.exit(1); })"
