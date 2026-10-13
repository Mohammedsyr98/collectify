# Review and Acceptance

Use this reference to critique a concept or artifact and to decide whether an implementation satisfies an agreed design contract.

## Review the artifact, not its defense

Prefer a rendered interface at representative viewports and states. Exercise important controls. If only source, a screenshot, or a static mockup is available, limit claims to what that evidence supports and name what remains unverified.

Establish the target user, primary task, platform, constraints, and applicable design contract. Do not penalize an artifact for requirements it never had.

## Review lenses

### Task and flow

- Can the intended user understand the purpose and complete the primary task?
- Are entry, progress, completion, cancellation, and recovery clear?
- Are consequential decisions informed and reversible where appropriate?

### Information and content

- Is the hierarchy aligned with user priority?
- Are terminology, labels, instructions, errors, and status feedback clear?
- Does realistic, missing, long, translated, and overflow content remain understandable?

### Interaction

- Are affordances, states, transitions, and outcomes predictable?
- Are loading, disabled, empty, partial, error, and success states truthful and distinguishable where applicable?
- Do keyboard, focus, pointer, and touch behaviors match the control's semantics?

### Visual system

- Do typography, spacing, color, alignment, imagery, and motion establish a coherent hierarchy?
- Are semantic tokens and established components used consistently?
- Is variation purposeful rather than accidental? Is repetition useful rather than monotonous?
- When visual quality, polish, or distinctiveness is material, apply [visual-critique.md](visual-critique.md).

### Adaptation

- Does the experience survive supported widths, zoom, larger text, different input modes, localization, and directionality?
- Are important content or controls clipped, obscured, reordered incorrectly, or forced into horizontal scrolling?

### Accessibility and trust

- Apply relevant requirements from [accessibility.md](accessibility.md).
- Check error prevention, recovery, privacy, honest status, and absence of manipulative patterns.

### Performance

- Does the interface respond promptly and maintain visual stability?
- Are loading behavior, media, animation, and data density appropriate to the task and environment?

## Findings

Every finding should contain:

- **Severity**: blocker, major, minor, or enhancement;
- **Classification**: requirement, heuristic, convention, preference, or hypothesis;
- **Evidence**: what was observed and under which state or condition;
- **User impact**: who is affected and how;
- **Recommendation**: a concrete outcome, without unnecessary implementation prescription;
- **Validation**: how to confirm the fix when it is not self-evident.

Severity meanings:

- **Blocker**: prevents task completion, creates material harm or data-loss risk, or violates a necessary accessibility/product requirement.
- **Major**: substantially degrades comprehension, efficiency, recovery, or consistency in an important path.
- **Minor**: localized friction or inconsistency with limited task impact.
- **Enhancement**: optional improvement or experiment, not a defect.

Do not inflate aesthetic disagreement into a blocker. Do not demote accessibility or task failure to "polish." Consolidate related symptoms under the underlying problem.

## Verdicts

For acceptance, use one of:

- **Accept**: relevant acceptance criteria were verified and no blocking work remains.
- **Accept with follow-up**: safe to proceed; named minor work or experiments remain.
- **Rework**: one or more major issues undermine the intended experience.
- **Reject**: blockers make the result unsafe or unusable.
- **Unable to verify**: required artifact, environment, state, or test evidence is unavailable.

List what was inspected, exercised, measured, and not verified. Do not convert a heuristic review into an accessibility or usability certification.
