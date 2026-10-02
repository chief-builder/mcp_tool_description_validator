# Contributing

Thanks for helping improve the validator.

## Setup

Requires Node.js 22.18+ (`.nvmrc` pins 24).

```bash
git clone https://github.com/chief-builder/mcp_tool_description_validator.git
cd mcp_tool_description_validator
npm ci
npm run check   # lint, format check, typecheck, build, tests with coverage
```

## Making changes

- Keep pull requests small and focused, with tests for behavior changes.
  Security-relevant code (input handling, the HTTP service, live discovery)
  needs both positive and negative tests.
- New rules go in `src/rules/<category>/`, are registered in that
  category's `index.ts`, get a test file under `tests/unit/rules/`, and are
  documented in `docs/RULES.md`.
- Run `npm run format` before committing. Commit messages follow
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `docs:` …).
- Update `CHANGELOG.md` under **Unreleased** for user-visible changes.

## Reporting security issues

See [SECURITY.md](SECURITY.md). Please do not open public issues for
vulnerabilities.
