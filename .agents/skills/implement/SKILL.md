---
name: implement
description: Implement an approved ticket, specification, checkpoint, or final-integration pass by orchestrating TDD, repository verification, local commits, and code review. Use for non-trivial implementation work; skip reviews, planning-only requests, tiny chores, and docs-only edits.
---

# Implement

Implement exactly one approved unit per invocation:

- a complete ticket or specification;
- one checkpoint from an approved checkpoint plan; or
- the final-integration pass for a completed checkpoint plan.

Never turn one checkpoint into permission to finish the parent feature.

## Resolve the unit

Read the authoritative artifact and state the unit's title before editing. For checkpoint work, require an approved plan path and checkpoint ID, then read the parent specification and selected checkpoint. Refuse a draft plan, an ambiguous unit, or an unmet blocker. Do not implement work the checkpoint defers.

Read the repository instructions, relevant architecture documents, existing code, and tests.

## Pin the review boundary

For a ticket or checkpoint, record the current `HEAD` before editing as that unit's review base. For final integration, use the checkpoint plan's original branch base. Verify that the chosen commit resolves and is an ancestor of `HEAD`.

Inspect `git status` and follow the repository rules for existing or unexpected changes.

## Execute the unit

For a ticket or checkpoint:

1. Call `tdd` at the approved seams.
2. Run the repository-required verification.
3. Commit the verified, scoped changes locally. Explicit invocation of this skill authorizes those local commits.
4. For a checkpoint, update the plan's runtime fields to record the implementation commit and verification evidence.

For final integration, require the checkpoint plan to be ready for its final pass and run its combined verification. Review the existing checkpoint commits without creating an empty pre-review commit when the working tree is already clean.

## Review and remediate once

Call `code-review` after the unit's changes are committed. Pass the review base, authoritative ticket or specification, verification evidence, and, for checkpoint work, the plan path and checkpoint ID.

Follow the returned finding classes:

- fix BLOCKING findings that stay inside the approved unit, then verify and commit the fixes;
- request direction for DECISION-REQUIRED findings; and
- report ADVISORY findings without automatically applying them.

After committing blocking fixes, call `code-review` once in targeted-recheck mode. Stop if a blocking finding remains or a decision is required.

## Handoff

For a checkpoint, update its runtime handoff and state according to the approved plan, then stop before the next checkpoint.

For a complete ticket, report the delivered behavior, verification and review results, and remaining risks.

For final integration, after the complete-branch review and bounded remediation, rerun final verification and report whether the branch is ready for `pr`.
