---
name: implement
description: Implement non-trivial issues, ready-for-agent tickets, PRD slices, or feature requests with mandatory human checkpoints and a vertical TDD workflow. Skip for tiny chores, docs-only edits, reviews, and exploratory questions.
---

# Implement

Use this skill when the user asks to implement a GitHub issue, ready-for-agent ticket, PRD slice, or non-trivial feature.

The goal is controlled delivery: one small behavior, one public test, one user approval checkpoint, one minimal implementation, then stop. Permission to start implementation is not permission to complete every layer or acceptance criterion in one pass.

## First Moves

1. Read the requested issue, PRD section, ticket body, and relevant comments.
2. Read the repo's local agent instructions and respect its architecture, commands, glossary, and testing conventions.
3. Check blockers. If the work is blocked by unfinished dependencies, stop and explain the blocking dependency before coding.
4. Inspect the existing code and tests before planning edits. Prefer existing contracts, routes, UI patterns, data-access patterns, translations, and test style.
5. Restate the feature in plain language as the next user-visible promise.
6. Split the work into vertical behavior slices. Each slice should be independently testable and useful.

After identifying the first slice, stop and ask the user to approve that slice before editing files unless the immediately preceding user message explicitly asked you to write the first RED test now or explicitly waived checkpoints.

If product intent, UX behavior, or architecture is unclear, ask one focused question before coding. If the issue is already labeled or written as ready for an agent, avoid re-triaging it unless local code inspection reveals a real conflict.

## Autonomy Boundary

Default to a human-in-the-loop workflow. Do not interpret "implement this issue", "go ahead", "start", "continue", or approval of a plan as approval to skip slice checkpoints.

Only skip the RED-test approval checkpoint when the user explicitly asks for autonomous execution with wording such as "work autonomously", "do not stop for approval", or "implement all slices without checkpoints." If the user grants autonomy for a single slice, stop again after that slice is green before starting the next one.

Before writing production code for a slice, the immediately preceding user message must either approve that slice's RED test or explicitly waive checkpoints. If it does not, stop the turn after presenting the failing test and ask for approval.

Hard stops:

- After code exploration, stop at the first-slice proposal unless the user already authorized writing the RED test.
- After writing a RED test, stop and ask for review; do not write production code in the same turn.
- After a slice is GREEN and verified, stop and ask before starting another slice.
- If the next edit would add or change another subsystem, such as contracts, backend, frontend, persistence, or localization, stop and explain why widening is needed before doing it.

## Slice Shape

For each slice, follow this loop:

1. RED: write one failing test for one observable behavior.
2. Stop and ask the user to review whether the test describes the intended behavior before implementing, unless the user has explicitly requested autonomous execution for that slice or turn.
3. GREEN: after approval, implement the smallest code that makes that test pass.
4. Run the narrowest meaningful verification for that slice.
5. Summarize the result, name any design concern, and stop for user direction before the next slice.

Do not write all tests first. Do not implement all acceptance criteria in one pass. Do not move from contracts to backend to frontend as separate layers unless they are all required to prove the one behavior in the current slice. When a slice appears to require multiple layers, prefer the outermost public test that proves the behavior, implement only the minimum supporting layer changes, and stop after it passes. Let each passing slice teach the next slice.

## Test Seams

Prefer tests that exercise public behavior instead of implementation details.

- Shared contracts: verify request and response shapes through public package exports or schema APIs.
- Backend: prefer authenticated HTTP or command/API seams, using the real persistence layer when the project requires it.
- Frontend: test the rendered app, replacing only external network seams with tools such as MSW when that matches local practice.
- Business logic: when logic becomes dense, enter an inner TDD loop at the nearest stable public or domain-level interface. Avoid private-method tests.

Use issue acceptance criteria as behavior promises, not as a file-by-file checklist.

## Human Review

Keep the human in control.

- Explain the next slice before broad edits.
- After a RED test, briefly state why the failure is expected, ask whether the test matches the intended behavior, and end the turn unless checkpoint skipping was explicitly authorized.
- Once the user approves the test, implement within that approved slice without asking for approval on every individual file edit.
- After GREEN, report the exact behavior now covered.
- If the user wants commits, commit only green, reviewed slices.
- If the user says something feels too complex, pause and simplify or explain why the complexity is essential.

The approval checkpoint is for the behavior/test, not for every keystroke. It is still mandatory before production code unless the user explicitly waived it. Still request explicit authorization for commits, pushes, destructive actions, external services, or any operation that requires permission.

## Refactor

Refactor only while green.

Before keeping a new abstraction, apply the deletion test: if removing it would not reintroduce meaningful complexity at multiple call sites, keep the code local instead.

After refactoring, rerun the narrow tests that prove the behavior still works.

## Done Means Proven

Before finishing, run the relevant verification:

- targeted tests for the changed behavior
- typecheck when typed surfaces changed
- lint when style-sensitive code changed
- broader tests only when the blast radius justifies them

If required infrastructure is unavailable, ask the user to start or provide it instead of replacing meaningful integration coverage with duplicate mocks.

The final response must say what changed, what passed, and what risk remains if any verification could not be run.