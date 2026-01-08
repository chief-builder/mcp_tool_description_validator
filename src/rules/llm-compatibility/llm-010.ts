/**
 * LLM-010: Avoid jargon and abbreviations without explanation
 *
 * Validates that parameter names and descriptions avoid unexplained
 * abbreviations and technical jargon that LLMs might not understand.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

// Common abbreviations that should be explained
const ABBREVIATIONS: Record<string, string> = {
  'id': 'identifier',
  'num': 'number',
  'str': 'string',
  'cfg': 'configuration',
  'env': 'environment',
  'src': 'source',
  'dst': 'destination',
  'dest': 'destination',
  'tmp': 'temporary',
  'temp': 'temporary',
  'pwd': 'password or working directory',
  'cwd': 'current working directory',
  'dir': 'directory',
  'dirs': 'directories',
  'fn': 'function',
  'func': 'function',
  'cb': 'callback',
  'ctx': 'context',
  'req': 'request',
  'res': 'response',
  'err': 'error',
  'msg': 'message',
  'msgs': 'messages',
  'val': 'value',
  'vals': 'values',
  'len': 'length',
  'idx': 'index',
  'cnt': 'count',
  'max': 'maximum',
  'min': 'minimum',
  'avg': 'average',
  'asc': 'ascending',
  'desc': 'descending',
  'auth': 'authentication/authorization',
  'creds': 'credentials',
  'perms': 'permissions',
  'usr': 'user',
  'grp': 'group',
  'org': 'organization',
  'repo': 'repository',
  'pkg': 'package',
  'lib': 'library',
  'api': 'API (Application Programming Interface)',
  'sdk': 'SDK (Software Development Kit)',
  'cli': 'CLI (Command Line Interface)',
  'gui': 'GUI (Graphical User Interface)',
  'db': 'database',
  'sql': 'SQL (Structured Query Language)',
  'tbl': 'table',
  'col': 'column',
  'cols': 'columns',
  'lbl': 'label',
  'img': 'image',
  'imgs': 'images',
  'doc': 'document',
  'docs': 'documents',
  'ref': 'reference',
  'refs': 'references',
  'attr': 'attribute',
  'attrs': 'attributes',
  'prop': 'property',
  'props': 'properties',
  'param': 'parameter',
  'params': 'parameters',
  'arg': 'argument',
  'args': 'arguments',
  'opt': 'option',
  'opts': 'options',
  'conf': 'configuration',
  'config': 'configuration',
  'init': 'initialize',
  'exec': 'execute',
  'proc': 'process',
  'async': 'asynchronous',
  'sync': 'synchronous',
  'buf': 'buffer',
  'fmt': 'format',
  'ver': 'version',
  'ts': 'timestamp',
  'tz': 'timezone',
  'utc': 'UTC (Coordinated Universal Time)',
  'lat': 'latitude',
  'lng': 'longitude',
  'lon': 'longitude',
  'geo': 'geographic',
  'addr': 'address',
  'tel': 'telephone',
  'ext': 'extension',
  'sku': 'SKU (Stock Keeping Unit)',
  'qty': 'quantity',
  'amt': 'amount',
  'bal': 'balance',
  'txn': 'transaction',
  'inv': 'invoice',
  'po': 'purchase order',
  'rx': 'receive',
  'tx': 'transmit',
  'ack': 'acknowledge',
  'nak': 'negative acknowledge',
  'ttl': 'time to live',
  'etag': 'entity tag',
  'crc': 'CRC (Cyclic Redundancy Check)',
  'md5': 'MD5 hash',
  'sha': 'SHA hash',
  'ssl': 'SSL (Secure Sockets Layer)',
  'tls': 'TLS (Transport Layer Security)',
  'jwt': 'JWT (JSON Web Token)',
  'oauth': 'OAuth',
  'oidc': 'OIDC (OpenID Connect)',
  'saml': 'SAML',
  'ldap': 'LDAP',
  'sso': 'SSO (Single Sign-On)',
  'mfa': 'MFA (Multi-Factor Authentication)',
  '2fa': '2FA (Two-Factor Authentication)',
  'otp': 'OTP (One-Time Password)',
  'uri': 'URI (Uniform Resource Identifier)',
  'url': 'URL (Uniform Resource Locator)',
  'urn': 'URN (Uniform Resource Name)',
  'fqdn': 'FQDN (Fully Qualified Domain Name)',
  'dns': 'DNS (Domain Name System)',
  'ip': 'IP address',
  'ipv4': 'IPv4 address',
  'ipv6': 'IPv6 address',
  'cidr': 'CIDR notation',
  'mac': 'MAC address',
  'nat': 'NAT (Network Address Translation)',
  'vpn': 'VPN (Virtual Private Network)',
  'cdn': 'CDN (Content Delivery Network)',
  'lb': 'load balancer',
  'gw': 'gateway',
  's3': 'S3 (Simple Storage Service)',
  'k8s': 'Kubernetes',
  'vm': 'virtual machine',
  'cpu': 'CPU',
  'gpu': 'GPU',
  'ram': 'RAM',
  'ssd': 'SSD',
  'hdd': 'HDD',
  'io': 'I/O (Input/Output)',
  'stdin': 'standard input',
  'stdout': 'standard output',
  'stderr': 'standard error',
  'fs': 'file system',
  'os': 'operating system',
  'pid': 'process ID',
  'uid': 'user ID',
  'gid': 'group ID',
  'eof': 'end of file',
  'eol': 'end of line',
  'crlf': 'carriage return + line feed',
  'lf': 'line feed',
  'regex': 'regular expression',
  'regexp': 'regular expression',
  'html': 'HTML',
  'xml': 'XML',
  'json': 'JSON',
  'yaml': 'YAML',
  'toml': 'TOML',
  'csv': 'CSV',
  'tsv': 'TSV',
  'b64': 'Base64',
  'hex': 'hexadecimal',
  'utf8': 'UTF-8',
  'utf16': 'UTF-16',
  'ascii': 'ASCII',
  'wss': 'WebSocket Secure',
  'ws': 'WebSocket',
  'http': 'HTTP',
  'https': 'HTTPS',
  'ftp': 'FTP',
  'sftp': 'SFTP',
  'ssh': 'SSH',
  'smtp': 'SMTP',
  'imap': 'IMAP',
  'pop3': 'POP3',
};

// Words that indicate the abbreviation is being explained
const EXPLANATION_INDICATORS = [
  'identifier',
  'number',
  'string',
  'configuration',
  'environment',
  'source',
  'destination',
  'temporary',
  'password',
  'directory',
  'function',
  'callback',
  'context',
  'request',
  'response',
  'error',
  'message',
  'value',
  'length',
  'index',
  'count',
  'maximum',
  'minimum',
  'average',
  'authentication',
  'authorization',
  'credentials',
  'permissions',
  'user',
  'group',
  'organization',
  'repository',
  'package',
  'library',
  'interface',
  'database',
  'table',
  'column',
  'label',
  'image',
  'document',
  'reference',
  'attribute',
  'property',
  'parameter',
  'argument',
  'option',
  'initialize',
  'execute',
  'process',
  'asynchronous',
  'synchronous',
  'buffer',
  'format',
  'version',
  'timestamp',
  'timezone',
];

interface PropertySchema {
  description?: string;
  [key: string]: unknown;
}

function findUnexplainedAbbreviations(paramName: string, description: string): string[] {
  const nameLower = paramName.toLowerCase();
  const descLower = description.toLowerCase();
  const combinedText = `${nameLower} ${descLower}`;

  const found: string[] = [];

  for (const [abbrev] of Object.entries(ABBREVIATIONS)) {
    // Check if abbreviation appears as a standalone word or at word boundary
    const regex = new RegExp(`\\b${abbrev}\\b`, 'i');

    if (regex.test(nameLower)) {
      // Check if explanation is present in the combined text
      const hasExplanation = EXPLANATION_INDICATORS.some(indicator =>
        combinedText.includes(indicator.toLowerCase())
      );

      if (!hasExplanation) {
        found.push(abbrev);
      }
    }
  }

  return found;
}

const rule: Rule = {
  id: 'LLM-010',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Avoid jargon and abbreviations without explanation',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return issues;
    }

    const properties = schema.properties as Record<string, PropertySchema> | undefined;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (!paramSchema || typeof paramSchema !== 'object') {
        continue;
      }

      const description = typeof paramSchema.description === 'string' ? paramSchema.description : '';
      const unexplained = findUnexplainedAbbreviations(paramName, description);

      if (unexplained.length > 0) {
        const abbrevList = unexplained.map(a => `"${a}" (${ABBREVIATIONS[a]})`).join(', ');
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' uses unexplained abbreviation(s): ${unexplained.join(', ')}`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}`,
          suggestion: `Consider expanding or explaining: ${abbrevList}`,
        });
      }
    }

    return issues;
  },
};

export default rule;
