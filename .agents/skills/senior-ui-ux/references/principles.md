# Principles

Use these principles as a reasoning system, not as a checklist that overrides product context. Requirements outrank heuristics; user and project evidence outrank generic taste.

## 1. Begin with the user outcome

Identify who is acting, what they are trying to accomplish, the context and frequency of the task, and the cost of delay or error. A polished screen that does not help the user complete the right task is unsuccessful.

Do not confuse stakeholder requests, technical entities, or page inventory with user goals. Translate features into tasks and outcomes.

## 2. Make system status visible and truthful

Users should understand where they are, what the system is doing, what changed, and what happens next. Feedback must match reality; a success message must correspond to a completed change.

Distinguish loading from disabled, empty from failed, saved from merely edited, and selected from hovered. Preserve continuity during asynchronous work when possible.

## 3. Match the user's mental model

Use the language, concepts, ordering, and units familiar to the intended audience. Prefer recognition over recall. Keep essential choices and context visible or easily retrievable.

Research is needed when terminology, grouping, or workflow assumptions are uncertain. Do not label an internal data model as intuitive merely because it is convenient to implement.

## 4. Preserve user control

Provide clear exits, cancellation, undo, and recovery proportional to the consequences of the action. Do not trap users in a flow or use friction to obstruct a legitimate goal.

For destructive or consequential actions, prefer prevention, review, reversibility, or confirmation according to risk. Avoid confirmation fatigue for harmless actions.

## 5. Establish meaningful hierarchy

Every view needs a discernible purpose, primary content, and next action. Build hierarchy through composition, position, scale, contrast, typography, whitespace, and progressive disclosure, not through decoration alone.

Limit simultaneous emphasis. Density is contextual: expert operational tools may be dense; infrequent consumer tasks may need more guidance and space. Neither minimalism nor density is inherently superior.

## 6. Be consistent where consistency reduces learning

The same concept should keep the same name, behavior, and visual treatment. Follow platform and industry conventions unless deviation produces a demonstrated benefit.

Consistency is not uniformity. Different priorities or content types may require different compositions. Reuse semantics and interaction models; do not force every section into the same card or grid.

## 7. Design applicable states, not only the ideal state

For each element or flow, identify the states that actually apply, such as default, hover, focus, active, selected, expanded, disabled, loading, empty, partial, error, success, offline, permission-denied, or overflow.

Do not require every state on every control. State coverage follows behavior. Specify transitions, announcements, retained input, recovery, and focus behavior where relevant.

## 8. Use semantic systems

Prefer design tokens and component contracts that express intent: primary action, destructive action, critical status, muted text, raised surface, or focus indicator. Repeated semantic decisions belong in the system; local optical adjustments may remain local when justified.

Fit the established design system before proposing new primitives. A new abstraction is warranted when it removes meaningful repeated complexity, not merely to satisfy symmetry.

## 9. Make accessibility part of the design

Accessibility affects structure, content, interaction, and visual treatment from the start. Prefer native semantics and controls when they satisfy the need. Custom widgets inherit responsibility for names, roles, states, keyboard behavior, focus management, zoom, contrast, target size, and assistive-technology interoperability.

Use WCAG as a conformance baseline and authoritative platform guidance for implementation patterns. Passing automated checks is not equivalent to an accessible experience.

## 10. Adapt across environments

Design for the actual range of viewports, input modes, text sizes, languages, directions, content lengths, and network conditions. Choose mobile-first, desktop-led, or adaptive composition from evidence about the product; always define behavior outside the ideal viewport.

Localization changes length, line breaking, ordering, date and number formats, and sometimes information architecture. RTL support requires logical direction and interaction review, not only mirrored CSS.

## 11. Make content part of the interface

Labels should be specific, concise, and consistent. Errors should identify the problem and offer a recovery path. Empty states should explain the state and, when appropriate, provide a meaningful next action.

Test with realistic and adversarial content: long names, large values, missing fields, mixed scripts, translated copy, and pluralization. Placeholder prose hides layout and comprehension failures.

## 12. Use motion and visuals purposefully

Motion should explain causality, orientation, hierarchy, or feedback. It must not delay tasks, hide essential content, or ignore reduced-motion preferences.

Choose an explicit aesthetic direction appropriate to audience and domain. Typography, color, imagery, shape, spacing, and motion should reinforce that direction. Treat fashionable patterns and anti-pattern lists as prompts for judgment, not universal law.

Distinctiveness should come from the product's real subject matter, content, brand character, and interaction needs. Novelty without relevance is decoration; familiarity without intention becomes generic.

## 13. Protect trust and performance

Perceived and actual performance affect usability. Avoid layout shifts, blocked feedback, unnecessary animation cost, and ambiguous optimistic updates. Preserve entered data during recoverable failures.

Privacy, safety, and honest communication outrank conversion tactics. Do not recommend deceptive defaults, disguised advertising, hidden costs, obstructive cancellation, or other dark patterns.

## 14. Verify claims at the right level

Inspect the rendered result and exercise important interactions when possible. Check relevant responsive widths, zoom or larger text, keyboard paths, focus, reduced motion, localization, and error recovery.

Say exactly what was observed or measured. A skipped tool is not a pass. A heuristic review is not user research. A visually pleasing result is not proof of task success.

## Contextual rules, not universal bans

Do not universally prohibit native selects, emoji, asymmetric accents, equal card grids, arbitrary values, a particular type ratio, dark mode, or any aesthetic device. Evaluate whether each choice supports the user, content, platform, brand, accessibility, and system coherence.
