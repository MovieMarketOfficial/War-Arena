---
name: DB schema drift
description: When the code references a DB table that the schema no longer exports, the table may still exist in Postgres with a different shape than a freshly written schema.
---

If a build fails because a table import is missing from `@workspace/db`, the table may have been dropped from schema exports while still existing in the database. Re-adding the schema file is not enough: you must inspect the actual Postgres columns (`information_schema.columns`) before writing the new schema, because the live table may lack an `id` column, use a different primary key, or have different constraints than a clean design would suggest.

**Why:** In this project the `resources` table existed in Postgres with `nation_id` as the sole primary key and no `id` column. A newly written schema with `id: serial().primaryKey()` and `nationId: unique()` caused inserts to fail because Drizzle generated SQL for a non-existent `id` column.

**How to apply:** Before restoring a missing schema export, query `information_schema.columns` for the table in the live database and make the new schema match it exactly. Then verify inserts work with a fresh test record.
