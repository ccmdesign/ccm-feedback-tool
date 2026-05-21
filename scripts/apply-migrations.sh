#!/usr/bin/env bash
# Apply ccm-feedback Supabase migrations to a project via psql.
#
# Usage:
#   scripts/apply-migrations.sh "<DB_CONNECTION_STRING>"
#
# Where DB_CONNECTION_STRING looks like:
#   postgresql://postgres:<password>@db.YOURREF.supabase.co:5432/postgres
#
# Find it in the Supabase dashboard:
#   Project Settings → Database → Connection string → URI
#
# Requires: psql (libpq).
#
# This applies, in order:
#   supabase/migrations/0001_init.sql
#   supabase/migrations/0002_status_pin_area.sql
#   supabase/migrations/0003_realtime.sql
#   supabase/migrations/0004_status_review.sql
#   supabase/migrations/0005_repair_rls.sql
#   supabase/migrations/0006_replies.sql
#   supabase/migrations/0007_sequence_number.sql
#   supabase/migrations/0008_sequence_unique.sql
#   supabase/migrations/0009_sequence_hwm.sql
#
# All migrations are idempotent (CREATE TABLE IF NOT EXISTS, etc.) — re-running
# is safe. Optional hardening migrations live in supabase/migrations-optional/
# and are NOT applied by this script.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <DB_CONNECTION_STRING>" >&2
  echo "" >&2
  echo "Find the connection string at:" >&2
  echo "  Supabase dashboard → Project Settings → Database → Connection string → URI" >&2
  exit 1
fi

CONN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations dir not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found on PATH. Install with: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

echo "Applying migrations from $MIGRATIONS_DIR"
echo

for migration in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$migration")"
  echo "→ $name"
  psql "$CONN" -v ON_ERROR_STOP=1 -f "$migration"
  echo
done

echo "All migrations applied. Verify with:"
echo "  psql \"\$CONN\" -f $REPO_ROOT/supabase/scripts/check-rls.sql"
