---
name: postgres
description: >-
  Postgres and Supabase rules for schema, migrations, RLS, indexes, queries, locking and diagnosis. Use
  before writing or changing anything that lives in a Postgres database (tables, columns, migrations,
  RLS policies, indexes, functions, triggers, queues) and when a query is slow, a lock blocks, a
  connection pool runs out, or rows show up for the wrong user.
---

# Postgres

Rules in rough order of impact. Each is short; the SQL shows the wrong and the right form. For anything
destructive, the data-safety rule wins: back up first and ask the user (see "Migrations").

## Security

**Enable RLS on every table in an exposed schema.** With Supabase, the anon and authenticated keys are
public; a table without RLS is readable by anyone who has the URL.

```sql
alter table orders enable row level security;
create policy orders_owner on orders for select using ((select auth.uid()) = user_id);
```

Write separate policies per command (`select`, `insert`, `update`, `delete`), and give `update` both
`using` and `with check`. Test a policy as the role that will use it, not as the service role.

**Make RLS cheap.** Wrap auth functions in a sub-select so they run once per query, not once per row,
and index every column a policy filters on.

```sql
-- wrong: auth.uid() runs for every row
using (auth.uid() = user_id)
-- right
using ((select auth.uid()) = user_id)
create index orders_user_id_idx on orders (user_id);
```

For membership checks, use a `security definer` function with `set search_path = ''` and call it
inside a sub-select: `using ((select is_team_member(team_id)))`.

**Secrets and service role.** Tables holding secrets are read only server-side with the service role;
grant nothing on them to `anon` or `authenticated`. Apply least privilege: application roles get the
commands they need on the tables they need, never ownership.

## Schema

**Primary keys:** `bigint generated always as identity` for internal tables; UUID (v7 when available,
for index locality) when IDs are exposed or generated client-side. Avoid random UUIDv4 on very large,
insert-heavy tables.

**Types:** `text` (not `varchar(n)` unless the limit is a business rule), `timestamptz` (never
`timestamp` for real moments), `numeric(p,s)` for money (never `float`), `boolean`, `jsonb` (not
`json`), `bigint` for counts that can grow. Use a `check` constraint or an enum for closed sets.

**Index every foreign key column.** Postgres does not do it for you; without it, joins and cascading
deletes scan the child table.

```sql
create index order_items_order_id_idx on order_items (order_id);
```

**Lowercase snake_case identifiers.** Quoted mixed-case names (`"CustomerId"`) must be quoted forever
and break tools. When an existing schema already uses quoted names, stay consistent with it rather than
mixing styles.

**Partition** only very large append-mostly tables (tens of millions of rows, time-based retention),
by range on the time column.

## Migrations

- **Non-destructive by default.** Add columns and tables; do not drop or rename in the same step.
  Keep old columns side by side until the new path is proven, then remove them in a later migration.
- **Before anything destructive** (`drop`, `truncate`, a `delete` or `update` without a tight
  `where`, a type change that rewrites data): back up the affected rows
  (`create table <name>_backup_YYYYMMDD as select ...`) and ask the user.
- **Reconcile after a data migration**: count rows and compare key fields before and after, in SQL.
- Add `not null` in steps on big tables: add the column nullable, backfill in batches, then add the
  constraint (`not valid` then `validate constraint` for checks and foreign keys).
- Create indexes on live tables with `create index concurrently` (outside a transaction).
- Every migration is a file in the repo, applied in order; never hand-edit production schema.

## Indexes and queries

**Index the columns in `where`, `join` and `order by`** of frequent queries. Check with `explain`.

**Composite index column order:** equality columns first, then the range or sort column.

```sql
-- where tenant_id = $1 and created_at > $2 order by created_at
create index events_tenant_created_idx on events (tenant_id, created_at);
```

**Partial index** when queries always filter on a fixed condition:

```sql
create index orders_pending_idx on orders (created_at) where status = 'pending';
```

**Covering index** (`include`) to answer a hot query from the index alone:

```sql
create index orders_user_idx on orders (user_id) include (total, status);
```

**Index type:** B-tree by default; GIN for `jsonb` containment (`@>`), arrays and full-text
(`tsvector`); BRIN for huge naturally ordered tables (logs by time); `pg_trgm` GIN for `ilike '%x%'`.

**JSONB:** query with `@>` against a GIN index (`jsonb_path_ops` when only containment is used), or
add an expression index for one hot key: `create index on t ((data->>'sku'))`.

**Full-text search:** a generated `tsvector` column with a GIN index, queried with `@@`, not `ilike`.

## Data access patterns

**No N+1.** Fetch related rows in one query (`join`, or `where id = any($1)` with an array), not one
query per parent row in a loop.

**Keyset pagination** for anything that can grow:

```sql
-- wrong: offset scans and discards every earlier row
select * from events order by id limit 50 offset 10000;
-- right
select * from events where id > $last_id order by id limit 50;
```

**Upsert** instead of select-then-insert:

```sql
insert into stock (sku, qty) values ($1, $2)
on conflict (sku) do update set qty = excluded.qty;
```

**Batch inserts:** many rows per statement (or `copy`), in chunks of about 1,000.

## Locking and transactions

- **Keep transactions short.** No network calls, user waits or long computations inside one. A long
  transaction holds locks and blocks vacuum.
- **Lock in a consistent order** (for example by id ascending) across code paths to avoid deadlocks;
  retry on `40P01`.
- **Queues:** take jobs with `for update skip locked` so workers do not block each other.

```sql
select id from jobs where status = 'queued' order by id limit 10 for update skip locked;
```

- **Advisory locks** (`pg_advisory_xact_lock(key)`) for application-level mutual exclusion, such as
  one cron run at a time.

## Connections

- **Use a pooler** for serverless and many short-lived clients (Supabase: the transaction-mode pooler
  on port 6543 for serverless functions, a direct or session connection for migrations and long jobs).
- In transaction-mode pooling, prepared statements do not survive between transactions: disable them
  in the driver or use a driver mode that supports it.
- Set `idle_in_transaction_session_timeout` and a statement timeout so a stuck client cannot hold
  locks forever.
- Size pools to the database's connection limit, not to the number of app instances times a guess.

## Diagnosis

- **`explain (analyze, buffers)`** on the real query with real parameters. Look for sequential scans on
  big tables, row estimates far from actual, and sorts or hashes spilling to disk.
- **`pg_stat_statements`** to find the queries that cost the most total time, not just the slowest one.
- **`vacuum (analyze)`** after bulk loads or deletes; check autovacuum keeps up on hot tables
  (`pg_stat_user_tables.n_dead_tup`).
- Rows visible to the wrong user: test the policy as that user's role and JWT, and look for a missing
  `with check` or a `security definer` function without a fixed `search_path`.

## Source

Condensed from Supabase's postgres-best-practices rules (Postgres docs, Supabase RLS guide).
