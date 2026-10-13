# Accessibility

Use this reference when accessibility affects the request or when reviewing an interface for acceptance.

## Authority and scope

Treat WCAG 2.2 and relevant platform standards as requirements when they apply. Use the WAI-ARIA Authoring Practices Guide as informative pattern guidance for custom web widgets, not as a substitute for normative standards or testing with assistive technologies.

Accessibility is a property of the complete experience: content, semantics, interaction, visuals, timing, responsiveness, and compatibility. Automated tools find only a subset of failures.

Before a conformance review, establish the applicable standard version, conformance level, technology, and evaluation scope. A screenshot or static mockup cannot establish WCAG conformance. With screenshot-only evidence, report observable visual risks; mark semantics, keyboard, focus, dynamic states, reflow, and assistive-technology behavior as not verified; and do not issue an overall conformance pass or fail.

For native mobile or desktop interfaces, use the applicable platform interaction and accessibility guidance. Do not transfer HTML or ARIA mechanics directly to native controls.

## Prefer robust foundations

- Use semantic structure and native controls when they meet the interaction need.
- Add ARIA only to expose semantics or state that native HTML does not already provide.
- For custom widgets, identify the intended APG pattern and specify its complete keyboard and focus model.
- Ensure every interactive element has an accessible name that agrees with its visible label.
- Keep reading order, focus order, and visual order coherent.

## Keyboard and focus

- Functionality must be operable through a keyboard interface, except where the underlying task requires path-dependent input; provide an accessible alternative where feasible.
- Focus must be visible, logical, and not obscured.
- Overlays need deliberate initial focus, contained navigation when modal, Escape behavior when appropriate, and predictable return focus.
- Composite widgets need their pattern's arrow-key, Home/End, typeahead, selection, and escape behavior where applicable.
- Do not infer keyboard correctness from click handlers or ARIA roles alone.

## Perception and adaptation

- Text and essential non-text UI need measured contrast appropriate to their role and state.
- Do not use color, position, shape, sound, or motion as the sole carrier of essential information.
- Support text resizing, zoom, reflow, and content spacing without loss of content or function.
- Targets must satisfy applicable WCAG sizing or spacing exceptions; measure rather than estimate.
- Preserve information and function when motion is reduced. Avoid flashing and unnecessary vestibular motion.

## Forms, feedback, and errors

- Use persistent, programmatically associated labels.
- Communicate requirements before submission where practical.
- Identify errors in text, associate them with fields, announce them appropriately, and offer correction guidance.
- Preserve entered data through recoverable failures.
- Announce meaningful status updates without moving focus unnecessarily.
- Provide review, confirmation, reversal, or correction for consequential submissions as appropriate.

## Localization and cognition

- Set and update language and direction correctly.
- Support translated length, bidirectional content, locale-specific formats, and logical navigation.
- Use plain language, consistent terminology, visible instructions, and recognition over recall.
- Avoid time pressure and cognitive tests unless essential and compliant alternatives exist.

## Verification

Select checks proportional to the feature:

- semantic and accessible-name inspection;
- keyboard-only task walkthrough;
- focus placement, order, visibility, and return;
- screen-reader walkthrough of critical tasks;
- automated accessibility scan;
- contrast and target-size measurement in relevant states;
- 200% zoom, narrow reflow, and text-spacing checks;
- reduced-motion, forced-colors/high-contrast, localization, and RTL checks when supported.

Report results as observed, failed, or not verified. Never claim WCAG conformance from an automated scan alone.
