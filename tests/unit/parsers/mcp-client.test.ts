/**
 * MCP Client Unit Tests
 *
 * Tests the MCP client module for connecting to servers and retrieving tool definitions.
 * Uses mocks to avoid actual server connections.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

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

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@modelcontextprotocol/sdk/client/stdio.js')
  >();
  return {
    getDefaultEnvironment: actual.getDefaultEnvironment,
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
  MAX_DISCOVERY_PAGES,
  MAX_RESPONSE_BYTES,
  parseSseResponse,
  MCPProtocolError,
  UnsupportedProtocolVersionError,
  HeaderMismatchError,
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
          name: 'mcp-tool-description-validator',
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

    it('should require the JSON-RPC 2.0 response marker', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '1.0',
        id: 1,
        result: {
          resultType: 'complete',
          tools: [],
          ttlMs: 0,
          cacheScope: 'private',
        },
      }), { headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow('jsonrpc must be exactly "2.0"');
    });

    it('should treat an absent resultType as complete for backward compatibility', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [], ttlMs: 0, cacheScope: 'private' },
      }), { headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).resolves.toEqual([]);
    });

    it('should reject a non-complete tools/list result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          resultType: 'input_required',
          tools: [],
          ttlMs: 0,
          cacheScope: 'private',
        },
      }), { headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow('resultType "input_required" is not supported');
    });

    it.each([
      [{ resultType: 'complete', tools: [], cacheScope: 'private' }, 'ttlMs'],
      [{ resultType: 'complete', tools: [], ttlMs: -1, cacheScope: 'private' }, 'ttlMs'],
      [{ resultType: 'complete', tools: [], ttlMs: 1.5, cacheScope: 'private' }, 'ttlMs'],
      [{ resultType: 'complete', tools: [], ttlMs: 0 }, 'cacheScope'],
      [{ resultType: 'complete', tools: [], ttlMs: 0, cacheScope: 'shared' }, 'cacheScope'],
    ])('should reject invalid caching hints in a completed result', async (result, expected) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result,
      }), { headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow(expected);
    });

    it('should explain unsupported discovery versions without downgrading', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Unsupported protocol version' } }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
      );
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow('--discovery-spec-version 2025-11-25');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should expose a structured unsupported-version error', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32022,
          message: 'Unsupported protocol version',
          data: {
            supported: ['2026-09-01', '2025-11-25'],
            requested: '2026-07-28',
          },
        },
      }), { status: 400, headers: { 'content-type': 'application/json' } }));
      vi.stubGlobal('fetch', fetchMock);

      const error = await fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      }).catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(UnsupportedProtocolVersionError);
      expect(error).toMatchObject({
        code: -32022,
        requestedVersion: '2026-07-28',
        supportedVersions: ['2026-09-01', '2025-11-25'],
      });
      expect((error as Error).message).toContain(
        '--discovery-spec-version 2025-11-25'
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should reject malformed unsupported-version error data', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32022,
          message: 'Unsupported protocol version',
          data: { supported: ['2025-11-25'] },
        },
      }), { status: 400, headers: { 'content-type': 'application/json' } })));

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow(
        'UnsupportedProtocolVersionError data.requested must be a string'
      );
    });

    it('should expose a structured header-mismatch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32020,
          message: 'Mcp-Method does not match the request body',
        },
      }), { status: 400, headers: { 'content-type': 'application/json' } })));

      const error = await fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      }).catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(HeaderMismatchError);
      expect(error).toMatchObject({ code: -32020 });
      expect((error as Error).message).toContain('request metadata');
    });

    it('should expose other well-formed JSON-RPC errors structurally', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      }), { status: 404, headers: { 'content-type': 'application/json' } })));

      const error = await fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      }).catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(MCPProtocolError);
      expect(error).toMatchObject({ code: -32601 });
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

    it('should require one cache scope across paginated results', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            resultType: 'complete',
            tools: [],
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
            tools: [],
            ttlMs: 500,
            cacheScope: 'public',
          },
        }), { headers: { 'content-type': 'application/json' } }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchToolsFromServer({
        server: 'https://example.com/mcp',
        specVersion: '2026-07-28',
      })).rejects.toThrow('changed cacheScope from "private" to "public"');
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

describe('discovery limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.close.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const modernPage = (id: number, nextCursor?: string) =>
    new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          resultType: 'complete',
          tools: [{ name: `tool-${id}`, inputSchema: { type: 'object' } }],
          ttlMs: 0,
          cacheScope: 'public',
          ...(nextCursor ? { nextCursor } : {}),
        },
      }),
      { headers: { 'content-type': 'application/json' } }
    );

  it('should follow legacy tools/list pagination', async () => {
    mockClientInstance.listTools
      .mockResolvedValueOnce({ tools: [{ name: 'a', inputSchema: { type: 'object' } }], nextCursor: 'p2' })
      .mockResolvedValueOnce({ tools: [{ name: 'b', inputSchema: { type: 'object' } }] });

    const tools = await fetchToolsFromServer({ server: 'node server.js', timeout: 1234 });

    expect(tools.map((tool) => tool.name)).toEqual(['a', 'b']);
    expect(mockClientInstance.listTools).toHaveBeenNthCalledWith(1, undefined, { timeout: 1234 });
    expect(mockClientInstance.listTools).toHaveBeenNthCalledWith(2, { cursor: 'p2' }, { timeout: 1234 });
  });

  it('should abort legacy discovery that paginates forever', async () => {
    let page = 0;
    mockClientInstance.listTools.mockImplementation(async () => ({
      tools: [],
      nextCursor: `c${++page}`,
    }));

    await expect(fetchToolsFromServer({ server: 'node server.js' })).rejects.toThrow(
      `exceeded ${MAX_DISCOVERY_PAGES} pages`
    );
    expect(mockClientInstance.listTools).toHaveBeenCalledTimes(MAX_DISCOVERY_PAGES);
    expect(mockClientInstance.close).toHaveBeenCalled();
  });

  it('should abort modern HTTP discovery that paginates forever', async () => {
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const { id } = JSON.parse(init.body);
      return modernPage(id, `cursor-${id}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchToolsFromServer({ server: 'https://example.com/mcp', specVersion: '2026-07-28' })
    ).rejects.toThrow(`exceeded ${MAX_DISCOVERY_PAGES} pages`);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_DISCOVERY_PAGES);
  });

  it('should refuse to follow HTTP redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(modernPage(1));
    vi.stubGlobal('fetch', fetchMock);

    await fetchToolsFromServer({ server: 'https://example.com/mcp', specVersion: '2026-07-28' });

    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
  });

  it('should reject a response that declares an oversized body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          headers: {
            'content-type': 'application/json',
            'content-length': String(MAX_RESPONSE_BYTES + 1),
          },
        })
      )
    );

    await expect(
      fetchToolsFromServer({ server: 'https://example.com/mcp', specVersion: '2026-07-28' })
    ).rejects.toThrow(`exceeded ${MAX_RESPONSE_BYTES} bytes`);
  });

  it('should reject a streamed body that grows past the limit', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > MAX_RESPONSE_BYTES) {
          controller.close();
          return;
        }
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, { headers: { 'content-type': 'application/json' } })
      )
    );

    await expect(
      fetchToolsFromServer({ server: 'https://example.com/mcp', specVersion: '2026-07-28' })
    ).rejects.toThrow(`exceeded ${MAX_RESPONSE_BYTES} bytes`);
  });

  it('should truncate long error bodies quoted in messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('x'.repeat(50_000), { status: 502 }))
    );

    const error = await fetchToolsFromServer({
      server: 'https://example.com/mcp',
      specVersion: '2026-07-28',
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('HTTP 502');
    expect((error as Error).message.length).toBeLessThan(2100);
  });

  it('should not pass the caller environment to a stdio server', async () => {
    // A stdio server that reports whether it can see a variable from the
    // validator's environment.
    const dir = await mkdtemp(join(tmpdir(), 'mcp-env-'));
    const script = join(dir, 'env-server.mjs');
    await writeFile(
      script,
      `import { createInterface } from 'node:readline';
createInterface({ input: process.stdin }).on('line', (line) => {
  const { id } = JSON.parse(line);
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: {
    resultType: 'complete', ttlMs: 0, cacheScope: 'public',
    tools: [{ name: process.env.MCP_VALIDATOR_TEST_ONLY_SECRET ? 'leaked' : 'isolated',
      inputSchema: { type: 'object' } }] } }) + '\\n');
});
`
    );
    process.env.MCP_VALIDATOR_TEST_ONLY_SECRET = 'test-only-value';
    try {
      const tools = await fetchToolsFromServer({
        server: `${process.execPath} "${script}"`,
        specVersion: '2026-07-28',
      });
      expect(tools.map((tool) => tool.name)).toEqual(['isolated']);
    } finally {
      delete process.env.MCP_VALIDATOR_TEST_ONLY_SECRET;
      await rm(dir, { recursive: true, force: true });
    }
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
