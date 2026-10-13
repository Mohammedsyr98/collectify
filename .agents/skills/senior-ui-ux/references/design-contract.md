# Design Contract

Use this reference to define an implementation-ready experience without producing application code.

Scale the contract to the work. A component may need one page of behavior; a journey may need flows and multiple screen specifications.

## Product intent

- Target user and context
- Primary task and desired outcome
- User and business risks
- Constraints and explicit non-goals
- Assumptions and evidence gaps

## Information and flow

- Entry points and prerequisites
- Information hierarchy and reading order
- Primary path, alternate paths, exits, and recovery
- Navigation and location cues
- Decisions the user must make and information needed at each point

Use a flow diagram only when branching or state change is materially clearer visually.

## Screen or component specification

For each meaningful surface, define:

- purpose and primary focal point;
- regions and content priority;
- component anatomy and relationships;
- primary, secondary, destructive, and escape actions;
- labels, instructions, errors, empty-state copy, and success feedback;
- applicable state matrix and state transitions;
- keyboard behavior, focus entry/exit, and announcements;
- responsive reflow, overflow, large text, and input-mode behavior;
- localization, directionality, and content-length considerations;
- semantic token intent and existing components to reuse;
- performance or trust considerations visible to the user.

Avoid pixel-perfect prescriptions unless an established design system or asset requires them. Specify intent and constraints tightly enough that implementation choices cannot change the experience accidentally.

## Visual direction

When visual quality is part of the assignment, read [visual-design.md](visual-design.md) and [art-direction.md](art-direction.md), then define only the decisions needed to preserve the chosen direction:

- a one-sentence visual thesis tied to the product, audience, and desired emotional response;
- the intended focal path and macro-composition;
- typography roles, hierarchy, voice, and density;
- color roles and proportional use, including semantic and accessibility constraints;
- spacing rhythm, shape language, surfaces, depth, and border treatment;
- imagery, illustration, iconography, or data-visualization direction where relevant;
- motion purpose and character, including reduced-motion behavior;
- responsive changes to hierarchy and composition, not merely smaller dimensions;
- deliberate signature elements and explicit patterns to avoid for this product;
- proposed semantic tokens or system extensions, distinguished from established project conventions.

Use exact values when they resolve ambiguity or belong to an agreed system. Otherwise specify relationships and intent so implementers can make sound optical adjustments.

## Accessibility acceptance criteria

State testable behavior, not "must be accessible." Include only criteria relevant to the surface. Examples include:

- logical headings and landmarks;
- programmatic labels, descriptions, and error associations;
- complete keyboard operation with visible, unobscured focus;
- focus placement and return for overlays;
- status changes announced without disruptive focus movement;
- no information conveyed by color alone;
- contrast and target-size requirements to be measured;
- reflow and text-resize expectations;
- reduced-motion behavior;
- native semantics or a named WAI-ARIA pattern for custom widgets.

## Validation plan

Define how to evaluate the risky assumptions:

- rendered inspection and interaction walkthrough;
- representative content and localization cases;
- keyboard and screen-reader checks;
- automated accessibility checks;
- responsive, zoom, reduced-motion, and performance checks;
- usability study, prototype test, analytics, or experiment when user behavior is uncertain.

## Handoff

End with a concise implementation handoff containing:

- decisions implementers must preserve;
- existing project conventions they should follow;
- acceptance criteria;
- unresolved product questions;
- areas where implementation may choose freely.

Do not supply production code, edit files, choose a new dependency, or dictate internal architecture unless the user requested an architectural decision as part of the design constraints. Hand implementation to another workflow.
