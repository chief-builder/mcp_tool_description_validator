import type { ValidationResult, ValidationIssue } from '../types/index.js';

/**
 * SARIF 2.1.0 output format
 * https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */
export interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri?: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration?: {
    level: 'error' | 'warning' | 'note';
  };
}

export interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri?: string };
    };
    logicalLocations?: Array<{
      name?: string;
      kind?: string;
      fullyQualifiedName?: string;
    }>;
  }>;
}

/**
 * Map severity to SARIF level
 */
function severityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    default: return 'note';
  }
}

/**
 * Format validation results as SARIF 2.1.0
 */
export function formatSarifOutput(result: ValidationResult): string {
  // Collect unique rules from all issues
  const uniqueRules = new Map<string, ValidationIssue>();
  for (const toolResult of result.tools) {
    for (const issue of toolResult.issues) {
      if (!uniqueRules.has(issue.id)) {
        uniqueRules.set(issue.id, issue);
      }
    }
  }

  const rules: SarifRule[] = Array.from(uniqueRules.values()).map(issue => ({
    id: issue.id,
    name: issue.id,
    shortDescription: { text: issue.message },
    defaultConfiguration: {
      level: severityToSarifLevel(issue.severity),
    },
  }));

  const results: SarifResult[] = [];
  for (const toolResult of result.tools) {
    for (const issue of toolResult.issues) {
      results.push({
        ruleId: issue.id,
        level: severityToSarifLevel(issue.severity),
        message: { text: issue.message },
        locations: [{
          logicalLocations: [{
            name: issue.tool,
            kind: 'tool',
            fullyQualifiedName: issue.path ? `${issue.tool}.${issue.path}` : issue.tool,
          }],
        }],
      });
    }
  }

  const sarif: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'mcp-tool-validator',
          version: result.metadata.validatorVersion,
          informationUri: 'https://github.com/example/mcp-tool-validator',
          rules,
        },
      },
      results,
    }],
  };

  return JSON.stringify(sarif, null, 2);
}
