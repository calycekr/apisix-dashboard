# CLAUDE.md Guidelines

## Build and Dev Commands
* Start development server: `pnpm dev`
* Run production build: `pnpm build`
* Local preview of build: `pnpm preview`

## Linting and Formatting
* Check lint errors: `pnpm lint`
* Auto-fix lint errors: `pnpm lint:fix`
* TypeScript compiler check: `pnpm exec tsc -b --pretty false`

## Testing Commands
* Run Playwright E2E tests: `pnpm e2e`
* Run targeted tests: `pnpm exec playwright test <test-file>`

## Coding Guidelines
* **Tech Stack**: React 19, TypeScript 5.8, Vite, TanStack Router, TanStack Query v5, Ant Design 6.
* **Imports**: Use `@/...` paths for internal directory imports. Order imports cleanly.
* **Routing**: Follow TanStack Router naming conventions inside `src/routes/` (e.g. `detail.$id.tsx` / `index.tsx`).
* **Components**: Prefer React functional components with explicit TypeScript typings.
* **State & Schema**: Rely on TanStack Query for remote state. Define API resource shapes using Zod schemas under `src/types/schema/apisix/`.
* **Git Commit**: Maintain a clean commit history. Amend existing commit (`git commit --amend --no-verify`) and force-push (`git push -f`) when maintaining a single initial release branch.
