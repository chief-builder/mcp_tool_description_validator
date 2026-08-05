/**
 * MCP Client Module
 *
 * Connects to live MCP servers via STDIO or HTTP transport
 * to retrieve tool definitions.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { spawn } from 'node:child_process';
import type { ToolDefinition, ToolSource } from '../types/index.js';

const MODERN_PROTOCOL_VERSION = '2026-07-28';

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
  /** Optional timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Protocol revision used to retrieve tools (default: legacy 2025-11-25). */
  specVersion?: '2025-11-25' | '2026-07-28';
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
          name: 'mcp-tool-validator',
          version: '0.1.0',
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
}

function parseModernResponse(value: unknown, expectedId: number): ModernToolsPage {
  if (typeof value !== 'object' || value === null) {
    throw new Error('MCP server returned a non-object JSON-RPC response');
  }
  const response = value as Record<string, unknown>;
  if (response.id !== expectedId) {
    throw new Error(
      `MCP server returned response id ${String(response.id)}; expected ${expectedId}`
    );
  }
  if (response.error && typeof response.error === 'object') {
    const error = response.error as Record<string, unknown>;
    throw new Error(
      `MCP server returned ${String(error.code ?? 'an error')}: ${String(error.message ?? 'Unknown error')}`
    );
  }
  const result = response.result;
  if (typeof result !== 'object' || result === null) {
    throw new Error('MCP tools/list response is missing a result object');
  }
  const tools = (result as Record<string, unknown>).tools;
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
  const nextCursor = (result as Record<string, unknown>).nextCursor;
  if (nextCursor !== undefined && typeof nextCursor !== 'string') {
    throw new Error('MCP tools/list response nextCursor must be a string');
  }
  return {
    tools: tools as Record<string, unknown>[],
    ...(nextCursor !== undefined ? { nextCursor } : {}),
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
  let id = 1;

  do {
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
    });
    const body = await response.text();
    if (!response.ok) {
      if (/unsupported protocol version/i.test(body)) {
        throw new Error(
          `MCP server rejected discovery protocol ${MODERN_PROTOCOL_VERSION}: ${body}. ` +
          'Retry explicitly with --discovery-spec-version 2025-11-25; the validator will not silently downgrade.'
        );
      }
      throw new Error(`MCP server returned HTTP ${response.status}: ${body}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const parsed = contentType.includes('text/event-stream')
      ? parseSseResponse(body)
      : JSON.parse(body);
    const page = parseModernResponse(parsed, id);
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
    const child = spawn(parts[0], parts.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdoutBuffer = '';
    let stderr = '';
    let settled = false;
    let requestId = 1;
    const tools: Record<string, unknown>[] = [];
    let timer: NodeJS.Timeout | undefined;

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
        tools.push(...page.tools);
        if (page.nextCursor !== undefined) {
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

    timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Connection to MCP server timed out after ${timeout}ms${stderr ? `: ${stderr.trim()}` : ''}`
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
      stderr += chunk;
    });
    child.on('exit', (code) => {
      if (!settled) {
        finish(() =>
          reject(
            new Error(
              `MCP server exited before responding (code ${String(code)})${stderr ? `: ${stderr.trim()}` : ''}`
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
  const { server, timeout = 30000 } = config;

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
      name: 'mcp-tool-validator',
      version: '0.1.0',
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
 * Get tool definitions from a connected MCP server.
 *
 * @param connection - Active MCP connection
 * @param serverUrl - Server URL/command for source tracking
 * @returns Array of tool definitions
 */
export async function getToolDefinitions(
  connection: MCPConnection,
  serverUrl: string
): Promise<ToolDefinition[]> {
  const response = await connection.client.listTools();

  return response.tools.map((tool) =>
    toServerToolDefinition(tool as Record<string, unknown>, serverUrl)
  );
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
  const { server, timeout = 30000, specVersion = '2025-11-25' } = config;
  if (specVersion === MODERN_PROTOCOL_VERSION) {
    return isHttpServer(server)
      ? fetchModernToolsOverHttp(server, timeout)
      : fetchModernToolsOverStdio(server, timeout);
  }

  const connection = await connectToServer(config);
  try {
    return await getToolDefinitions(connection, config.server);
  } finally {
    await disconnect(connection);
  }
}
