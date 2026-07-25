---
name: to-spec
description: Turn the current conversation context into an implementation-ready spec and publish it to the project issue tracker. Use when the user wants to create a spec, or agent-ready implementation brief from the current context.
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user - just synthesize what you already know.

The issue tracker and triage label vocabulary should have been provided to you.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the highest useful seams at which the feature should be tested. Prefer existing seams over new seams. Use the highest seam possible; the fewer seams across the codebase, the better.

For each new or modified module behind those seams, actively look for opportunities to make it deep: a small interface with substantial behavior hidden behind it. Avoid shallow pass-through modules.

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

Check with the user that the proposed seams and deep modules match their expectations. Check with the user which modules they want tests written for.

3. Write the spec using the template below, then publish it to the project issue tracker.

Apply `ready-for-agent` when the spec contains enough product, implementation, and testing decisions for an agent to start without further human judgment. Apply `needs-triage` only when important product, architecture, ownership, or priority decisions still need a human decision before implementation.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- The seams that will be used or introduced
- How those modules stay deep rather than shallow pass-throughs
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts - not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which seams the feature will be tested through
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
