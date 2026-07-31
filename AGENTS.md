# Agent Instructions

## Subagent Strategy

- Use subagents for independent research, broad code exploration, parallel analysis, or review of non-trivial changes.
- Give each subagent one focused task with a clear expected output.
- Keep implementation decisions in the main context unless a subagent has produced evidence worth adopting.
- Do not use subagents for simple, local edits.

## Verification Before Done

- Do not mark work complete without proving the relevant behavior works.
- Do not make confident claims about whether code, config, or dependencies are needed unless the claim has been verified with a command, test, local source inspection, or clearly labeled as an opinion.
- Compare behavior before and after the change when that matters.
- Ask: "Would a staff engineer approve this?"
- Run the narrowest meaningful tests, typecheck, lint, or logs needed to demonstrate correctness.
- If verification cannot be run, state why and describe the remaining risk.

## Demand Elegance

- For non-trivial work, optimize for correctness, codebase fit, and maintainability over completion speed.
- For non-trivial changes, pause before finalizing and ask: "Is there a simpler, cleaner, more maintainable way?"
- Pause before introducing shared helpers, new modules, configuration changes, or dependency changes. Explain the tradeoff and why the existing local pattern is not enough.
- Before keeping a new abstraction, apply the deletion test: if the abstraction were removed, confirm that meaningful complexity would reappear at multiple call sites.
- If the current fix feels hacky, step back and implement the clean solution that fits the codebase.
- Skip this ceremony for simple, obvious fixes.
- Challenge your own work before presenting it.

## Feature Workflow

- For non-trivial new features, prefer this workflow:
  1. Use `grill-me` to reach shared understanding before planning.
  2. Use `to-spec` to turn the agreed context into an implementation-ready spec or PRD.
  3. Use `to-tickets` to split the PRD into vertical tracer-bullet tickets.
  4. Use `tdd` when implementing each ticket.
- Skip this workflow for small fixes, chores, docs-only changes, or obvious local edits.
- If a PRD or issue already exists, start from that artifact instead of recreating it.
- Do not publish PRDs or issues without user approval and available issue-tracker context.
- During implementation, use one behavior test at a time: red, green, then refactor.

## Repo Shape

- This is a pnpm + Turborepo monorepo.
- Frontend: `apps/frontend`
- Backend: `apps/backend`
- Shared request/response contracts: `packages/contracts`
- Shared ESLint config: `packages/eslint-config`
- Shared TypeScript config: `packages/typescript-config`
- The `.agents/skills` folder is intentionally not part of the pnpm workspace.

## Commands

- Use `pnpm.cmd` on Windows PowerShell if script execution policy blocks the `pnpm` shim.
- Install dependencies: `pnpm install`
- Run all dev servers: `pnpm dev`
- Run frontend only: `pnpm dev:frontend`
- Run backend only: `pnpm dev:backend`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`

## Working Rules

- Prefer existing app and package patterns over new abstractions.
- Keep shared API and request/response types in `packages/contracts`.
- Keep edits scoped to the task unless a broader change is necessary for correctness.
- Run the narrowest relevant verification before finishing.
- For non-trivial features, checkpoint after each layer or subsystem, such as contracts, backend, frontend, and verification. Summarize what changed and any design concerns before widening the work.
- Treat unexpected diffs as user-owned work. Do not revert, overwrite, or label them as tool noise until you inspect the diff and ask the user when the origin is unclear.
- If the user says something smells complex, stop implementation, inspect the design, and either simplify it or explain why the complexity is essential.
- Use `grill-me` when product intent, design shape, or tradeoffs are unclear; ask one question at a time.
