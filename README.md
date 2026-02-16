# create-innovator

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

A CLI scaffolding tool that creates new projects from the Storm Reply [innovator-template](https://github.com/stormreply/innovator-template). It clones the template repository, replaces placeholder names with your project name, installs dependencies, and creates an initial commit — all in one command.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10.29.2 (or corepack will enable it automatically)
- [GitHub CLI (`gh`)](https://cli.github.com/) installed and available on your `PATH`
- A **GitHub Personal Access Token** with `repo` and `read:packages` scopes and access to the `stormreply` organization

## Usage

Run directly with pnpm:

```bash
pnpm create innovator
```

Or with npx:

```bash
npx create-innovator
```

### Options

| Flag             | Alias | Description                                                 |
| ---------------- | ----- | ----------------------------------------------------------- |
| `--name <name>`  | `-n`  | Project name (skips the interactive prompt)                 |
| `--experimental` | `-e`  | Include pre-release template versions in the version picker |

### Examples

Create a project interactively:

```bash
pnpm create innovator
```

Create a project with a specific name:

```bash
pnpm create innovator --name my-project
```

Include experimental template versions:

```bash
pnpm create innovator --experimental
```

### What happens when you run it

1. **GitHub authentication** — reads your token from `~/.npmrc` or prompts you to enter one. Validates required scopes (`repo`, `read:packages`) and access to the `stormreply` organization.
2. **Version selection** — fetches available template tags and lets you pick a version.
3. **Clone** — shallow-clones the template at the selected tag using `gh repo clone`, then re-initializes a fresh git repository.
4. **Name replacement** — replaces `innovator-template` throughout the project with your chosen name in all case variants (kebab-case, camelCase, PascalCase, Title Case).
5. **Template cleanup** — removes template-specific files that are not needed in the new project.
6. **Setup** — installs dependencies via `pnpm install`, updates test snapshots, and creates an initial commit.

If the automatic setup fails, the CLI prints the commands to run manually.

---

## Development

### Getting started

```bash
git clone git@github.com:stormreply/create-innovator.git
cd create-innovator
pnpm install
```

### Scripts

```bash
pnpm dev               # Run the CLI locally via tsx
pnpm build             # Build with tsup (outputs to dist/)
pnpm test              # Run all tests (vitest)
pnpm test:watch        # Run tests in watch mode
pnpm lint              # ESLint
pnpm format            # Prettier (write mode)
```

Run a single test file:

```bash
pnpm test -- src/scaffold/clone.test.ts
```

### Project structure

```
src/
├── cli.ts                  # Entry point — arg parsing (citty) and interactive UI (@clack/prompts)
├── cli.test.ts
├── auth/
│   ├── github.ts           # Token validation, scope + org access checks
│   ├── github.test.ts
│   ├── prompts.ts          # Interactive token input
│   ├── prompts.test.ts
│   ├── token-storage.ts    # Read/write token from ~/.npmrc
│   └── token-storage.test.ts
├── scaffold/
│   ├── clone.ts            # gh CLI check, tag fetching, shallow clone + git init
│   ├── clone.test.ts
│   ├── template.ts         # Name replacement engine + template file cleanup
│   ├── template.test.ts
│   ├── setup.ts            # pnpm install, snapshot update, initial commit
│   └── setup.test.ts
└── utils/
    ├── case.ts             # PascalCase conversion (wraps Remeda)
    ├── case.test.ts
    └── constants.ts        # GitHub org, repo, scopes, registry URL
```

### Code style

- **ESM** throughout (`"type": "module"`, `.js` extensions in imports)
- **TypeScript** with strict mode, target ES2022, NodeNext module resolution
- **Prettier**: single quotes, semicolons, trailing commas, 120 char line width
- **Dependencies** are pinned to exact versions (no `^` or `~` prefixes)

### Testing

Tests use [Vitest](https://vitest.dev/) with `globals: true` — no imports needed for `describe`, `it`, `expect`, or `vi`.

Key patterns:

- Shell commands (`child_process.execFile`) are mocked via `vi.mock('node:child_process')` with callback-style mocks
- File system operations in template tests use [`memfs`](https://github.com/nicknisi/memfs) (in-memory filesystem)
- `@clack/prompts` is mocked in most test files to suppress UI output

### Git hooks (Husky)

| Hook                 | Action                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `pre-commit`         | Runs lint-staged — ESLint + Prettier on staged `*.{js,json,md,ts}` files, vitest on related `*.ts` files |
| `prepare-commit-msg` | Launches Commitizen interactively to guide you through a conventional commit message                     |
| `commit-msg`         | Enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint                     |
| `pre-push`           | Runs the full test suite (only if working tree is clean)                                                 |

### Commits

This project follows [Conventional Commits](https://www.conventionalcommits.org/) and is [Commitizen](http://commitizen.github.io/cz-cli/) friendly. The `prepare-commit-msg` hook automatically launches Commitizen when you run `git commit`, guiding you through a structured commit message prompt — no extra commands needed.

### Releasing

Releases are managed with [release-it](https://github.com/release-it/release-it):

```bash
pnpm release
```
