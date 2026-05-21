# PRO-66 — `docs/replies.md` spec body still shows `parent_id uuid`

**Severity:** P3
**File:** `docs/replies.md:134`, `docs/plans/PRO-66-comment-replies.md:151`
**Status:** open

## Observation

The spec body and plan body both still show:

```sql
alter table public.ccm_widget_annotations
  add column if not exists parent_id uuid
    references public.ccm_widget_annotations(id) on delete cascade;
```

But the actual migration (`supabase/migrations/0006_replies.sql:26`) ships
`parent_id text`. The migration file's top comment documents the deviation;
the spec body does not. The override preamble at `docs/replies.md:7-11`
covers the `0005 → 0006` rename but not the `uuid → text` change.

## Suggested fix

Either:
- Update the spec/plan code block to match the live migration (`text`)
  and add a one-paragraph note in the historical-context preamble, OR
- Add a "Migration deviations" subsection at the top of `docs/replies.md`
  listing both the file rename AND the column type, with a pointer to the
  migration file's top comment for the rationale.

## Rationale

Future readers of the spec will copy-paste the `uuid` block and hit the
same FK type-mismatch error that prompted the `text` switch. Documenting
the deviation in the spec body prevents that confusion.

## Coupled to migration-fk-type-mismatch.md

If the maintainer chooses Option A in that todo (revert to `parent_id
uuid`), this drift resolves itself. If Option B/C wins, this needs the
explicit doc patch.
