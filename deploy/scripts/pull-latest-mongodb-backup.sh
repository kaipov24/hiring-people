#!/usr/bin/env sh
set -eu

backup_dir="${BACKUP_DIR:-./backups/mongodb}"
r2_prefix="${BACKUP_R2_PREFIX:-backups/mongodb}"
output_path="${1:-${backup_dir}/latest.archive.gz}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${R2_ENDPOINT:?R2_ENDPOINT is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"

mkdir -p "$backup_dir"
output_name="$(basename "$output_path")"
output_dir="$(dirname "$output_path")"
mkdir -p "$output_dir"
output_abs_dir="$(cd "$output_dir" && pwd)"

latest_key="$(
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION="${R2_REGION:-auto}" \
    public.ecr.aws/aws-cli/aws-cli:latest \
    --endpoint-url "$R2_ENDPOINT" \
    s3api list-objects-v2 \
    --bucket "$R2_BUCKET" \
    --prefix "${r2_prefix%/}/" \
    --query 'reverse(sort_by(Contents || `[]`, &LastModified))[0].Key' \
    --output text
)"

if [ -z "$latest_key" ] || [ "$latest_key" = "None" ]; then
  printf 'No MongoDB backups found in R2 prefix: s3://%s/%s/\n' "$R2_BUCKET" "${r2_prefix%/}"
  exit 1
fi

docker run --rm \
  -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  -e AWS_DEFAULT_REGION="${R2_REGION:-auto}" \
  -v "${output_abs_dir}:/backup" \
  public.ecr.aws/aws-cli/aws-cli:latest \
  --endpoint-url "$R2_ENDPOINT" \
  s3 cp "s3://${R2_BUCKET}/${latest_key}" "/backup/${output_name}"

printf 'Downloaded latest MongoDB backup: %s\n' "$output_path"
printf 'Source: s3://%s/%s\n' "$R2_BUCKET" "$latest_key"
