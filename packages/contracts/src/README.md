# Contract Module Structure

`@collectify/contracts` is the shared interface between apps. Consumers should
import from the package root:

```ts
import { ownerSignInRequestSchema } from '@collectify/contracts';
```

Do not import from deep paths in app code.

## Placement Rules

- Put workflow contracts in the feature folder and workflow file.
  - Example: owner sign-in belongs in `auth/owner-sign-in.ts`.
- Keep each workflow contract cohesive: request schema, success response schema,
  allowed error codes, error schemas, and inferred types live together.
- Put shared auth validation message codes in `auth/validation-codes.ts`.
- Put shared auth API error code vocabulary in `auth/api-error-codes.ts`.
- Put reusable domain/value schemas under the resource they describe.
  - Example: owner profile values belong in `owner-profile/owner-profile.ts`.
- Re-export public contracts through folder indexes and then `src/index.ts`.

When adding a new contract, start from the workflow/resource name rather than the
technical artifact type. Avoid folders like `schemas/`, `responses/`, or
`errors/` that split one workflow interface across multiple places.
