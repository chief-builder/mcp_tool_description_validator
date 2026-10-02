/**
 * MCP specification revisions supported by the validator.
 */

/** Revisions the validator can validate against and discover with. */
export const MCP_SPEC_VERSIONS = ['2025-11-25', '2026-07-28'] as const;

/** A supported MCP specification revision. */
export type MCPSpecVersion = (typeof MCP_SPEC_VERSIONS)[number];

/** Revision used when the configuration does not set one (latest). */
export const DEFAULT_MCP_SPEC_VERSION: MCPSpecVersion = '2026-07-28';

/** Revision that uses the SDK's initialization-based (legacy) discovery. */
export const LEGACY_MCP_SPEC_VERSION: MCPSpecVersion = '2025-11-25';
