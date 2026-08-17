#!/usr/bin/env sh
set -eu

missing=""
require_tunnel=false

for arg in "$@"; do
  case "$arg" in
    --require-tunnel)
      require_tunnel=true
      ;;
    *)
      printf 'Unknown option: %s\n' "$arg"
      exit 2
      ;;
  esac
done

require_env() {
  name="$1"
  value="$(eval "printf '%s' \"\${$name:-}\"")"
  if [ -z "$value" ]; then
    missing="${missing}
- ${name}"
  fi
}

require_file() {
  path="$1"
  if [ ! -s "$path" ]; then
    missing="${missing}
- ${path}"
  fi
}

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

require_env PUBLIC_SITE_URL
require_env PUBLIC_APP_URL
require_env JWT_EXPIRES_IN
require_env ADMIN_EMAILS
require_env SMTP_HOST
require_env SMTP_PORT
require_env MAIL_FROM
require_file secrets/mongodb_password
require_file secrets/jwt_secret

if [ "$SMTP_HOST" != "mailpit" ]; then
  require_env SMTP_USER
  require_env SMTP_PASS
fi

if [ "${STORAGE_DRIVER:-local}" = "r2" ]; then
  require_env R2_ENDPOINT
  require_env R2_BUCKET
  require_env R2_ACCESS_KEY_ID
  require_env R2_SECRET_ACCESS_KEY
fi

if [ "$require_tunnel" = "true" ]; then
  require_env CLOUDFLARE_TUNNEL_TOKEN
fi

if [ -n "$missing" ]; then
  printf 'Deploy configuration is incomplete. Missing:%s\n' "$missing"
  exit 1
fi

printf 'Deploy configuration looks ready.\n'
