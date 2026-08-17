#!/usr/bin/env sh
set -eu

backup_dir="${BACKUP_DIR:-./backups/mongodb}"
keep_days="${BACKUP_KEEP_DAYS:-7}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_path="${backup_dir}/inclusive-hire-mongodb-${timestamp}.archive.gz"
r2_prefix="${BACKUP_R2_PREFIX:-backups/mongodb}"

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

if [ "${BACKUP_STORAGE_DRIVER:-local}" = "r2" ]; then
  : "${R2_ENDPOINT:?R2_ENDPOINT is required when BACKUP_STORAGE_DRIVER=r2}"
  : "${R2_BUCKET:?R2_BUCKET is required when BACKUP_STORAGE_DRIVER=r2}"
  : "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required when BACKUP_STORAGE_DRIVER=r2}"
  : "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required when BACKUP_STORAGE_DRIVER=r2}"

  backup_abs_dir="$(cd "$backup_dir" && pwd)"
  archive_name="$(basename "$archive_path")"
  object_key="${r2_prefix%/}/${archive_name}"

  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION="${R2_REGION:-auto}" \
    -v "${backup_abs_dir}:/backup:ro" \
    amazon/aws-cli:2 \
    --endpoint-url "$R2_ENDPOINT" \
    s3 cp "/backup/${archive_name}" "s3://${R2_BUCKET}/${object_key}"

  printf 'MongoDB backup uploaded to R2: s3://%s/%s\n' "$R2_BUCKET" "$object_key"
fi
