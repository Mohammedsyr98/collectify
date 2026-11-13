# Backend Architecture

This document defines the rules governing backend module dependencies. The
current executable dependency map lives in `.dependency-cruiser.mjs`.

## Module ownership

A business module owns its behavior, business decisions, and persistence
operations.

Each business module exposes a small public interface through
`src/<feature>/index.ts`.

Import rules:

- Imports within the same module remain relative.
- Imports from another business module use its public `index.ts`.
- Another module's implementation files are private.
- Public interfaces use named exports, not wildcard exports.
- Do not add forwarding wrappers solely to hide a dependency.

## Dependency direction

A dependency points from the consumer to the module that owns the required
capability:

```text
Consumer -> Owner
```

Business-module dependencies must:

- Follow capability ownership.
- Have one clear purpose.
- Remain acyclic.
- Avoid moving feature-owned behavior into Shared merely to hide an edge.

The exact dependency map is defined and enforced in `.dependency-cruiser.mjs`.
When that map changes, the architectural reason must be reviewed and recorded.

## Platform dependencies

Business modules may use platform modules such as Auth, Database, Config,
Shared, Validation, and Contracts where appropriate.

`AppModule` is the composition root responsible for wiring modules together.
`main.ts` is the framework bootstrap.

Test Support is test-only infrastructure. Production code must never import it.

## Shared domain

A capability belongs in `@collectify/domain` only when:

1. It has an independent business meaning.
2. Multiple callers need identical semantics.
3. It is pure and independent of NestJS, HTTP, Drizzle, and persistence.
4. Extraction removes meaningful duplication or an inappropriate dependency.
5. Deleting it would recreate meaningful complexity in multiple callers.

Pure code does not automatically belong in Shared. Feature-owned decisions
should remain with their owning feature.

## Architectural changes

Routine implementation changes behind an existing public interface do not
require an architectural redesign.

Changes to dependency direction, module ownership, shared abstractions, or
top-level module structure must also update the executable dependency map.

Cycles are not an acceptable solution. Choose a different ownership or
composition design instead.

## Enforcement

Run:

```sh
pnpm --filter @collectify/backend architecture
```

Backend lint runs ESLint and the architecture check. Dependency Cruiser rejects:

- Circular dependencies.
- Dependencies outside the configured module graph.
- Cross-module imports that bypass public interfaces.
- Production imports from Test Support.
