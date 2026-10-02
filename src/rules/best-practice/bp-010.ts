/**
 * BP-010: Tool icons must be well-formed and use safe sources
 *
 * The MCP spec allows an optional `icons` array on tools. Each entry must
 * be an object with a string `src` that is an https:// URL or a data: URI.
 * Clients MUST reject unsafe schemes (javascript:, file:, ftp:, ws:, local
 * app schemes), so those are escalated to error severity. Unknown MIME
 * types and SVG (script-execution risk) get suggestion-severity notes.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** MIME types commonly supported by MCP clients for tool icons. */
const KNOWN_ICON_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
]);

const ICON_SIZE = /^(?:any|[1-9]\d*x[1-9]\d*)$/;
const BASE64_IMAGE_DATA_URI =
  /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]*={0,2}$/i;

/** True when the icon src is a valid HTTPS URL or base64 image data URI. */
function isSafeIconSrc(src: string): boolean {
  const trimmed = src.trim();
  if (BASE64_IMAGE_DATA_URI.test(trimmed)) return true;
  try {
    return new URL(trimmed).protocol === 'https:';
  } catch {
    return false;
  }
}

const rule: Rule = {
  id: 'BP-010',
  category: 'best-practice',
  defaultSeverity: 'warning',
  description: 'Tool icons must be well-formed and use safe sources',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const icons = tool.icons as unknown;

    if (icons === undefined) {
      return issues;
    }

    if (!Array.isArray(icons)) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: 'error',
        message: '`icons` must be an array of icon objects',
        tool: tool.name,
        path: 'icons',
        suggestion:
          'Use an array of { src, mimeType?, sizes?, theme? } objects',
      });
      return issues;
    }

    icons.forEach((entry: unknown, index: number) => {
      const path = `icons[${index}]`;

      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: 'error',
          message: `Icon entry at ${path} is not an object`,
          tool: tool.name,
          path,
          suggestion: 'Each icon must be an object with a `src` property',
        });
        return;
      }

      const icon = entry as Record<string, unknown>;

      if (typeof icon.src !== 'string' || icon.src.length === 0) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: 'error',
          message: `Icon entry at ${path} is missing a string \`src\``,
          tool: tool.name,
          path: `${path}.src`,
          suggestion: 'Set `src` to an https:// URL or a data: URI',
        });
      } else if (!isSafeIconSrc(icon.src)) {
        // Clients MUST reject unsafe schemes; escalate to error
        issues.push({
          id: this.id,
          category: this.category,
          severity: 'error',
          message: `Icon src "${icon.src}" does not use an allowed scheme. Only https:// URLs and data: URIs are permitted; clients MUST reject unsafe schemes (javascript:, file:, ftp:, ws:, http:, local app schemes)`,
          tool: tool.name,
          path: `${path}.src`,
          suggestion: 'Serve the icon over HTTPS or inline it as a data: URI',
        });
      }

      if (icon.mimeType !== undefined) {
        if (typeof icon.mimeType !== 'string') {
          issues.push({
            id: this.id,
            category: this.category,
            severity: 'error',
            message: `Icon mimeType at ${path} must be a string`,
            tool: tool.name,
            path: `${path}.mimeType`,
            suggestion: 'Provide an image MIME type string or remove mimeType',
          });
        } else if (!KNOWN_ICON_MIME_TYPES.has(icon.mimeType.toLowerCase())) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: 'suggestion',
            message: `Icon mimeType "${String(icon.mimeType)}" is not a commonly supported icon type. Clients are only required to support image/png and image/jpeg`,
            tool: tool.name,
            path: `${path}.mimeType`,
            suggestion:
              'Prefer image/png or image/jpeg; image/svg+xml and image/webp are also common',
          });
        } else if (icon.mimeType.toLowerCase() === 'image/svg+xml') {
          issues.push({
            id: this.id,
            category: this.category,
            severity: 'suggestion',
            message: `Icon at ${path} uses image/svg+xml, which can contain executable scripts. Some clients may refuse to render SVG icons`,
            tool: tool.name,
            path: `${path}.mimeType`,
            suggestion:
              'Consider providing a raster fallback (image/png or image/jpeg) alongside the SVG',
          });
        }
      }

      if (icon.sizes !== undefined) {
        if (
          !Array.isArray(icon.sizes) ||
          icon.sizes.some((size) => typeof size !== 'string')
        ) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: 'error',
            message: `Icon sizes at ${path} must be an array of strings`,
            tool: tool.name,
            path: `${path}.sizes`,
            suggestion:
              'Use size strings such as ["48x48", "96x96"] or ["any"]',
          });
        } else {
          icon.sizes.forEach((size, sizeIndex) => {
            if (!ICON_SIZE.test(size)) {
              issues.push({
                id: this.id,
                category: this.category,
                severity: 'warning',
                message: `Icon size "${size}" must use WxH format or "any"`,
                tool: tool.name,
                path: `${path}.sizes[${sizeIndex}]`,
                suggestion:
                  'Use a positive pixel size such as "48x48" or the value "any"',
              });
            }
          });
        }
      }

      if (
        icon.theme !== undefined &&
        icon.theme !== 'light' &&
        icon.theme !== 'dark'
      ) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: 'error',
          message: `Icon theme at ${path} must be "light" or "dark"`,
          tool: tool.name,
          path: `${path}.theme`,
          suggestion: 'Set theme to "light" or "dark", or remove the field',
        });
      }
    });

    return issues;
  },
};

export default rule;
