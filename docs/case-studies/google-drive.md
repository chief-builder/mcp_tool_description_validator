# Case Study: Google Drive MCP Server

This case study records a real-world validation run against Google's managed
Drive MCP server. It is an evidence snapshot, not a permanent certification of
the server: the endpoint is in Developer Preview and its tool definitions can
change.

## Run metadata

| Field | Value |
|---|---|
| Observed | 2026-08-05 (baseline and follow-up); re-run 2026-10-02 |
| Validator | 0.1.0 at commit `6bc392b` (then named `mcp-tool-validator`); 0.2.0 for the re-run |
| Endpoint | `https://drivemcp.googleapis.com/mcp/v1` |
| Server owner | Google |
| Server status | Developer Preview |
| Access | Public `tools/list` metadata only |
| Drive authorization | Not requested |
| Tool execution | None |
| Tools discovered | 8 |

Google documents this endpoint and its toolset in the
[Drive MCP reference](https://developers.google.com/workspace/drive/api/reference/mcp).

## Reproduction

The documented public discovery request returned tool definitions without
accessing a user's Drive:

```bash
curl --location 'https://drivemcp.googleapis.com/mcp/v1' \
  --header 'content-type: application/json' \
  --header 'accept: application/json, text/event-stream' \
  --data '{"method":"tools/list","jsonrpc":"2.0","id":1}'
```

The validator's 2026-07-28 live path was attempted first:

```bash
node ./dist/cli.js \
  --server 'https://drivemcp.googleapis.com/mcp/v1' \
  --verbose --no-color
```

At the time of the run, Google returned HTTP 400 with `Unsupported protocol
version` when the client declared MCP `2026-07-28`. Explicit legacy discovery
succeeded:

```bash
node ./dist/cli.js \
  --server 'https://drivemcp.googleapis.com/mcp/v1' \
  --spec-version 2025-11-25 \
  --verbose --no-color
```

The initial validator version coupled live discovery and rule targeting, so the
first 2026-07-28 rule pass used the library's `validate()` function directly.
That limitation led to LIVE-001 and is now resolved with independent CLI and
configuration options.

## Results

The legacy-discovery run and the direct 2026-07-28 rule run produced the same
governance result. These figures were recorded by hand on 2026-08-05; the raw
output of that run was not retained, so they cannot be re-derived from the
repository.

| Measure | Result |
|---|---:|
| Tools analyzed | 8 |
| Tools passing the default error threshold | 0 |
| Errors | 20 |
| Warnings | 32 |
| Suggestions | 22 |
| Maturity score | 77/100 |
| Maturity level | Mature |

The eight discovered tools were `copy_file`, `create_file`,
`download_file_content`, `get_file_metadata`, `get_file_permissions`,
`list_recent_files`, `read_file_content`, and `search_files`.

### Findings by rule

| Rule | Severity | Count | Observation |
|---|---|---:|---|
| SEC-001 | Error | 15 | String schemas omit `maxLength` |
| SEC-004 | Error | 5 | `fileId` was incorrectly inferred to be a filesystem path |
| SCH-007 | Warning | 3 | Schemas with intentionally optional inputs omit `required` |
| SEC-003 | Warning | 2 | Numeric page sizes lack explicit bounds |
| SEC-006 | Warning | 1 | Drive's structured `query` was mistaken for a command parameter |
| SEC-007 | Warning | 2 | Pagination tokens were treated as potentially sensitive |
| SEC-010 | Warning | 1 | Structured Drive query syntax was mistaken for executable code |
| LLM rules | Mixed | 27 | Primarily long descriptions, abbreviations, and ambiguous wording |
| Best-practice rules | Suggestion | 10 | Primarily missing display titles and response-format controls |

The rows above sum to 66 of the 74 findings in the totals; the remaining eight
were not itemized in the original notes.

The 2026-07-28-only rules SCH-009, SCH-010, and SEC-011 produced no findings.
The schemas loaded successfully, including their input schemas, output schemas,
annotations, local `$ref` usage, and pagination shapes.

## Interpretation

`0/8 tools valid` means none passed this project's default governance error
threshold. It does **not** mean that all eight tools violate the MCP
specification. In this run:

- The `maxLength` failures reflect a strict validator security policy, not a
  required MCP tool-schema keyword.
- The `fileId` path findings are false positives and demonstrate that opaque
  resource identifiers need to be distinguished from filesystem paths.
- The pagination-token and structured-query findings need more contextual
  heuristics.
- The 77/100 Mature score better represents the overall quality signal than the
  binary validity count for this server.

## Requirements derived from the exercise

This run produced six follow-up requirements for the validator:

1. Separate the protocol revision used for live discovery from the MCP revision
   used to validate returned definitions.
2. Distinguish specification violations, configurable governance policy, and
   heuristic advice in reports.
3. Make security heuristics schema-aware so identifiers, pagination tokens, and
   structured query languages are not classified by name alone.
4. Provide actionable protocol-version diagnostics without silently
   downgrading a connection.
5. Add validation profiles or severity calibration so strict input-bound policy
   can be enabled without presenting it as base MCP noncompliance.
6. Record reproducibility metadata for real-server evidence, including endpoint,
   observation time, validator version, discovery revision, validation revision,
   authentication scope, and whether any tools were executed.

These requirements are specified with acceptance criteria in
[the validator specification](../specs/validator.md#live-server-validation-requirements).

## Post-implementation verification

After implementing LIVE-001 through LIVE-006, the same endpoint was checked
again with one reproducible command:

```bash
node ./dist/cli.js \
  --server 'https://drivemcp.googleapis.com/mcp/v1' \
  --discovery-spec-version 2025-11-25 \
  --spec-version 2026-07-28 \
  --profile compliance \
  --format json --no-color
```

| Measure | Follow-up (2026-08-05) | Re-run (2026-10-02) |
|---|---:|---:|
| Tools analyzed | 8 | 8 |
| MCP compliant | Yes | Yes |
| Tools passing the compliance profile | 8 | 8 |
| Errors | 0 | 0 |
| Warnings | 43 | 48 |
| Suggestions | 22 | 17 |
| Specification findings | 0 | 0 |
| Governance findings | 38 | 36 |
| Heuristic findings | 27 | 29 |
| Maturity score | 87/100 | 86/100 |
| Maturity level | Mature | Mature |

The 2026-08-05 follow-up figures were recorded by hand and its JSON report was
not retained. The 2026-10-02 re-run used the same command with validator
0.2.0; its complete output is committed as
[evidence/google-drive-2026-10-02.json](evidence/google-drive-2026-10-02.json).
Both reports recorded the endpoint, both MCP revisions, the compliance profile,
authentication scope (`none`), and `toolExecutionPerformed: false`. The
same eight tools were discovered both times. The differences between the two
columns have not been attributed: Google may have changed the tool
definitions, and validator rules changed between the two versions.

On 2026-10-02 the default 2026-07-28 discovery path (no
`--discovery-spec-version`) also succeeded against this endpoint and produced
the same result, so the HTTP 400 described above no longer reproduces.

The original findings remain above as a baseline demonstrating why the new
requirements were needed.
