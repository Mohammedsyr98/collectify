---
name: code-review
description: Review committed changes since a fixed point along two independent axes, or recheck named blocking findings after a fix. Supports complete-ticket and checkpoint review. Use for branch, PR, ticket, checkpoint, or targeted fix review; it reports findings but does not edit code.
---

# Code Review

Review the committed diff between `HEAD` and one fixed point:

- **Standards**: does the change follow the repository's documented standards and avoid evident design smells?
- **Spec**: does the change fulfill the complete ticket or the explicitly selected checkpoint without unapproved scope?

Run both axes as parallel fresh-context subagents, then report them side by side. This skill reports evidence-backed findings; it never fixes code or grants approval.

If the caller requests targeted-recheck mode and supplies original BLOCKING finding IDs, follow section 7 instead of the ordinary two-axis review.

## 1. Pin the code boundary

Use the fixed point supplied by the user or calling skill. For a checkpoint, use its recorded review base. If neither exists, ask rather than guess.

Validate the fixed point with `git rev-parse`, then capture:

```text
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

Fail before delegation if the ref is invalid or the committed diff is empty. This review excludes staged and working-tree changes; report relevant uncommitted changes instead of implying they were reviewed.

## 2. Pin the requirement boundary

An explicitly supplied source always overrides automatic discovery.

### Complete-ticket mode

Use the explicit ticket/specification. Otherwise look for an originating issue in commit messages, then a matching file under `docs/`, `specs/`, or `.scratch/`. Ask if no authoritative source can be found. If the user confirms that none exists, skip the Spec axis and report `no spec available`.

### Checkpoint mode

Require both a checkpoint-plan path and checkpoint ID. Dereference and read the parent specification, resolve every selected criterion ID to its text, then read:

- the parent-specification reference for context;
- global invariants;
- the selected checkpoint's deliverable, exact criterion obligations, scope, design constraints, required verification, and stop condition;
- work explicitly deferred to later checkpoints.

The selected checkpoint is the requirement boundary. Do not report explicitly deferred parent work as missing. Do report a contradiction with a global invariant, exact criterion obligation due in this checkpoint, or approved future integration path. Refuse an ambiguous checkpoint ID or draft plan.

Capture the caller's actual verification commands and results. In checkpoint mode, compare them with the required verification and treat missing required evidence as a specification finding rather than assuming it passed.

## 3. Find standards sources

Search for every repository file that governs the changed code, including root and nested `AGENTS.md`, architecture documents, `CONTRIBUTING.md`, and coding standards. Repository rules override generic advice. Skip matters already enforced deterministically by tools unless their output shows a failure.

Also inspect these Fowler-style smells as judgement calls, never hard violations:

- Mysterious Name
- Duplicated Code
- Feature Envy
- Data Clumps
- Primitive Obsession
- Repeated Switches
- Shotgun Surgery
- Divergent Change
- Speculative Generality
- Message Chains
- Middle Man
- Refused Bequest

## 4. Finding contract

Every finding must have a stable axis-prefixed ID such as `STD-1` or `SPEC-1`, cite the diff plus the rule or requirement it relies on, and use exactly one class:

- **BLOCKING**: an objective specification miss, incorrect behavior visible in the diff, unjustified scope creep, or documented-standard violation that can be resolved inside the approved design.
- **DECISION-REQUIRED**: resolving it requires changing or clarifying requirements, scope, architecture, dependencies, public contracts, migration strategy, or checkpoint boundaries.
- **ADVISORY**: a judgement-call smell or optional maintainability improvement.

Do not upgrade uncertainty into a blocking claim. Do not report generic preferences without a cited source or named smell.

## 5. Spawn two leaf reviewers

Issue both subagent calls together in the foreground. Each subagent receives repository access, the diff command, commit list, and only the sources its axis needs. End both prompts with:

> Perform this review directly. Do not invoke `code-review`, call another skill, or spawn additional agents.

### Standards reviewer

Provide the standards-source paths and full smell list. Ask for every evidenced documented-rule breach and material smell, per file/hunk where relevant, under 500 words. Require a finding class, citation, concise impact, and bounded remedy. Documented-rule breaches may be BLOCKING or DECISION-REQUIRED; smells are ADVISORY unless separate objective evidence justifies another class.

### Spec reviewer

Provide the explicit complete-ticket source or the constructed checkpoint requirement boundary plus actual verification evidence. Ask for missing or partial requirements, unapproved behavior, missing required evidence, and requirements that appear implemented incorrectly, under 500 words. Require a finding class, diff citation, specification quote, concise impact, and bounded remedy. In checkpoint mode, require the reviewer to list deferred requirements it intentionally excluded before reporting findings.

If the spec is unavailable, skip the Spec reviewer.

## 6. Aggregate without fixing

Present the returned reports under `## Standards` and `## Spec`, verbatim or lightly cleaned. Keep the axes separate; do not merge or rerank them into one verdict.

End with counts by class within each axis and the worst evidenced finding in each axis. State that:

- BLOCKING findings require remediation and verification;
- DECISION-REQUIRED findings require human direction;
- ADVISORY findings are optional and must not trigger automatic churn.

The calling `implement` workflow owns remediation. A direct review returns findings to the user. This review does not replace tests, typechecking, security analysis, domain-specific verification, or human merge approval.

## 7. Targeted recheck

Require the original review report, original BLOCKING finding IDs, pre-fix `HEAD`, current `HEAD`, and verification evidence. Validate both commits and inspect the original reviewed diff for context plus the fix diff `git diff <pre-fix-head>..HEAD`.

Spawn one fresh leaf reviewer. Give it only the named findings, their original citations and remedies, the relevant requirement or rule sources, both diffs, and verification evidence. End its prompt with the same no-skill/no-subagent guard.

For each original ID, return `RESOLVED`, `UNRESOLVED`, or `UNKNOWN` with evidence. Also report any objective regression or decision directly introduced by the fix diff. Unrelated observations may be noted as ADVISORY but must not expand the recheck or trigger another loop. This mode never edits code or grants approval.
