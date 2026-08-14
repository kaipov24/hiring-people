#!/usr/bin/env sh
set -eu

archive_path="${1:-}"

if [ -z "$archive_path" ]; then
  printf 'Usage: %s ./backups/mongodb/inclusive-hire-mongodb-YYYYMMDDTHHMMSSZ.archive.gz\n' "$0"
  exit 2
fi

if [ ! -f "$archive_path" ]; then
  printf 'Backup archive not found: %s\n' "$archive_path"
  exit 1
fi

password="$(cat ./secrets/mongodb_password)"

docker compose exec -T mongodb mongorestore \
  --username inclusive_hire \
  --password "$password" \
  --authenticationDatabase admin \
  --nsInclude "inclusive_hire.*" \
  --drop \
  --archive \
  --gzip < "$archive_path"

printf 'MongoDB restore completed from: %s\n' "$archive_path"
