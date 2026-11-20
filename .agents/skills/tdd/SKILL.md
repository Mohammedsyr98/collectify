---
name: tdd
description: Test-driven development through pre-agreed public seams, one red-green behavior slice at a time. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", wants integration tests, or asks for TDD.
---

# Test-Driven Development

TDD is the red -> green loop. This skill is the reference for producing tests worth keeping: where tests go, what they verify, the anti-patterns, and the rules of the loop. Consult it before and during each cycle.

When exploring the codebase, read `GLOSSARY.md` if it exists so test names and interface vocabulary match the project's domain language, and respect relevant ADRs and repository instructions.

## What a good test is

Tests verify behavior through interfaces, not implementation details. A good test reads like a specification, survives internal refactoring, and uses expected values from an independent source such as the specification or a worked example. If no independent expected value exists, stop and clarify the behavior instead of inventing one.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidance.

## Seams: where tests go

A seam is an interface where behavior is observed without reaching past it into implementation details. A seam may be internal to a larger module, but the test still uses the smaller module's exposed interface.

Test only at explicitly confirmed seams. Before writing any test, name each proposed seam and give a one-line note on what it catches and misses, then wait for confirmation. An approved ticket, specification, or checkpoint counts as that confirmation only when it explicitly names the test seams; artifact approval alone is not seam approval.

When interface shape or seam placement is itself unclear, consult `codebase-design`. If product intent, design shape, or the tradeoff remains unclear, invoke `grill-me` before requesting seam confirmation.

## Anti-patterns

- **Implementation-coupled:** mocks internal collaborators, tests private methods, or verifies through a side channel. The test breaks when internals change even though behavior does not.
- **Tautological:** recomputes the expected value using the same rule as the implementation. Expected values must come from an independent source of truth.
- **Horizontal slicing:** writes a batch of tests before implementation. Work vertically instead: one test -> one minimal implementation -> repeat.

## Rules of the loop

- **Red before green.** Write one failing behavior test and confirm that it fails for the expected reason. Then write only enough code to pass it.
- **One slice at a time.** Use one confirmed seam, one test, and one minimal implementation per cycle. Do not anticipate later tests or add speculative behavior.
- **No RED approval gate.** Once the seam is confirmed, continue directly from RED to GREEN without pausing for human approval.
- **Mock system boundaries only.** Mock external APIs, time, randomness, or similar boundaries when necessary; do not mock your own modules.
- **No separate refactor phase.** Finish the approved behavior cleanly under repository rules; `code-review` independently reports any remaining refactoring findings after implementation is green.
