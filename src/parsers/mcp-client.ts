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
import type { ToolDefinition, ToolSource } from '../types/index.js';

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

  return response.tools.map((tool) => {
    const source: ToolSource = {
      type: 'server',
      location: serverUrl,
      raw: tool,
    };

    // Optional draft-spec fields; server data is untrusted, so cast
    // defensively and let validation rules check the actual shapes.
    const raw = tool as Record<string, unknown>;

    return {
      name: tool.name,
      title: raw.title as ToolDefinition['title'],
      description: tool.description ?? '',
      icons: raw.icons as ToolDefinition['icons'],
      inputSchema: tool.inputSchema as Record<string, unknown>,
      outputSchema: raw.outputSchema as ToolDefinition['outputSchema'],
      _meta: raw._meta as ToolDefinition['_meta'],
      annotations: tool.annotations
        ? {
            title: tool.annotations.title,
            readOnlyHint: tool.annotations.readOnlyHint,
            destructiveHint: tool.annotations.destructiveHint,
            idempotentHint: tool.annotations.idempotentHint,
            openWorldHint: tool.annotations.openWorldHint,
          }
        : undefined,
      source,
    };
  });
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
  const connection = await connectToServer(config);
  try {
    return await getToolDefinitions(connection, config.server);
  } finally {
    await disconnect(connection);
  }
}
