# Security Policy

## Supported versions

The project is pre-1.0. Only the latest release on the default branch
receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on this repository
([direct link](https://github.com/chief-builder/mcp_tool_description_validator/security/advisories/new)).
Do not open a public issue.

Include the affected version or commit, steps to reproduce, and the impact
you observed. You should get an acknowledgement within 7 days. Fixes are
released as soon as practical, and reporters are credited unless they
prefer otherwise.

## Security model

Things that are intended behavior, not vulnerabilities:

- `mcp-validate --server "<command>"` **runs that command** to talk to a
  stdio MCP server. Only validate servers you trust to run on your machine.
  The server receives a minimal environment (`HOME`, `LOGNAME`, `PATH`,
  `SHELL`, `TERM`, `USER` on macOS/Linux), not your API keys.
- `mcp-validate serve` has **no authentication**. It binds to `localhost`
  by default; do not expose it to untrusted networks. Requests cannot
  change the server's LLM settings, are limited in size, and do not receive
  CORS headers.
- Tool definitions are untrusted input. Rule traversal is depth- and
  node-bounded, and human-readable output strips terminal control
  characters. Ways around these bounds are in scope and welcome.
