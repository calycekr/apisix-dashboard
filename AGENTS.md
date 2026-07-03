# Repository Guidelines

## What This Repository Builds

This repository builds the Next-Gen APISIX Dashboard: a React + TypeScript
single-page application for operating an Apache APISIX gateway through the
APISIX Admin API. It is the browser UI for configuring gateway traffic, backend
targets, plugins, TLS certificates, consumers, credentials, and operational
metadata.

The dashboard is Admin API driven. UI forms, tables, raw JSON editors, import
and export flows, and topology views should reflect the real APISIX resource
payloads instead of inventing dashboard-only resource shapes. When behavior is
unclear, prefer the Admin API schema and existing endpoint wrappers over local
presentation assumptions.

Primary managed resources include Routes, Stream Routes, Services, Upstreams,
Consumers, Consumer Groups, SSLs, Global Rules, Plugin Configs, Plugin Metadata,
Secrets, and Protos. Supporting screens include the overview dashboard, raw API
access, export/import, and topology visualization.

The frontend stack is Vite, React 19, TypeScript, TanStack Router, TanStack
Query, Ant Design, React Hook Form, Zod, Axios, Monaco Editor, and Playwright
for end-to-end coverage.

## Where To Make Changes

- `src/routes/`: page views and TanStack Router files. Resource pages usually have
  `index.tsx`, `add.tsx`, and `detail.$id.tsx` variants.
- `src/apis/`: typed request wrappers around Admin API endpoints.
- `src/components/page/`: reusable page widgets such as `RawDrawer`, delete buttons,
  search controls, and expanded rows.
- `src/components/form-slice/`: resource-specific form sections.
- `src/types/schema/apisix/`: Zod schemas and inferred APISIX resource types.
- `e2e/tests/`: Playwright coverage. Use `e2e/pom/` and `e2e/utils/` helpers before
  adding new selectors.

## Development Commands

- `pnpm dev`: start Vite for local UI development.
- `pnpm build`: run `tsc -b` and create a production build.
- `pnpm lint`: run ESLint with zero warnings.
- `pnpm lint:fix`: apply lint fixes.
- `pnpm e2e`: run Playwright tests. Start a target server first or set
  `E2E_TARGET_URL`; the default is `http://localhost:9180/ui/`.

## Implementation Rules

Prefer existing resource patterns over new abstractions. For example, when adding a
RAW action to a resource list, pass the row value as `initialData`, call `refetch`
through `onSaved`, and keep payload cleanup in shared utilities when possible.

Do not send read-only fields such as `id`, `create_time`, or `update_time`
unless an API wrapper requires them. Check the schema and wrapper before changing
PUT/PATCH behavior.

Use `@/...` imports, React function components, `PascalCase` component names, and
`camelCase` utilities. Route filenames must follow TanStack Router conventions such
as `detail.$id.tsx`.

## Testing Expectations

For narrow UI edits, run targeted lint plus `pnpm exec tsc -b --pretty false`.
For shared components, API payload handling, or CRUD behavior, also run
`pnpm build` and relevant Playwright specs.

## Commit And PR Notes

Recent commits use concise Conventional Commit-style subjects, for example
`fix: align raw drawer and pin raw column to right` or
`feat(raw-drawer): add explicit save success/failure feedback in drawer`.
PRs should describe changed resource behavior, list verification commands, and
include screenshots or recordings for visible UI changes.

Do not push work directly to `origin/master`. Use a working tree branch for each
self-contained unit of work. After completing and verifying the unit, commit it
on that branch, push the branch to `origin`, open a pull request targeting
`master`, and use the PR merge flow to land it into `origin/master`.

Keep each PR focused on one coherent change. Do not defer completed work into a
larger later batch unless the user explicitly requests that. After the PR is
created, enable automatic merge when repository rules allow it; otherwise merge
through the PR once checks and required review conditions are satisfied. Delete
the source branch after the PR has been merged.

## Security And Configuration

Never commit Admin API keys, local tokens, or `.env.local` values. Treat
`docker-compose.yml`, `e2e/server/apisix_conf.yml`, `src/config/constant.ts`, and
request interceptor changes as sensitive because they affect APISIX connectivity
and authentication.
