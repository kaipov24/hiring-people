#!/usr/bin/env sh
set -eu

backup_dir="${BACKUP_DIR:-./backups/mongodb}"
keep_days="${BACKUP_KEEP_DAYS:-7}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_path="${backup_dir}/inclusive-hire-mongodb-${timestamp}.archive.gz"

mkdir -p "$backup_dir"

password="$(cat ./secrets/mongodb_password)"

docker compose exec -T mongodb mongodump \
  --username inclusive_hire \
  --password "$password" \
  --authenticationDatabase admin \
  --db inclusive_hire \
  --archive \
  --gzip > "$archive_path"

find "$backup_dir" \
  -type f \
  -name "inclusive-hire-mongodb-*.archive.gz" \
  -mtime +"$keep_days" \
  -delete

printf 'MongoDB backup saved: %s\n' "$archive_path"
