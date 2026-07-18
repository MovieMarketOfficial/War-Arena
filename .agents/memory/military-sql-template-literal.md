---
name: Malformed SQL template literals
description: Dynamic SQL fragments in resource-update routes must be reviewed whenever a resource is added or changed.
---

When a route updates multiple resource columns with `sql` template literals, every fragment must be checked for the correct `${variable}` interpolation. A typo such as `sql\`aluminumNeeded}\`` will compile but fail at runtime or silently corrupt the update.

**Why:** The military purchase route had `resourceUpdates.aluminum = sql\`aluminumNeeded}\`` which was missing the `${aluminumNeeded}` interpolation and the `aluminum -` prefix. This would have prevented aircraft/missile/nuke purchases from deducting aluminum correctly.

**How to apply:** For any route that builds a `Record<string, unknown>` of SQL updates, grep for `sql\`` and confirm each fragment follows the pattern `sql\`column - ${variable}\`` (or `+` for income). Add this to the review checklist when changing resource costs or adding new resources.
