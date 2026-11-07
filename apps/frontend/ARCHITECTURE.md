# Frontend architecture contract

This document is the living placement and dependency contract for the
Collectify frontend. The executable checks live in `steiger.config.ts` and run
through `pnpm lint`; this document explains the intent behind those checks.

## Dependency direction

The frontend uses the following pragmatic Feature-Sliced Design direction:

```text
App -> Pages -> Features -> Entities -> Shared
```

A module may depend on a strictly lower layer. It may not depend on a higher
layer or on another slice on the same layer. `App` and `Shared` are not split
into business-domain slices.

The current frontend is still being migrated. Existing legacy boundaries are
listed explicitly in `steiger.config.ts`; those entries are temporary and must
be removed by the follow-up migration ticket that owns each boundary. New
slices and new files must follow the rules below immediately.

The current legacy feature slices and Shared segments also have a temporary
public-interface-existence exception because they predate this contract. That
exception only suppresses the missing-`index.ts` diagnostic; it does not grant
permission for new import violations. New slices must provide a real named
public interface from their first commit.

Four existing App-localization files retain their original relative imports to
Shared. They are listed as exact legacy files in `steiger.config.ts`; new App
files must use the `@/*` alias for cross-layer imports.

## Layer responsibilities

- **App** owns application initialization, providers, route registration, and
  localization assembly.
- **Pages** own route-ready screens and compose Features and Entities. A Page
  does not construct requests, manage mutation retries, translate backend
  errors, or manipulate query-key shapes.
- **Features** own user workflows such as customer editing, debt management,
  and recording a payment. A Feature owns its draft/form state, validation
  mapping, request lifecycle, feedback, focus behavior, and workflow-specific
  localization.
- **Entities** own stable business data and read behavior. Customer and Debt
  Entities own reusable reads, query/cache identity, and semantic cache
  operations. They do not own forms, dialogs, toasts, navigation, or workflow
  retries.
- **Shared** owns generic HTTP transport and error parsing, UI primitives,
  localization infrastructure and formatters, URL helpers, and generic test
  support. Shared does not own customer, debt, or payment behavior.

Request/response contracts remain in `packages/contracts`. Stable reusable
resource reads belong to their Entity; action-specific mutations and
workflow-only reads belong to their Feature.

## Slices and public interfaces

Every Page, Feature, and Entity exposes one deliberate public interface. Shared
exposes interfaces per meaningful segment. Public interfaces use named exports
and do not use wildcard exports.

Callers import only through the target slice's public interface. They do not
deep-import another slice's `ui`, `model`, `api`, localization, or test files.
Code within a slice imports its own implementation with relative imports.

Cross-slice imports use the frontend source alias:

```ts
import { CustomerDetailsPage } from '@/pages/customer-details';
```

Same-slice imports remain relative:

```ts
import { mapDomainIssue } from '../model/mapDomainIssue';
```

Pages compose multiple Features when a route needs multiple workflows. Features
do not import other Features. Ordinary Entity-to-Entity imports are also
forbidden; a later concrete exception must be documented separately.

## Ownership rules

Keep route-specific tables, summaries, ledgers, and composition in the owning
Page until genuine reuse appears. Keep form drafts and workflow presentation
state in the owning Feature. Keep stable business data and cache behavior in
Entities. Keep rendering-module props beside the rendering module unless a
concept is shared within the slice.

Do not create top-level `data`, `domain`, `useCases`, `workflows`, or Widgets
layers during this migration. `ui`, `model`, `api`, `lib`, and localization
segments are optional; they are added only when they improve navigation for a
slice with enough code of distinct purposes.

## Validation and localization

Domain validation returns stable issue codes and structural targets. The
owning Feature maps them to form fields and localized messages. Entities do not
know React Hook Form paths, translated strings, toasts, dialogs, or focus
restoration.

Slice-specific localization moves with its Page or Feature. App assembles the
locale resources; Shared contains only generic localization infrastructure and
formatters.

## Tests

Tests obey the same dependency direction as production code. Page tests verify
rendered route behavior through public interfaces and mock HTTP at the MSW
boundary. Feature tests cover complex workflow behavior when they provide
cheaper diagnosis. Entity tests verify observable query/cache behavior, not raw
query-key tuple shapes. Fixtures and render helpers stay with their owning
slice unless they are genuinely generic Shared infrastructure.

## Migration and coordination

This bootstrap is behavior-preserving. It does not redesign routes, copy,
accessibility, localization, backend contracts, persistence, or customer,
debt, and payment behavior.

The payment-lifecycle work in issues #140-#149 overlaps with the customer
details, payment drawer, debt constraints, cache, localization, and test
boundaries being migrated. Do not run incompatible payment-lifecycle changes
concurrently with the follow-up migration tickets that move those files.
