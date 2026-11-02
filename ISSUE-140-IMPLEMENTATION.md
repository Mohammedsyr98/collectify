# Issue 140 — Boundary Implementation Tracker

Issue: [Choose an eligible target when recording a payment](https://github.com/Mohammedsyr98/collectify/issues/140)

Status: B4 complete; checkpoint before the payment-drawer workflow
Current boundary: B5 — Payment drawer selection workflow (awaiting approval)
Last completed boundary: B4 — Frontend payment-target data access

## How to use this tracker

- Work on one boundary at a time.
- Do not begin the next boundary until the current boundary's evidence gate passes.
- Record the exact verification command and result in the evidence log.
- Stop for a checkpoint before widening into the next package or application.
- Mark a boundary complete only when its behavior, not merely its files, is verified.
- If implementation reveals a product decision not captured here, stop and discuss it instead of silently expanding the scope.

## Boundary status

| Boundary | Scope                                                | Depends on | Status      |
| -------- | ---------------------------------------------------- | ---------- | ----------- |
| B0       | Decisions and scope                                  | —          | Complete    |
| B1       | Shared payment-target contract                       | B0         | Complete    |
| B2       | Shared backend payment summary                       | B1         | Complete    |
| B3       | Backend payment-target read endpoint                 | B2         | Complete    |
| B4       | Frontend payment-target data access                  | B3         | Complete    |
| B5       | Payment drawer selection workflow                    | B4         | Not started |
| B6       | Customer-details orchestration                       | B5         | Not started |
| B7       | Localization, accessibility, and responsive behavior | B6         | Not started |
| B8       | Cross-boundary regression verification               | B7         | Not started |

## Fixed decisions

- Keep `GET /customers/:customerId/debts` and its pagination unchanged.
- Add `GET /customers/:customerId/payment-targets` as a separate read endpoint.
- A payment target is one final schedule item with its debt context. There is no debt-then-installment selection step.
- Exclude paid targets. Include unpaid and partially paid targets, including later installments.
- Use a fixed server page size of 10. The client cannot provide `pageSize`.
- Keep target picker page, search, and filter state inside the drawer session; do not put them in the customer-details URL.
- Order the server page by due date with deterministic tie-breakers. Visually group only the current page's rows by debt.
- Search debt descriptions only, using case-insensitive literal substring matching.
- The large picker has `All targets`, `Unpaid`, and `Partially paid` status choices. `All targets` is the default.
- Determine picker mode from the initial unfiltered result count: zero defensive empty state, one automatic selection, two through five simple selection, and more than five large picker.
- Once large-picker mode starts, keep search and status controls visible until the drawer closes, even when filtering produces five or fewer results.
- Use the existing read-only `repeatable read` transaction pattern for a coherent multi-statement result.
- From an exact debt-card target, open the form directly and fetch targets only if the user chooses `Change target`.
- Target changes preserve date and note. A same-currency change preserves and revalidates amount. A different-currency change clears amount without adding an explanatory message.
- The customer details page owns one payment drawer and one debt-creation drawer. Debt editing and deletion remain owned by the debt ledger.
- The header shows `Record payment` when any customer financial summary has a positive remaining amount; otherwise it shows enabled `Add debt`.
- Do not add global workflow state, a nested modal, a state-machine library, a generic repository, or a client-controlled page-size interface.
- Payment editing and any `forPaymentId` exception are outside this issue unless issue 140 is explicitly changed to require them.

## B0 — Decisions and scope

Status: Complete

- [x] Eligible-target rules agreed.
- [x] Header action behavior agreed.
- [x] Direct schedule-item selection agreed.
- [x] Separate paginated endpoint agreed.
- [x] Drawer-local picker state agreed.
- [x] Fixed page size of 10 agreed.
- [x] Due-date paging and page-local debt grouping agreed.
- [x] Large-picker search and status-filter behavior agreed.
- [x] Flat target response rows agreed.
- [x] Shared balance calculation agreed.
- [x] Drawer and debt-creation ownership agreed.
- [x] Draft transition rules agreed.
- [x] Read-only `repeatable read` implementation agreed.

Evidence gate: This document records every decision needed to start B1 without inventing product behavior.

## B1 — Shared payment-target contract

Status: Complete

Goal: Define the complete transport interface before backend or frontend code depends on it.

Likely scope:

- `packages/contracts/src/payments/payment-target.ts` (new)
- `packages/contracts/src/payments/payment-target.test.ts` (new)
- `packages/contracts/src/payments/index.ts`

Checklist:

- [x] Add `paymentTargetPageSize` with the fixed value `10`.
- [x] Add a query schema with one-based `page`, optional trimmed `search`, and optional `paymentState` restricted to `unpaid | partiallyPaid`.
- [x] Do not accept `pageSize` from the client.
- [x] Add a flat target schema containing:
  - schedule-item ID;
  - debt ID, description, currency, and version;
  - target amount, remaining amount, due date, and payment state;
  - structural plan context as either `onePayment` or `installment` with position.
- [x] Add the paginated response schema: `items`, `page`, fixed `pageSize`, `totalItems`, and `totalPages`.
- [x] Export the schemas, constants, and inferred types through the contracts package.
- [x] Add focused parser tests for valid queries, normalization, rejected paid filters, rejected client page size, and both plan shapes.

Evidence gate:

- [x] `pnpm.cmd --filter @collectify/contracts test`
- [x] Contract interface reviewed before opening the backend boundary.

Checkpoint: The response contains the picker and payment-submission facts. Debt-level remaining amount was intentionally removed from this read shape; preserving the existing debt-after-payment preview must be resolved before B5 changes the drawer contract.

## B2 — Shared backend payment summary

Goal: Let the debt ledger and payment-target read use one definition of paid amount, remaining amount, and payment state without introducing a generic persistence layer.

Likely scope:

- `apps/backend/src/payments/payment-details-by-debt.ts`
- A narrowly named payment-summary helper under `apps/backend/src/payments/`
- Existing debt integration coverage

Checklist:

- [x] Extract only the reusable schedule-item payment aggregation and derived amount expressions needed by both reads.
- [x] Keep debt-specific window totals and response assembly in the debt read implementation.
- [x] Keep target eligibility, filters, search, ordering, and pagination out of the shared payment summary.
- [x] Do not introduce a repository interface, adapter interface, or generic query builder.
- [x] Prove the existing debt response is unchanged after the refactor.

Evidence gate:

- [x] Run the narrow existing debt integration tests that cover unpaid, partially paid, and paid projections.
- [x] Record before/after observable results; do not test SQL helper internals.

Checkpoint: Review the extracted helper with the deletion test. If deleting it would not recreate the financial expressions in both readers, remove it.

## B3 — Backend payment-target read endpoint

Status: Complete

Goal: Return an owner- and customer-scoped page of eligible schedule-item targets.

Likely scope:

- A focused payment-target controller/read implementation under `apps/backend/src/payments/`
- `apps/backend/src/payments/payments.module.ts`
- A payment-target integration specification

Checklist:

- [x] Add `GET /customers/:customerId/payment-targets`.
- [x] Validate query parameters with the shared contract.
- [x] Require the customer to belong to the authenticated owner; preserve the existing customer-not-found convention.
- [x] Execute ownership, count, target rows, and response assembly in a read-only `repeatable read` transaction where multiple statements are used.
- [x] Exclude paid rows before count and pagination.
- [x] Apply debt-description search and optional payment-state filter before count and pagination.
- [x] Order by due date, followed by deterministic debt/schedule tie-breakers.
- [x] Return one-payment or installment-position context without unused full-plan metadata.
- [x] Return the debt version and target monetary facts from the coherent read.
- [x] Return `200` with an empty page for an owned customer with no eligible targets.
- [x] Do not fetch all debts or all schedule items into memory and then paginate.

Behavior-focused integration coverage:

- [x] Unpaid and partially paid targets are returned; paid targets are absent.
- [x] Later eligible installments remain selectable.
- [x] Search and status filtering happen before page metadata is calculated.
- [x] Page size, total counts, and stable ordering are correct across more than ten targets.
- [x] One-payment and installment structural context is correct.
- [x] Remaining amounts and debt version match the persisted state.
- [x] Missing, wrong-owner, and owned-empty customer cases follow their declared responses.
- [x] Do not add a synthetic concurrency test solely to prove PostgreSQL isolation semantics.

Evidence gate:

- [x] `pnpm.cmd --filter @collectify/backend exec vitest run --config vitest.integration.config.ts src/payments/payment-targets.integration.spec.ts`
- [x] `pnpm.cmd --filter @collectify/backend typecheck`

Checkpoint: Inspect the query plan/shape and response before introducing frontend consumers.

## B4 — Frontend payment-target data access

Status: Complete

Goal: Add one typed, customer-scoped frontend read path without premature picker or URL state.

Likely scope:

- `apps/frontend/src/features/payments/api/list-payment-targets.ts` (new)
- `apps/frontend/src/features/payments/paymentTargetQueries.ts` (new)
- `apps/frontend/src/features/payments/api/list-payment-targets.test.ts` (new)

Checklist:

- [x] Serialize the typed shared query without introducing a client-controlled page size.
- [x] Parse the response through the shared payment-target response schema at the HTTP boundary.
- [x] Use a customer-scoped query-key family with page-specific query keys.
- [x] Expose one focused React Query read path with no router or URL coupling.
- [x] Keep drawer lifecycle, search, filters, pagination, and loading presentation out of the data-access boundary until the real picker consumes it.
- [x] Rely on the query's default stale-on-remount behavior instead of adding redundant mutation invalidation before an active picker consumer exists.

Evidence gate:

- [x] A focused frontend test proves the stable HTTP mapping and absence of client-controlled page size.
- [x] `pnpm.cmd --filter @collectify/frontend typecheck`
- [x] `pnpm.cmd --filter @collectify/frontend lint`
- [x] Changed frontend files pass Prettier.

Checkpoint: The data path contains no target-picker state, router dependency, placeholder-data policy, or mutation policy. B5 must conditionally render the picker query so exact-target entry performs no target-list request.

## B5 — Payment drawer selection workflow

Goal: Evolve the existing drawer into one continuous target-selection and payment-entry workflow.

Likely scope:

- `apps/frontend/src/features/payments/editor/PaymentDrawer.tsx`
- A focused target-picker view under the same feature
- Payment drawer and submission-flow tests

Checklist:

- [ ] Change the drawer interface from full `DebtResponse` plus schedule ID to customer ID plus optional initial payment target.
- [ ] Resolve the debt-level remaining input for header-fetched targets before changing the drawer contract; do not silently remove the existing debt-after-payment preview.
- [ ] Keep only `picker | form` view state and the active target; do not add a workflow library.
- [ ] Keep one form instance mounted for the drawer session so draft fields survive picker navigation.
- [ ] Keep page, raw search input, effective debounced search, and status filter local to the drawer session; do not write them to the URL.
- [ ] Reset page to 1 when effective search or status changes.
- [ ] Keep search and filter controls mounted while their request is pending, without presenting previous-query rows as current results.
- [ ] Render the target query only while the picker is displayed: unknown-target entry shows the picker loading state, while exact-target entry skips both picker UI and request until `Change target`.
- [ ] Automatically select the sole initial unfiltered target.
- [ ] Render a simple target list for two through five initial targets.
- [ ] Render the large picker for more than five initial targets.
- [ ] Keep large-picker controls present for the rest of the drawer session, including zero filtered results and loading states.
- [ ] Search debt descriptions only and combine search with the status filter.
- [ ] Group the current server page by debt ID for presentation; do not change server pagination semantics.
- [ ] Make the debt heading informational and every schedule row the final selection action.
- [ ] Show plan label, due date/timing, payment state, remaining amount, and currency on each row.
- [ ] Selecting a row immediately returns to the form; do not add a `Continue` action.
- [ ] Add `Change target` on the form.
- [ ] Preserve date and note across target changes.
- [ ] Preserve and revalidate amount for same-currency target changes.
- [ ] Clear amount for different-currency target changes without extra explanatory UI.
- [ ] Submit the active target's schedule-item ID and debt version through the existing payment command.
- [ ] Preserve the existing idempotency behavior: reuse only an identical submission; changing target/version yields a fresh key.

Behavior-focused rendered coverage:

- [ ] Exact initial target skips the picker.
- [ ] Zero, one, two-to-five, and more-than-five target states behave as declared.
- [ ] Search, filtering, page movement, and page-local grouping work together.
- [ ] Large-picker controls do not disappear as the result count shrinks.
- [ ] Same-currency and different-currency draft transitions follow the agreed rules.
- [ ] Existing submission validation and preview behavior continue to work with the target shape.

Evidence gate:

- [ ] Run the focused payment-drawer and payment-submission tests.
- [ ] `pnpm.cmd --filter @collectify/frontend typecheck`

Checkpoint: Exercise the entire drawer manually before wiring the page-level entry points.

## B6 — Customer-details orchestration

Goal: Connect both page-level and debt-row entry points to one payment workflow and one debt-creation workflow.

Likely scope:

- `apps/frontend/src/features/customers/CustomerDetailsPage.tsx`
- `apps/frontend/src/features/debts/CustomerDebtLedger.tsx`
- `apps/frontend/src/features/debts/ledger/DebtCard.tsx` only if its callback shape changes
- Customer-details and debt-ledger tests

Checklist:

- [ ] Derive payment eligibility from the already-loaded customer financial summaries; do not add an existence request.
- [ ] Show enabled `Record payment` when any summary has a positive remaining amount.
- [ ] Otherwise replace it with enabled `Add debt`; do not render a disabled payment action.
- [ ] Let the customer details page own the one payment drawer.
- [ ] Pass a small `open payment` callback into the debt ledger.
- [ ] Convert an exact debt-card schedule item into the shared payment-target shape and open directly on the form.
- [ ] Let the customer details page own the one debt-creation drawer.
- [ ] Route both header and ledger `Add debt` actions to that drawer.
- [ ] Leave debt edit and delete state inside the debt ledger.
- [ ] Preserve return focus for header, debt-card, and ledger triggers, including a stable fallback when the last eligible payment changes the header action.
- [ ] Keep payment-target state out of the customer-details URL while preserving existing debt-list URL state.

Evidence gate:

- [ ] Focused customer-details tests cover header switching and both payment entry paths.
- [ ] Focused debt-ledger tests prove edit/delete behavior and debt-list URL state did not regress.
- [ ] `pnpm.cmd --filter @collectify/frontend typecheck`

Checkpoint: Review the resulting page ownership. Remove any duplicated mutation, drawer, or return-focus state before proceeding.

## B7 — Localization, accessibility, and responsive behavior

Goal: Make the completed interaction usable through every supported language, direction, viewport, and keyboard path.

Likely scope:

- Payment, customer, and debt localization resources
- Target-picker and drawer rendered tests
- Existing logical-layout linting

Checklist:

- [ ] Add localized copy for target selection, search, statuses, result ranges, empty states, retries, pagination, plan labels, and `Change target` in every supported locale.
- [ ] Use a native labeled select for the status filter unless an existing project primitive provides equally complete semantics.
- [ ] Give debt groups semantic labels/headings.
- [ ] Include debt description in each target action's accessible name so rows remain understandable outside visual grouping.
- [ ] On large-picker entry, focus search; on simple-picker entry, focus the first target; on automatic/exact selection, focus amount.
- [ ] Keep search focus during search updates.
- [ ] After page movement, focus the result heading or first target and announce the new visible range.
- [ ] Preserve modal focus containment, Escape behavior, and return focus.
- [ ] Verify logical direction for pagination icons and layout in RTL.
- [ ] Verify long debt descriptions, translated status text, large amounts, narrow width, and 200% zoom do not hide actions or meaning.
- [ ] Keep loading, empty, and error states visually stable and distinguishable.

Evidence gate:

- [ ] Focused keyboard and focus-management tests pass.
- [ ] Localization tests pass for every supported locale.
- [ ] `pnpm.cmd --filter @collectify/frontend lint`
- [ ] Record manual narrow-width, 200% zoom, and RTL observations.

Checkpoint: Do not call accessibility complete based only on automated tests; record what was and was not manually verified.

## B8 — Cross-boundary regression verification

Goal: Prove the integrated feature works and existing debt/payment behavior remains intact.

Checklist:

- [ ] Record a payment from the customer header with one eligible target.
- [ ] Record a payment from the header after choosing among multiple debts/installments.
- [ ] Record a payment from an exact debt-card target without seeing the picker first.
- [ ] Change to a same-currency target and observe retained/revalidated amount.
- [ ] Change to a different-currency target and observe cleared amount with date/note preserved.
- [ ] Verify a paid target disappears after success and balances/header action refresh.
- [ ] Verify debt pagination, debt search URL state, debt create/edit/delete, and existing direct payment flow still work.
- [ ] Review the final diff for duplicate calculations, duplicate workflow state, unused abstractions, and out-of-scope edit-payment behavior.

Evidence gate:

- [ ] `pnpm.cmd --filter @collectify/contracts test`
- [ ] `pnpm.cmd --filter @collectify/backend test`
- [ ] `pnpm.cmd --filter @collectify/backend test:integration`
- [ ] `pnpm.cmd --filter @collectify/frontend test`
- [ ] `pnpm.cmd typecheck`
- [ ] `pnpm.cmd lint`
- [ ] `pnpm.cmd build`
- [ ] Final manual walkthrough evidence recorded below.

## Evidence log

Add one entry when a boundary closes.

### B1

- Date: 2026-10-24
- Commands: `pnpm.cmd --filter @collectify/contracts test`; `pnpm.cmd --filter @collectify/contracts lint`; `pnpm.cmd exec prettier --check packages/contracts/src/payments/payment-target.ts packages/contracts/src/payments/payment-target.test.ts packages/contracts/src/payments/index.ts`
- Result: 93 contract tests passed, backend typecheck passed, both package ESLint checks passed, and the changed files passed Prettier checks.
- Notes/remaining risk: The contract exports a flat target row with debt context, eligible state only, fixed page size `10`, query normalization, and one-payment/installment plan context. Eligible states derive from the existing payment-state schema; schedule timing is shared with debt responses and the backend timing function. Backend query semantics remain unimplemented in B3.

### B2

- Date: 2026-10-24
- Commands: `pnpm.cmd --filter @collectify/backend typecheck`; `pnpm.cmd --filter @collectify/backend lint`; `pnpm.cmd exec prettier --check apps/backend/src/payments/payment-details-by-debt.ts apps/backend/src/payments/schedule-item-payment-summary.ts`; `pnpm.cmd exec vitest run --config .\\vitest.integration.config.ts src\\debts\\debts.integration.spec.ts`
- Result: 41 debt integration tests passed, including unpaid, partially paid, fully paid, and mixed installment projections; backend typecheck, lint, and Prettier checks passed.
- Notes/remaining risk: The shared helper now owns schedule-item paid amount, remaining amount, payment count, and payment-state derivation. Debt-level window totals and response assembly remain local to the debt read. Payment-target filtering, ordering, and pagination remain for B3.

### B3

- Date: 2026-10-25
- Commands: `pnpm.cmd --filter @collectify/backend exec vitest run --config vitest.integration.config.ts src/payments/payment-targets.integration.spec.ts`; `pnpm.cmd --filter @collectify/backend typecheck`
- Result: All 9 focused payment-target integration tests passed and backend typecheck passed.
- Notes/remaining risk: The endpoint validates the shared query, enforces owner/customer scope, reads a coherent fixed-size page in a read-only repeatable-read transaction, excludes paid targets, and covers filtering, ordering, pagination, plan shape, amounts, versions, empty results, and not-found cases. The committed response intentionally omits debt-level remaining amount and full-plan item count; B5 must preserve the existing form preview without assuming those fields exist.

### B4

- Date: 2026-10-25
- Commands: `pnpm.cmd --filter @collectify/frontend exec vitest run src/features/payments/api/list-payment-targets.test.ts`; `pnpm.cmd --filter @collectify/frontend typecheck`; `pnpm.cmd --filter @collectify/frontend lint`; `pnpm.cmd exec prettier --check apps/frontend/src/features/payments/api/list-payment-targets.ts apps/frontend/src/features/payments/api/list-payment-targets.test.ts apps/frontend/src/features/payments/paymentTargetQueries.ts`
- Result: The focused frontend request test passed, frontend typecheck passed, frontend lint completed with no errors, and all changed frontend files passed Prettier.
- Notes/remaining risk: The frontend now has one typed adapter and customer-scoped React Query path. Request validation remains authoritative on the backend; the client serializes its typed query and validates the response at the HTTP boundary. Lint reports one pre-existing `react-hooks/exhaustive-deps` warning in `useDebtListView.ts`. Drawer-local query state, loading presentation, exact-target request avoidance, and rendered refresh behavior remain for B5/B8, where they can be verified through the real consumer rather than a test-only harness.

### B5

- Date:
- Commands:
- Result:
- Notes/remaining risk:

### B6

- Date:
- Commands:
- Result:
- Notes/remaining risk:

### B7

- Date:
- Commands:
- Result:
- Notes/remaining risk:

### B8

- Date:
- Commands:
- Result:
- Notes/remaining risk:

## Completion condition

Issue 140 is complete only when B1 through B8 are marked complete, every evidence gate has a recorded result, and the final implementation preserves all fixed decisions without adding payment-edit behavior or unrelated abstractions.
