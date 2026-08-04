import { createInterface } from 'node:readline';

const lines = createInterface({ input: process.stdin });

lines.on('line', (line) => {
  const request = JSON.parse(line);
  const protocolVersion =
    request.params?._meta?.['io.modelcontextprotocol/protocolVersion'];

  if (protocolVersion !== '2026-07-28') {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32602, message: 'Missing modern request metadata' },
    })}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify({
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resultType: 'complete',
      tools: [{
        name: 'modern-stdio-tool',
        description: 'A tool returned by a modern stateless stdio server.',
        inputSchema: { type: 'object' },
      }],
      ttlMs: 1000,
      cacheScope: 'private',
    },
  })}\n`);
});
