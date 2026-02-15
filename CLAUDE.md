# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`create-innovator` is a CLI scaffolding tool (like `create-react-app`) that clones the Storm Reply `innovator-template` repository, replaces template names with the user's project name, and runs post-clone setup. It requires GitHub authentication to access the private template repo and package registry.

## Commands

```bash
pnpm test              # Run all tests (vitest)
pnpm test:watch        # Run tests in watch mode
pnpm test -- src/scaffold/clone.test.ts  # Run a single test file
pnpm build             # Build with tsup (outputs to dist/)
pnpm dev               # Run CLI locally via tsx
pnpm lint              # ESLint
pnpm format            # Prettier (write mode)
```

## Git Hooks (Husky)

- **pre-commit**: Runs lint-staged — eslint + prettier on staged `*.{js,json,md,ts}` files, and `vitest related` on staged `*.ts` files
- **commit-msg**: Enforces conventional commits via commitlint
- **pre-push**: Runs full test suite (only if working tree is clean)

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). The project is Commitizen-friendly (`pnpm exec cz`).

## Architecture

Entry point: `src/cli.ts` — uses `citty` for arg parsing and `@clack/prompts` for interactive UI.

**CLI flow** (sequential):

1. `ensureGitHubAuth()` — reads/prompts for GitHub PAT, validates scopes + org access, saves to `~/.npmrc`
2. `ensureGhCli()` → `selectVersion()` → `cloneTemplate()` — requires `gh` CLI, fetches tags via Octokit, shallow-clones at selected tag, re-inits git
3. `replaceTemplateNames()` — replaces `innovator-template` in all text files with the project name (kebab-case, camelCase, PascalCase, Title Case variants)
4. `setupProject()` — installs deps via pnpm and updates test snapshots; **never throws** (failures show manual instructions instead)

**Key modules:**

- `src/auth/` — GitHub token validation, storage (`~/.npmrc`), and prompting
- `src/scaffold/` — clone, template replacement, and post-clone setup
- `src/utils/constants.ts` — GitHub org/repo/scope constants
- `src/utils/case.ts` — PascalCase conversion (wraps Remeda)

## Testing Patterns

- Tests use vitest with `globals: true` (no imports needed for `describe`, `it`, `expect`, `vi`)
- Shell commands (`child_process.execFile`) are mocked via `vi.mock('node:child_process')` with callback-style mocks that invoke the callback argument
- File system operations in `template.test.ts` use `memfs` (in-memory filesystem via `vi.mock('node:fs/promises')`)
- `@clack/prompts` is mocked in most test files to suppress UI output

## Code Style

- ESM throughout (`"type": "module"`, `.js` extensions in imports)
- TypeScript with strict mode, target ES2022, NodeNext module resolution
- Prettier: single quotes, semicolons, trailing commas, 120 char width
- Dependencies are pinned to exact versions (no `^` or `~` prefixes)
