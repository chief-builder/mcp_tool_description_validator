# Examples

Use these files to smoke-test the CLI and to understand what the validator rewards.

```bash
npm run build
node ./dist/cli.js examples/polished-tools.json
node ./dist/cli.js examples/polished-tools.json --profile compliance --format json
node ./dist/cli.js examples/needs-work-tools.json --verbose
node ./dist/cli.js examples/needs-work-tools.json --format sarif > validation.sarif
```

- `polished-tools.json` is a small, high-scoring manifest with annotations, bounded inputs, required arrays, and output schemas.
- `needs-work-tools.json` intentionally demonstrates naming, description, schema, security, and best-practice issues.

Current reports distinguish MCP `compliant` status from the active profile's
`valid` threshold and tag every issue with `specification`, `governance`, or
`heuristic` provenance.
