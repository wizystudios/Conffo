#!/usr/bin/env bash
# Runs the delete-account edge-function tests locally with the service-role key.
# The key is read from stdin with echo disabled, exported only for this process,
# and never written to disk or printed to logs.
set -euo pipefail

if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Using SUPABASE_SERVICE_ROLE_KEY from existing environment."
else
  # -s = silent (no echo), -r = raw, prompt to stderr so it never enters stdout pipes.
  printf "Paste Supabase service-role key (input hidden): " 1>&2
  read -rs SUPABASE_SERVICE_ROLE_KEY
  printf "\n" 1>&2
  if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "No key entered, aborting." 1>&2
    exit 1
  fi
  export SUPABASE_SERVICE_ROLE_KEY
fi

# Scrub from history files just in case.
unset HISTFILE 2>/dev/null || true

# Strip any chance of the key appearing in xtrace / error output.
set +x

cd "$(dirname "$0")/.."

# Run only the delete-account tests. --no-prompt avoids interactive perms requests.
deno test \
  --allow-net --allow-env --allow-read \
  supabase/functions/delete-account/index_test.ts \
  2>&1 | sed -E "s/${SUPABASE_SERVICE_ROLE_KEY}/[REDACTED]/g"

# Clear from this shell's env so a follow-up command can't read it.
unset SUPABASE_SERVICE_ROLE_KEY
