/**
 * MCP Client Unit Tests
 *
 * Tests the MCP client module for connecting to servers and retrieving tool definitions.
 * Uses mocks to avoid actual server connections.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      expect(tools[0].description).toBe('');
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
  });
});
