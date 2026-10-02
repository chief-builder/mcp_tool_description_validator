/**
 * MCP Client Module
 *
 * Connects to live MCP servers via STDIO or HTTP transport
 * to retrieve tool definitions.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { spawn } from 'node:child_process';
import type { ToolDefinition, ToolSource } from '../types/index.js';
import { PACKAGE_NAME, VERSION } from '../version.js';
import {
  DEFAULT_MCP_SPEC_VERSION,
  LEGACY_MCP_SPEC_VERSION,
  type MCPSpecVersion,
} from '../core/spec-versions.js';

/** Revision that uses stateless per-request metadata for discovery. */
const MODERN_PROTOCOL_VERSION: MCPSpecVersion = DEFAULT_MCP_SPEC_VERSION;
const HEADER_MISMATCH_CODE = -32020;
const UNSUPPORTED_PROTOCOL_VERSION_CODE = -32022;

/** Default per-operation timeout for live discovery, in milliseconds. */
export const DEFAULT_DISCOVERY_TIMEOUT_MS = 30_000;
/** Maximum tools/list pages followed before discovery is aborted. */
export const MAX_DISCOVERY_PAGES = 100;
/** Maximum size of a single HTTP discovery response body, in bytes. */
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
/** Maximum characters of server output quoted in error messages. */
const MAX_QUOTED_OUTPUT = 2000;

/** Trim server-provided text before quoting it in an error message. */
function quoteServerOutput(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_QUOTED_OUTPUT
    ? `…${trimmed.slice(-MAX_QUOTED_OUTPUT)}`
    : trimmed;
}

function tooManyPagesError(): Error {
  return new Error(
    `MCP tools/list pagination exceeded ${MAX_DISCOVERY_PAGES} pages; aborting discovery`
  );
}

/** Read a response body as text, refusing bodies over MAX_RESPONSE_BYTES. */
async function readBoundedText(response: Response): Promise<string> {
  const tooLarge = () =>
    new Error(`MCP server response exceeded ${MAX_RESPONSE_BYTES} bytes`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw tooLarge();
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** A structured JSON-RPC error returned by a modern MCP server. */
export class MCPProtocolError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'MCPProtocolError';
  }
}

/** The server does not support the requested MCP protocol revision. */
export class UnsupportedProtocolVersionError extends MCPProtocolError {
  public readonly supportedVersions: string[];
  public readonly requestedVersion: string;

  constructor(
    message: string,
    data: { supported: string[]; requested: string }
  ) {
    const compatibilityHint = data.supported.includes(LEGACY_MCP_SPEC_VERSION)
      ? ` Retry explicitly with --discovery-spec-version ${LEGACY_MCP_SPEC_VERSION}; the validator will not silently downgrade.`
      : data.supported.length > 0
        ? ` Supported versions: ${data.supported.join(', ')}.`
        : '';
    super(
      `MCP server rejected discovery protocol ${data.requested}: ${message}.${compatibilityHint}`,
      UNSUPPORTED_PROTOCOL_VERSION_CODE,
      data
    );
    this.name = 'UnsupportedProtocolVersionError';
    this.supportedVersions = data.supported;
    this.requestedVersion = data.requested;
  }
}

/** Mirrored HTTP request headers did not match the JSON-RPC body. */
export class HeaderMismatchError extends MCPProtocolError {
  constructor(message: string, data?: unknown) {
    super(
      `MCP server rejected request metadata: ${message}`,
      HEADER_MISMATCH_CODE,
      data
    );
    this.name = 'HeaderMismatchError';
  }
}

/**
 * Represents an active MCP connection.
 */
export interface MCPConnection {
  /** The MCP client instance */
  client: Client;
  /** The transport layer (STDIO or HTTP) */
  transport: Transport;
}

/**
 * Configuration for connecting to an MCP server.
 */
export interface ServerConfig {
  /** Server URL (http/https) or command to execute (for stdio) */
  server: string;
  /** Optional per-operation timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Protocol revision used to retrieve tools (default: legacy 2025-11-25). */
  specVersion?: MCPSpecVersion;
}

/**
 * Detect if a server string represents an HTTP URL or a STDIO command.
 *
 * @param server - The server string to analyze
 * @returns true if HTTP/HTTPS URL, false for STDIO command
 */
function isHttpServer(server: string): boolean {
  return server.startsWith('http://') || server.startsWith('https://');
}

/**
 * Split a command string into command + args, honoring single- and
 * double-quoted segments (e.g. `node "my server.js" --flag`).
 */
export function parseCommand(command: string): string[] {
  const parts: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(command)) !== null) {
    parts.push(match[1] ?? match[2] ?? match[3]);
  }
  return parts;
}

function modernListToolsRequest(id = 1, cursor?: string) {
  return {
    jsonrpc: '2.0' as const,
    id,
    method: 'tools/list',
    params: {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientInfo': {
          name: PACKAGE_NAME,
          version: VERSION,
        },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
      ...(cursor !== undefined ? { cursor } : {}),
    },
  };
}

interface ModernToolsPage {
  tools: Record<string, unknown>[];
  nextCursor?: string;
  ttlMs: number;
  cacheScope: 'public' | 'private';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseProtocolError(value: unknown): MCPProtocolError {
  if (!isRecord(value)) {
    throw new Error('MCP JSON-RPC error must be an object');
  }
  if (typeof value.code !== 'number' || !Number.isInteger(value.code)) {
    throw new Error('MCP JSON-RPC error code must be an integer');
  }
  if (typeof value.message !== 'string' || value.message.length === 0) {
    throw new Error('MCP JSON-RPC error message must be a non-empty string');
  }

  const code = value.code as number;
  if (code === UNSUPPORTED_PROTOCOL_VERSION_CODE) {
    if (!isRecord(value.data)) {
      throw new Error(
        'UnsupportedProtocolVersionError data must be an object'
      );
    }
    if (
      !Array.isArray(value.data.supported) ||
      value.data.supported.some((version) => typeof version !== 'string')
    ) {
      throw new Error(
        'UnsupportedProtocolVersionError data.supported must be an array of strings'
      );
    }
    if (typeof value.data.requested !== 'string') {
      throw new Error(
        'UnsupportedProtocolVersionError data.requested must be a string'
      );
    }
    return new UnsupportedProtocolVersionError(value.message, {
      supported: value.data.supported as string[],
      requested: value.data.requested,
    });
  }
  if (code === HEADER_MISMATCH_CODE) {
    return new HeaderMismatchError(value.message, value.data);
  }
  return new MCPProtocolError(
    `MCP server returned ${code}: ${value.message}`,
    code,
    value.data
  );
}

function parseModernResponse(value: unknown, expectedId: number): ModernToolsPage {
  if (!isRecord(value)) {
    throw new Error('MCP server returned a non-object JSON-RPC response');
  }
  const response = value;
  if (response.jsonrpc !== '2.0') {
    throw new Error('MCP server response jsonrpc must be exactly "2.0"');
  }
  if (response.id !== expectedId) {
    throw new Error(
      `MCP server returned response id ${String(response.id)}; expected ${expectedId}`
    );
  }
  const hasResult = Object.hasOwn(response, 'result');
  const hasError = Object.hasOwn(response, 'error');
  if (hasResult === hasError) {
    throw new Error(
      'MCP JSON-RPC response must contain exactly one of result or error'
    );
  }
  if (hasError) {
    throw parseProtocolError(response.error);
  }
  const result = response.result;
  if (!isRecord(result)) {
    throw new Error('MCP tools/list response is missing a result object');
  }
  // The finalized specification requires current servers to include resultType,
  // while also requiring clients to interpret an absent value as "complete"
  // for responses produced by earlier protocol versions.
  const resultType = result.resultType ?? 'complete';
  if (resultType !== 'complete') {
    throw new Error(
      `MCP tools/list response resultType "${String(resultType)}" is not supported; expected "complete"`
    );
  }
  if (
    typeof result.ttlMs !== 'number' ||
    !Number.isInteger(result.ttlMs) ||
    result.ttlMs < 0
  ) {
    throw new Error(
      'MCP completed tools/list response ttlMs must be a non-negative integer'
    );
  }
  if (result.cacheScope !== 'public' && result.cacheScope !== 'private') {
    throw new Error(
      'MCP completed tools/list response cacheScope must be "public" or "private"'
    );
  }
  const tools = result.tools;
  if (!Array.isArray(tools)) {
    throw new Error('MCP tools/list response is missing a tools array');
  }
  if (
    tools.some(
      (tool) => typeof tool !== 'object' || tool === null || Array.isArray(tool)
    )
  ) {
    throw new Error('MCP tools/list response contains a non-object tool definition');
  }
  const nextCursor = result.nextCursor;
  if (nextCursor !== undefined && typeof nextCursor !== 'string') {
    throw new Error('MCP tools/list response nextCursor must be a string');
  }
  return {
    tools: tools as Record<string, unknown>[],
    ...(nextCursor !== undefined ? { nextCursor } : {}),
    ttlMs: result.ttlMs,
    cacheScope: result.cacheScope,
  };
}

/** Parse JSON-RPC messages from an SSE response and return the final response. */
export function parseSseResponse(text: string): unknown {
  const eventData = text
    .split(/\r?\n\r?\n/)
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n')
    )
    .filter(Boolean);

  for (let index = eventData.length - 1; index >= 0; index--) {
    try {
      const value = JSON.parse(eventData[index]);
      if (
        typeof value === 'object' &&
        value !== null &&
        ('result' in value || 'error' in value)
      ) {
        return value;
      }
    } catch {
      // Ignore malformed notification data while looking for the final response.
    }
  }
  throw new Error('MCP SSE response did not contain a final JSON-RPC response');
}

function toServerToolDefinition(
  raw: Record<string, unknown>,
  server: string
): ToolDefinition {
  const source: ToolSource = {
    type: 'server',
    location: server,
    raw,
  };
  const annotations = raw.annotations;

  return {
    name: raw.name as string,
    title: raw.title as ToolDefinition['title'],
    description: raw.description as ToolDefinition['description'],
    icons: raw.icons as ToolDefinition['icons'],
    inputSchema: raw.inputSchema as Record<string, unknown>,
    outputSchema: raw.outputSchema as ToolDefinition['outputSchema'],
    _meta: raw._meta as ToolDefinition['_meta'],
    annotations: annotations as ToolDefinition['annotations'],
    source,
  };
}

async function fetchModernToolsOverHttp(
  server: string,
  timeout: number
): Promise<ToolDefinition[]> {
  const tools: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let cacheScope: ModernToolsPage['cacheScope'] | undefined;
  let id = 1;

  do {
    if (id > MAX_DISCOVERY_PAGES) throw tooManyPagesError();
    const response = await fetch(server, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': MODERN_PROTOCOL_VERSION,
        'Mcp-Method': 'tools/list',
      },
      body: JSON.stringify(modernListToolsRequest(id, cursor)),
      signal: AbortSignal.timeout(timeout),
      // Never replay the request (and its headers) to a redirect target.
      redirect: 'error',
    });
    const body = await readBoundedText(response);
    if (!response.ok) {
      let envelopeError: unknown;
      let parsedErrorBody: unknown;
      try {
        parsedErrorBody = JSON.parse(body) as unknown;
        parseModernResponse(parsedErrorBody, id);
      } catch (error) {
        if (error instanceof MCPProtocolError) {
          throw error;
        }
        envelopeError = error;
      }
      if (
        isRecord(parsedErrorBody) &&
        parsedErrorBody.jsonrpc === '2.0' &&
        envelopeError instanceof Error
      ) {
        throw new Error(
          `MCP server returned HTTP ${response.status} with an invalid JSON-RPC error response: ${envelopeError.message}`
        );
      }
      // Preserve an actionable diagnostic for older or non-conforming servers
      // that return an unstructured protocol-version error body.
      if (/unsupported protocol version/i.test(body)) {
        throw new Error(
          `MCP server rejected discovery protocol ${MODERN_PROTOCOL_VERSION}: ${quoteServerOutput(body)}. ` +
          'Retry explicitly with --discovery-spec-version 2025-11-25; the validator will not silently downgrade.'
        );
      }
      if (envelopeError instanceof Error) {
        throw new Error(
          `MCP server returned HTTP ${response.status} with an invalid JSON-RPC error response: ${envelopeError.message}`
        );
      }
      throw new Error(
        `MCP server returned HTTP ${response.status}: ${quoteServerOutput(body)}`
      );
    }
    const contentType = response.headers.get('content-type') ?? '';
    const parsed = contentType.includes('text/event-stream')
      ? parseSseResponse(body)
      : JSON.parse(body);
    const page = parseModernResponse(parsed, id);
    if (cacheScope !== undefined && page.cacheScope !== cacheScope) {
      throw new Error(
        `MCP paginated tools/list response changed cacheScope from "${cacheScope}" to "${page.cacheScope}"`
      );
    }
    cacheScope = page.cacheScope;
    tools.push(...page.tools);
    cursor = page.nextCursor;
    id++;
  } while (cursor !== undefined);

  return tools.map((tool) => toServerToolDefinition(tool, server));
}

async function fetchModernToolsOverStdio(
  server: string,
  timeout: number
): Promise<ToolDefinition[]> {
  const parts = parseCommand(server);
  if (parts.length === 0) throw new Error(`Empty server command: "${server}"`);

  return new Promise((resolve, reject) => {
    // Like the SDK's stdio transport, pass only a minimal inherited
    // environment so the server under test does not receive the caller's
    // API keys and tokens.
    const child = spawn(parts[0], parts.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: getDefaultEnvironment(),
    });
    let stdoutBuffer = '';
    let stderr = '';
    let settled = false;
    let requestId = 1;
    const tools: Record<string, unknown>[] = [];
    let cacheScope: ModernToolsPage['cacheScope'] | undefined;

    const finish = (
      action: () => void
    ): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      action();
    };

    const inspectLine = (line: string): void => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        if (parsed?.id !== requestId) return;
        const page = parseModernResponse(parsed, requestId);
        if (cacheScope !== undefined && page.cacheScope !== cacheScope) {
          throw new Error(
            `MCP paginated tools/list response changed cacheScope from "${cacheScope}" to "${page.cacheScope}"`
          );
        }
        cacheScope = page.cacheScope;
        tools.push(...page.tools);
        if (page.nextCursor !== undefined) {
          if (requestId >= MAX_DISCOVERY_PAGES) throw tooManyPagesError();
          requestId++;
          child.stdin.write(
            `${JSON.stringify(modernListToolsRequest(requestId, page.nextCursor))}\n`
          );
          return;
        }
        finish(() =>
          resolve(tools.map((tool) => toServerToolDefinition(tool, server)))
        );
      } catch (error) {
        finish(() => reject(error));
      }
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Connection to MCP server timed out after ${timeout}ms${stderr ? `: ${quoteServerOutput(stderr)}` : ''}`
          )
        )
      );
    }, timeout);

    child.on('error', (error) => finish(() => reject(error)));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      let newlineIndex = stdoutBuffer.indexOf('\n');
      while (newlineIndex !== -1 && !settled) {
        const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        inspectLine(line);
        newlineIndex = stdoutBuffer.indexOf('\n');
      }
    });
    child.stderr.on('data', (chunk: string) => {
      // Keep only the tail; it is quoted in error messages.
      stderr = (stderr + chunk).slice(-MAX_QUOTED_OUTPUT);
    });
    child.on('exit', (code) => {
      if (!settled) {
        finish(() =>
          reject(
            new Error(
              `MCP server exited before responding (code ${String(code)})${stderr ? `: ${quoteServerOutput(stderr)}` : ''}`
            )
          )
        );
      }
    });

    child.stdin.write(`${JSON.stringify(modernListToolsRequest())}\n`);
  });
}

/**
 * Connect to an MCP server.
 *
 * Supports two transport types:
 * - **STDIO transport**: For commands like "node server.js", "python server.py"
 * - **HTTP transport**: For URLs like "http://localhost:3000/mcp", "https://..."
 *
 * @param config - Server configuration
 * @returns MCP connection object
 * @throws Error if connection fails
 *
 * @example
 * ```typescript
 * // Connect to STDIO server
 * const conn = await connectToServer({ server: 'node my-server.js' });
 *
 * // Connect to HTTP server
 * const conn = await connectToServer({ server: 'http://localhost:3000/mcp' });
 * ```
 */
export async function connectToServer(config: ServerConfig): Promise<MCPConnection> {
  const { server, timeout = DEFAULT_DISCOVERY_TIMEOUT_MS } = config;

  let transport: Transport;

  if (isHttpServer(server)) {
    // HTTP/Streamable HTTP transport
    transport = new StreamableHTTPClientTransport(new URL(server));
  } else {
    // STDIO transport - parse command and args (supports quoted arguments)
    const parts = parseCommand(server);
    if (parts.length === 0) {
      throw new Error(`Empty server command: "${server}"`);
    }
    const command = parts[0];
    const args = parts.slice(1);

    transport = new StdioClientTransport({
      command,
      args,
    });
  }

  const client = new Client(
    {
      name: PACKAGE_NAME,
      version: VERSION,
    },
    {
      capabilities: {},
    }
  );

  // Connect with timeout. The timer must be cleared on success — a live
  // timer keeps the event loop (and the CLI) alive after validation ends —
  // and the transport must be closed on timeout so no child process leaks.
  const connectPromise = client.connect(transport);

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Connection to MCP server timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (error) {
    await transport.close().catch(() => {});
    // Avoid an unhandled rejection if connect fails after the timeout won
    connectPromise.catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }

  return { client, transport };
}

/**
 * Get tool definitions from a connected MCP server, following
 * `nextCursor` pagination.
 *
 * @param connection - Active MCP connection
 * @param serverUrl - Server URL/command for source tracking
 * @param timeout - Per-request timeout in milliseconds
 * @returns Array of tool definitions
 */
export async function getToolDefinitions(
  connection: MCPConnection,
  serverUrl: string,
  timeout: number = DEFAULT_DISCOVERY_TIMEOUT_MS
): Promise<ToolDefinition[]> {
  const tools: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    if (++pages > MAX_DISCOVERY_PAGES) throw tooManyPagesError();
    const response = await connection.client.listTools(
      cursor !== undefined ? { cursor } : undefined,
      { timeout }
    );
    tools.push(...(response.tools as Record<string, unknown>[]));
    cursor = response.nextCursor;
  } while (cursor !== undefined);

  return tools.map((tool) => toServerToolDefinition(tool, serverUrl));
}

/**
 * Disconnect from an MCP server.
 *
 * @param connection - Active MCP connection to close
 */
export async function disconnect(connection: MCPConnection): Promise<void> {
  await connection.client.close();
}

/**
 * Convenience function to connect, get tools, and disconnect.
 *
 * @param config - Server configuration
 * @returns Array of tool definitions
 *
 * @example
 * ```typescript
 * const tools = await fetchToolsFromServer({ server: 'http://localhost:3000/mcp' });
 * console.log(`Found ${tools.length} tools`);
 * ```
 */
export async function fetchToolsFromServer(config: ServerConfig): Promise<ToolDefinition[]> {
  const {
    server,
    timeout = DEFAULT_DISCOVERY_TIMEOUT_MS,
    specVersion = LEGACY_MCP_SPEC_VERSION,
  } = config;
  if (specVersion === MODERN_PROTOCOL_VERSION) {
    return isHttpServer(server)
      ? fetchModernToolsOverHttp(server, timeout)
      : fetchModernToolsOverStdio(server, timeout);
  }

  const connection = await connectToServer(config);
  try {
    return await getToolDefinitions(connection, config.server, timeout);
  } finally {
    await disconnect(connection);
  }
}
