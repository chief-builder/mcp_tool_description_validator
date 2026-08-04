/**
 * MCP Client Unit Tests
 *
 * Tests the MCP client module for connecting to servers and retrieving tool definitions.
 * Uses mocks to avoid actual server connections.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import type { ToolDefinition } from '../../../src/types/index.js';

// Create mock class instances
const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  listTools: vi.fn().mockResolvedValue({ tools: [] }),
};

const mockStdioTransportInstance = {
  start: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockHttpTransportInstance = {
  start: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock the MCP SDK modules before importing the module under test
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: vi.fn().mockImplementation(function () {
      return mockClientInstance;
    }),
  };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return {
    StdioClientTransport: vi.fn().mockImplementation(function () {
      return mockStdioTransportInstance;
    }),
  };
});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  return {
    StreamableHTTPClientTransport: vi.fn().mockImplementation(function () {
      return mockHttpTransportInstance;
    }),
  };
});

// Import after mocks are set up
import {
  connectToServer,
  getToolDefinitions,
  disconnect,
  fetchToolsFromServer,
  parseCommand,
  parseSseResponse,
  type MCPConnection,
  type ServerConfig,
} from '../../../src/parsers/mcp-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

describe('MCP Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.close.mockResolvedValue(undefined);
    mockClientInstance.listTools.mockResolvedValue({ tools: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connectToServer', () => {
    it('should detect HTTP transport for http:// URLs', async () => {
      const config: ServerConfig = {
        server: 'http://localhost:3000/mcp',
      };

      await connectToServer(config);

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL('http://localhost:3000/mcp')
      );
      expect(StdioClientTransport).not.toHaveBeenCalled();
    });

    it('should detect HTTP transport for https:// URLs', async () => {
      const config: ServerConfig = {
        server: 'https://api.example.com/mcp',
      };

      await connectToServer(config);

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL('https://api.example.com/mcp')
      );
      expect(StdioClientTransport).not.toHaveBeenCalled();
    });

    it('should detect STDIO transport for commands', async () => {
      const config: ServerConfig = {
        server: 'node server.js',
      };

      await connectToServer(config);

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'node',
        args: ['server.js'],
      });
      expect(StreamableHTTPClientTransport).not.toHaveBeenCalled();
    });

    it('should handle STDIO commands with multiple arguments', async () => {
      const config: ServerConfig = {
        server: 'python -m mcp_server --port 8000',
      };

      await connectToServer(config);

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'python',
        args: ['-m', 'mcp_server', '--port', '8000'],
      });
    });

    it('should handle STDIO commands with no arguments', async () => {
      const config: ServerConfig = {
        server: 'my-mcp-server',
      };

      await connectToServer(config);

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'my-mcp-server',
        args: [],
      });
    });

    it('should create a Client with correct configuration', async () => {
      const config: ServerConfig = {
        server: 'http://localhost:3000/mcp',
      };

      await connectToServer(config);

      expect(Client).toHaveBeenCalledWith(
        {
          name: 'mcp-tool-validator',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );
    });

    it('should return an MCPConnection object', async () => {
      const config: ServerConfig = {
        server: 'http://localhost:3000/mcp',
      };

      const connection = await connectToServer(config);

      expect(connection).toHaveProperty('client');
      expect(connection).toHaveProperty('transport');
    });
  });

  describe('getToolDefinitions', () => {
    it('should map MCP tools to ToolDefinition correctly', async () => {
      const mockTools = [
        {
          name: 'get-user',
          description: 'Retrieves a user by ID',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
            required: ['userId'],
          },
          annotations: {
            title: 'Get User',
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const tools = await getToolDefinitions(connection, 'http://localhost:3000/mcp');

      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'get-user',
        description: 'Retrieves a user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        annotations: {
          title: 'Get User',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        source: {
          type: 'server',
          location: 'http://localhost:3000/mcp',
          raw: mockTools[0],
        },
      });
    });

    it('should handle tools without annotations', async () => {
      const mockTools = [
        {
          name: 'simple-tool',
          description: 'A simple tool',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const tools = await getToolDefinitions(connection, 'node server.js');

      expect(tools).toHaveLength(1);
      expect(tools[0].annotations).toBeUndefined();
    });

    it('should handle tools without description', async () => {
      const mockTools = [
        {
          name: 'no-desc-tool',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const tools = await getToolDefinitions(connection, 'http://localhost:3000');

      expect(tools).toHaveLength(1);
      expect(tools[0].description).toBeUndefined();
    });

    it('should attach correct source metadata', async () => {
      const mockTools = [
        {
          name: 'test-tool',
          description: 'Test tool',
          inputSchema: { type: 'object' },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const serverUrl = 'python my-server.py --config test.json';
      const tools = await getToolDefinitions(connection, serverUrl);

      expect(tools[0].source).toEqual({
        type: 'server',
        location: serverUrl,
        raw: mockTools[0],
      });
    });

    it('should handle empty tool list', async () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: [] }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const tools = await getToolDefinitions(connection, 'http://localhost:3000');

      expect(tools).toHaveLength(0);
    });

    it('should handle multiple tools', async () => {
      const mockTools = [
        {
          name: 'tool-1',
          description: 'First tool',
          inputSchema: { type: 'object' },
        },
        {
          name: 'tool-2',
          description: 'Second tool',
          inputSchema: { type: 'object' },
        },
        {
          name: 'tool-3',
          description: 'Third tool',
          inputSchema: { type: 'object' },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      const tools = await getToolDefinitions(connection, 'http://localhost:3000');

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual(['tool-1', 'tool-2', 'tool-3']);
    });
  });

  describe('disconnect', () => {
    it('should close the client connection', async () => {
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockClient = {
        close: mockClose,
      };

      const connection: MCPConnection = {
        client: mockClient as unknown as Client,
        transport: {} as never,
      };

      await disconnect(connection);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchToolsFromServer', () => {
    it('should connect, get tools, and disconnect', async () => {
      const mockTools = [
        {
          name: 'fetch-tool',
          description: 'A tool fetched from server',
          inputSchema: { type: 'object' },
        },
      ];

      // Reset and configure the shared mock instance
      mockClientInstance.listTools.mockResolvedValue({ tools: mockTools });

      const config: ServerConfig = {
        server: 'http://localhost:3000/mcp',
      };

      const tools = await fetchToolsFromServer(config);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('fetch-tool');
      expect(mockClientInstance.connect).toHaveBeenCalled();
      expect(mockClientInstance.listTools).toHaveBeenCalled();
      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('should disconnect even if getToolDefinitions fails', async () => {
      // Configure the mock to fail
      mockClientInstance.listTools.mockRejectedValue(new Error('List tools failed'));

      const config: ServerConfig = {
        server: 'http://localhost:3000/mcp',
      };

      await expect(fetchToolsFromServer(config)).rejects.toThrow('List tools failed');
      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('should issue a stateless 2026-07-28 tools/list request over HTTP', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          resultType: 'complete',
          tools: [{ name: 'modern-tool', inputSchema: { type: 'object' } }],
          ttlMs: 300000,
          cacheScope: 'private',
        },
      }), { headers: { 'content-type': 'application/json' } }));
      vi.stubGlobal('fetch', fetchMock);

      const tools = await fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      });

      expect(tools.map((tool) => tool.name)).toEqual(['modern-tool']);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://example.com/mcp');
      expect(init.headers['MCP-Protocol-Version']).toBe('2026-07-28');
      expect(init.headers['Mcp-Method']).toBe('tools/list');
      const body = JSON.parse(init.body);
      expect(body.params._meta['io.modelcontextprotocol/protocolVersion']).toBe('2026-07-28');
      expect(body.params._meta['io.modelcontextprotocol/clientCapabilities']).toEqual({});
      expect(mockClientInstance.connect).not.toHaveBeenCalled();
    });

    it('should parse a modern tools/list response delivered as SSE', async () => {
      const sse = [
        'event: message',
        'data: {"jsonrpc":"2.0","method":"notifications/progress"}',
        '',
        'event: message',
        'data: {"jsonrpc":"2.0","id":1,"result":{"resultType":"complete","tools":[],"ttlMs":1000,"cacheScope":"private"}}',
        '',
      ].join('\n');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse, {
        headers: { 'content-type': 'text/event-stream' },
      })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).resolves.toEqual([]);
    });

    it('should reject a modern response with a mismatched request id', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 99,
        result: { tools: [] },
      }), { headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow('expected 1');
    });

    it('should follow nextCursor across modern tools/list pages', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            resultType: 'complete',
            tools: [{ name: 'page-one', inputSchema: { type: 'object' } }],
            nextCursor: 'page-2',
            ttlMs: 1000,
            cacheScope: 'private',
          },
        }), { headers: { 'content-type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: {
            resultType: 'complete',
            tools: [{ name: 'page-two', inputSchema: { type: 'object' } }],
            ttlMs: 1000,
            cacheScope: 'private',
          },
        }), { headers: { 'content-type': 'application/json' } }));
      vi.stubGlobal('fetch', fetchMock);

      const tools = await fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      });

      expect(tools.map((tool) => tool.name)).toEqual(['page-one', 'page-two']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondBody.id).toBe(2);
      expect(secondBody.params.cursor).toBe('page-2');
    });

    it('should retrieve tools from a stateless 2026-07-28 stdio server', async () => {
      const fixture = join(
        import.meta.dirname,
        '../../fixtures/modern-mcp-server.mjs'
      );
      const tools = await fetchToolsFromServer({
        server: `${process.execPath} "${fixture}"`,
        specVersion: '2026-07-28',
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('modern-stdio-tool');
      expect(tools[0].source.type).toBe('server');
    });
  });
});

describe('parseCommand', () => {
  it('splits a simple command on whitespace', () => {
    expect(parseCommand('node server.js --flag')).toEqual(['node', 'server.js', '--flag']);
  });

  it('honors double-quoted arguments containing spaces', () => {
    expect(parseCommand('node "my server.js" --flag')).toEqual(['node', 'my server.js', '--flag']);
  });

  it("honors single-quoted arguments containing spaces", () => {
    expect(parseCommand("python '/tmp/my dir/server.py'")).toEqual(['python', '/tmp/my dir/server.py']);
  });

  it('returns empty array for blank input', () => {
    expect(parseCommand('   ')).toEqual([]);
  });
});

describe('parseSseResponse', () => {
  it('returns the final JSON-RPC response and ignores notifications', () => {
    const parsed = parseSseResponse([
      'data: {"jsonrpc":"2.0","method":"notifications/progress"}',
      '',
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
      '',
    ].join('\n')) as Record<string, unknown>;
    expect(parsed.id).toBe(1);
    expect(parsed).toHaveProperty('result');
  });

  it('joins multiple data lines within one SSE event', () => {
    const parsed = parseSseResponse([
      'data: {"jsonrpc":"2.0",',
      'data: "id":1,"result":{"tools":[]}}',
      '',
    ].join('\n')) as Record<string, unknown>;
    expect(parsed.id).toBe(1);
  });
});
