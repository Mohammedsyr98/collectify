---
name: implement
description: Implement non-trivial issues, ready-for-agent tickets, PRD slices, or feature requests with a human-in-the-loop vertical TDD workflow. Skip for tiny chores, docs-only edits, reviews, and exploratory questions.
---

# Implement

Use this skill when the user asks to implement a GitHub issue, ready-for-agent ticket, PRD slice, or non-trivial feature.

The goal is controlled delivery: one small behavior, one public test, one minimal implementation, one review checkpoint.

## First Moves

1. Read the requested issue, PRD section, ticket body, and relevant comments.
2. Read the repo's local agent instructions and respect its architecture, commands, glossary, and testing conventions.
3. Check blockers. If the work is blocked by unfinished dependencies, stop and explain the blocking dependency before coding.
4. Inspect the existing code and tests before planning edits. Prefer existing contracts, routes, UI patterns, data-access patterns, translations, and test style.
5. Restate the feature in plain language as the next user-visible promise.
6. Split the work into vertical behavior slices. Each slice should be independently testable and useful.

If product intent, UX behavior, or architecture is unclear, ask one focused question before coding. If the issue is already labeled or written as ready for an agent, avoid re-triaging it unless local code inspection reveals a real conflict.

## Slice Shape

For each slice, follow this loop:

1. RED: write one failing test for one observable behavior.
2. Show the user what behavior the test protects when the change is complex or when the user is learning the workflow.
3. GREEN: implement the smallest code that makes that test pass.
4. Run the narrowest meaningful verification for that slice.
5. Summarize the result, name any design concern, and continue only after the slice is green.

Do not write all tests first. Do not implement all acceptance criteria in one pass. Let each passing slice teach the next slice.

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
- After a RED test, briefly state why the failure is expected.
- After GREEN, report the exact behavior now covered.
- If the user wants commits, commit only green, reviewed slices.
- If the user says something feels too complex, pause and simplify or explain why the complexity is essential.

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