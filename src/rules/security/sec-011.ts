/**
 * SEC-011: Sensitive parameters must not be exposed as HTTP headers
 *
 * The MCP spec's x-mcp-header extension maps a parameter to an
 * Mcp-Param-{name} HTTP header. Header values are visible to network
 * intermediaries (proxies, gateways, logs), so servers SHOULD NOT mark
 * sensitive parameters (passwords, API keys, tokens, PII) with
 * x-mcp-header.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';
import { isSensitiveParameter } from './sec-007.js';

const X_MCP_HEADER = 'x-mcp-header';

const rule: Rule = {
  id: 'SEC-011',
  category: 'security',
  defaultSeverity: 'error',
  specVersions: ['2026-07-28'],
  description: 'Sensitive parameters must not be exposed via x-mcp-header',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
      if (!(X_MCP_HEADER in schema)) continue;
      if (!isSensitiveParameter(name)) continue;

      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: `Sensitive parameter '${name}' is mapped to an HTTP header via x-mcp-header. Header values are visible to network intermediaries (proxies, gateways, access logs)`,
        tool: tool.name,
        path: `${path}.${X_MCP_HEADER}`,
        suggestion:
          'Remove x-mcp-header from this parameter and pass the sensitive value in the request body instead',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
