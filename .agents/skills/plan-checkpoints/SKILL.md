---
name: plan-checkpoints
description: Create one local execution plan that divides an already-approved, oversized ticket or specification into reviewable implementation checkpoints. Use explicitly when one ticket will not fit one reliable agent context or one understandable review; do not use for ordinary tickets or to replace product specifications.
---

# Plan Checkpoints

Plan one approved parent ticket; do not implement or replace its specification. If the work fits one reliable implementation context and reviewable diff, explain that checkpoints are unnecessary and stop without creating a file.

## Plan contract

Read the complete parent artifact and relevant comments. Keep it authoritative. Require stable acceptance-criterion IDs, and map each ID to an exact partial or complete checkpoint obligation. Stop if the criteria are too ambiguous to map.

Explore enough of the repository to identify real architecture seams and verification options. Each checkpoint must be coherent, safe to land, independently verifiable, and small enough for one fresh implementation context and committed review diff. A checkpoint may span layers and may defer user exposure when that deferral is explicit and safe.

Map every parent criterion, require each one to reach a `complete` obligation, and define combined evidence for behavior that exists only across checkpoints. Treat unresolved product or design decisions as blockers. Risk may justify a checkpoint human gate, but does not by itself justify splitting the ticket.

## Artifact and approval

Use one ignored local file at `.scratch/<feature-slug>/checkpoints.md`, unless the user supplies another path; verify that it is ignored and reuse an existing tracker for the feature.

Create a draft, present its checkpoint summary and important tradeoffs, and request explicit plan approval. On approval, record the resolved current `HEAD` as the original branch base and set the plan status to `approved`; do not begin implementation.

After plan approval, planning fields are immutable unless the human approves a revision. A revision returns the plan to `draft` until reapproved and does not change the original branch base. Planning fields define obligations, scope, dependencies, gates, constraints, verification, and stop conditions; runtime state comprises checkpoint/final-integration status and handoff fields.

Checkpoint states are `planned -> implemented -> reviewed`, then `approved` only when a human gate is required. `implemented` requires a green checkpoint commit. `reviewed` requires completed review, any required bounded remediation and targeted recheck, and no unresolved BLOCKING or DECISION-REQUIRED finding. Record `approved` only after explicit human approval. A dependency normally requires `reviewed`; a gated dependency requires `approved`.

Final integration is ready only when every checkpoint is `reviewed` or, when gated, `approved`, with no unresolved BLOCKING or DECISION-REQUIRED finding.

## Canonical plan

```markdown
# <Feature> implementation checkpoints

**Parent specification:** <issue, URL, or path>
**Plan status:** draft | approved
**Original branch base:** <resolved SHA required for plan approval>

## Global invariants
- <constraint shared by all checkpoints>

## Acceptance-criteria coverage
| Parent criterion | Checkpoint obligations | Final evidence |
| --- | --- | --- |
| AC-1 | CP-1: partial - <obligation>; CP-2: complete - <obligation> | <evidence> |

## CP-1 - <name>
**Status:** planned | implemented | reviewed | approved
**Blocked by:** <checkpoint and required state, decision, or none>
**Human gate:** required | not required

### Deliverable
<coherent capability or safe state>

### Parent criteria
- AC-1 - partial | complete: <exact obligation>

### In scope
- <behavior/subsystem>

### Intentionally deferred
- <future checkpoint work>

### Relevant design constraints
- <constraint>

### Required verification
- [ ] <observable evidence>

### Stop condition
<exact boundary>

### Runtime handoff
**Review base:** Not started
**Completion HEAD:** Not started
**RED/before evidence:** Not captured
**Verification results:** Not started
**Review status:** Pending | Passed | Blocked
**Unresolved findings:** None | <finding IDs and classes>
**Human approval:** Pending | Not required | Approved: <evidence>

## Final integration
**Status:** pending | complete

### Required combined verification
- [ ] <cross-checkpoint or user-facing evidence>

### Runtime handoff
**Completion HEAD:** Not started
**Verification results:** Not started
**Review status:** Pending | Passed | Blocked
**Unresolved findings:** None | <finding IDs and classes>
```
