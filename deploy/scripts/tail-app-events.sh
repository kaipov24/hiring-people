#!/bin/sh
set -eu

tail_lines="${TAIL:-200}"
follow="${FOLLOW:-true}"
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$script_dir"

while [ "$repo_root" != "/" ] && [ ! -f "$repo_root/compose.yaml" ]; do
  repo_root="$(dirname "$repo_root")"
done

if [ ! -f "$repo_root/compose.yaml" ]; then
  echo "Could not find compose.yaml. Run this from inside the inclusive-hire repo." >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage: ./deploy/scripts/tail-app-events.sh [--tail N] [--no-follow]

Shows important inclusive-hire API events:
  - registration created / failed / verification resent
  - login success / failed
  - resume uploaded
  - candidate profile saved
  - account saved

Environment:
  TAIL=500      Number of previous lines to show first.
  FOLLOW=false Do not keep streaming logs.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --tail)
      tail_lines="${2:?--tail requires a number}"
      shift 2
      ;;
    --no-follow)
      follow="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

cd "$repo_root"

compose_files="-f compose.yaml"
if [ -f compose.homelab.yaml ]; then
  compose_files="$compose_files -f compose.homelab.yaml"
fi

logs_args="--tail=$tail_lines"
if [ "$follow" = "true" ]; then
  logs_args="$logs_args -f"
fi

pattern='(\[audit\]|Failed to send verification email|Failed to send password reset email|request POST /api/auth/(register|login)|request PATCH /api/auth/me|request PUT /api/candidates/me|request POST /api/candidates/me/cv)'

# shellcheck disable=SC2086
docker compose $compose_files ps api >/dev/null

# shellcheck disable=SC2086
set +e
docker compose $compose_files logs $logs_args api \
  | awk -v pattern="$pattern" -v follow="$follow" -v tail_lines="$tail_lines" '
      $0 ~ pattern {
        print
        fflush()
        found = 1
      }
      END {
        if (!found && follow != "true") {
          print "No matching app events found in the last " tail_lines " API log lines."
        }
      }
    '
status="$?"
set -e

exit "$status"
