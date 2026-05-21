# PRO-66 — migration 0006 FK type mismatch breaks fresh self-host installs

**Severity:** P1
**File:** `supabase/migrations/0006_replies.sql:25-27`
**Status:** resolved — adopted Option B (defensive DO block). Migration now inspects `information_schema.columns` at apply time and adds `parent_id` as `uuid` on clean installs and `text` on the maintainer's drifted demo; raises explicit exception for any other type. Idempotent (`add column if not exists`); on prod the column already exists as `text` so the matching branch no-ops.

## Problem

`0006_replies.sql` declares:

```sql
alter table public.ccm_widget_annotations
  add column if not exists parent_id text
    references public.ccm_widget_annotations(id) on delete cascade;
```

But baseline migration `0001_init.sql:20` declares:

```sql
id uuid primary key default gen_random_uuid(),
```

PostgreSQL refuses self-referential FKs across incompatible types
(`text` vs `uuid`). A self-hoster running the documented migration sequence
0001 → 0006 against a clean Supabase project will see:

```
ERROR: foreign key constraint "..." cannot be implemented
DETAIL: Key columns "parent_id" and "id" are of incompatible types: text and uuid.
```

The migration's top comment acknowledges that the maintainer's demo project
has `id text` (drift from migrations), and the PR description notes the
divergence was made to match that drifted live state. But **`docs/self-hosting.md:68`
still tells self-hosters to apply `0006` in sequence after `0001`-`0005`**,
which will hard-fail.

## Why this is P1

- The PR explicitly documents self-hosting as a supported path
  (`docs/self-hosting.md` § 2, "Host the backend (Supabase cloud mode)").
- Existing self-hosters and any new self-host install following the docs
  hit a migration error.
- The widget appears to work in localStorage mode but cloud mode is broken
  for anyone whose `id` column is `uuid` (i.e., everyone except the
  maintainer's drifted demo).
- The migration's `add column if not exists` clause means a partial
  failure leaves the column in an inconsistent state on retry.

## Suggested fix

Cast `id` to `text` *or* (cleaner) cast `parent_id` to `uuid` and document
the drift fix separately for the maintainer's demo.

Option A — keep `parent_id uuid` (matches `0001`):

```sql
alter table public.ccm_widget_annotations
  add column if not exists parent_id uuid
    references public.ccm_widget_annotations(id) on delete cascade;
```

Maintainer's demo (which has `id text`) needs a one-off repair migration
ahead of `0006` that re-casts `id` back to `uuid` (or accepts the demo
project is drifted and runs a project-specific repair).

Option B — gate the type on the actual `id` column type using a `DO` block:

```sql
do $$
declare
  id_type text;
begin
  select format_type(atttypid, atttypmod) into id_type
  from pg_attribute
  where attrelid = 'public.ccm_widget_annotations'::regclass
    and attname = 'id';

  execute format(
    'alter table public.ccm_widget_annotations
       add column if not exists parent_id %s
       references public.ccm_widget_annotations(id) on delete cascade',
    id_type
  );
end$$;
```

Option C — drop the FK constraint, rely on app-code cascade (already in
`Store.delete` and `CloudStore.delete`). Lose server-side enforcement but
unblock self-hosters immediately. Worst of the three.

## Rationale

Option A is the cleanest fix for new installs. Option B is the most
defensive (auto-detect the live type) but adds complexity. Option C trades
correctness for availability. Need maintainer input on whether the demo
project's drift is fixable or whether the migration set is permanently
forked.

## Out of scope for safe_auto

Picking a fix requires judgement about whether the maintainer's demo is the
canonical state (in which case `0001` should be amended to `id text` and a
separate repair migration emitted) or the migration set should hold the
line. Leaving this as a todo for a maintainer call.
