# Visual Prototyping

Use this reference only after the user explicitly requests a prototype, mockup, generated image, rendered artifact, or screenshots. Prototype generation is never an automatic consequence of a design, review, refinement, or exploration request.

## Purpose

A prototype is a non-production design artifact used to answer a named question that prose or a static specification cannot answer as effectively. State that question before creating the artifact.

Choose the smallest suitable form:

- an image comp for visual mood, composition, or art-direction exploration;
- an annotated wireframe for structure and flow;
- isolated HTML/CSS/JS when layout, responsive behavior, state changes, or interaction must be experienced in a browser;
- screenshots when the user asks to compare or review rendered outcomes.

Do not create a runnable prototype when an image or wireframe answers the question, and do not create any visual artifact when the user requested only guidance or a specification.

## Isolation boundary

- Keep prototype files outside production application code and clearly label them as disposable design artifacts.
- Do not modify existing routes, components, styles, tokens, assets, configuration, dependencies, or build scripts.
- Do not connect to production services, authentication, analytics, persistence, or real mutations.
- Use realistic but fabricated content and in-memory state. Label sensitive or domain-critical assumptions.
- Prefer a self-contained HTML file when a runnable browser artifact is sufficient. Use the existing project stack only if the user explicitly requests that form and separately authorizes the necessary product-tree changes.
- Never promote prototype code directly into production. Convert validated decisions into a design contract for another implementation workflow.

## Variants

Create multiple variants only when comparison helps answer the question. Two or three is usually enough; one focused prototype is better when the direction is already chosen.

Variants must disagree meaningfully about composition, information hierarchy, density, navigation, or primary affordance. Color-only or decoration-only variations do not justify separate prototypes.

Keep constant the product facts that need fair comparison: target user, task, content, required states, accessibility constraints, and viewport assumptions.

## Quality and realism

Prototype quality must be high enough to judge the design question, while remaining visibly non-production.

- Use the applicable art direction and visual-design rules.
- Include realistic content volume, long labels, missing data, and relevant loading, empty, error, or selected states.
- Make primary interactions operable when interaction is part of the question.
- Preserve keyboard access, visible focus, contrast, reduced motion, and responsive behavior needed to evaluate the concept.
- Do not add production architecture, exhaustive error handling, test suites, or abstractions unrelated to the question.

## Render and review

When the user requests rendered output or screenshots:

1. Render the artifact at the viewports relevant to the brief.
2. Capture only the states needed to answer the question.
3. Apply one bounded visual-critique pass and correct material problems in the prototype artifact.
4. Provide the artifact location, viewing instructions, screenshots requested, and limitations of the evidence.

Do not treat an attractive screenshot as proof of interaction quality, accessibility conformance, or usability.

## Handoff and lifetime

Deliver:

- the question the prototype was built to answer;
- artifact paths and simple viewing instructions;
- the direction or variant recommended and why;
- decisions validated, rejected, or still uncertain;
- the implementation-ready design contract;
- explicit confirmation that production files were not modified.

Keep the prototype until the user asks to remove it or its agreed location is explicitly temporary. Do not delete user-visible artifacts automatically.
