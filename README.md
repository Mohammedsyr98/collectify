# Collectify

Collectify is organized as a pnpm + Turborepo monorepo.

## Workspaces

- `apps/frontend` - React + Vite frontend
- `apps/backend` - NestJS backend
- `packages/contracts` - shared request/response contracts
- `packages/eslint-config` - shared ESLint flat configs
- `packages/typescript-config` - shared TypeScript configs

The existing `skills/` folder is intentionally not part of the pnpm workspace.

## Requirements

- Node.js `>=22.12.0`
- pnpm `11.15.1`

On Windows PowerShell, use `pnpm.cmd` if script execution policy blocks the `pnpm` shim.

## Scripts

```bash
pnpm install
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Frontend defaults to `http://localhost:5173`.
Backend defaults to `http://localhost:3000/api`.
