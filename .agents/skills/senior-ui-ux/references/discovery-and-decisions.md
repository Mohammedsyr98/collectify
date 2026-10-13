# Discovery and Decisions

Use this reference to frame an ambiguous problem or choose among competing UI/UX patterns.

## Discover the problem

Establish what is known about:

- target users, their experience, abilities, language, and environment;
- primary and secondary tasks;
- frequency, urgency, interruption level, and consequences of mistakes;
- entry points, preceding context, and expected next step;
- supported platforms, viewports, input methods, and assistive technologies;
- product, brand, regulatory, technical, and delivery constraints;
- existing research, analytics, support reports, and product conventions.

Do not require exhaustive discovery for a reversible local decision. Ask a focused question only when different answers would materially change the recommendation. Otherwise proceed with explicit assumptions and identify what evidence would overturn them.

## Frame the decision

State the decision in user-outcome terms. For example, replace "modal or page?" with "What interaction lets users compare details and safely complete a multi-step, interruptible task?"

Identify realistic alternatives, including preserving the current behavior. Reject an option early when it violates a requirement; do not pretend all choices are equally viable.

Compare viable options using the factors that matter for this decision, such as:

- task complexity and duration;
- amount of information and need for comparison;
- interruption and navigation expectations;
- reversibility and data-loss risk;
- discoverability and cognitive load;
- keyboard, focus, screen-reader, and touch behavior;
- small-screen and large-text behavior;
- consistency with the product and platform;
- implementation risk only when it changes user value or delivery feasibility.

Avoid mechanical scoring unless weights are agreed and evidence supports them. A concise tradeoff table is useful when three or more options remain plausible.

## Recommend

Provide:

1. the recommended direction;
2. the user outcome it optimizes;
3. decisive evidence, requirements, and heuristics;
4. meaningful costs and risks;
5. rejected alternatives and why they lose;
6. assumptions and the evidence that could change the decision;
7. the next design or validation step.

When evidence is weak, recommend the safest reversible choice and a validation method rather than presenting confidence theatrically.
