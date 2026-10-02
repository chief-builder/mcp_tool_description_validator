#!/usr/bin/env node
/**
 * Check that links to this repository's own files on github.com
 * (…/blob/<branch>/<path> and …/tree/<branch>/<path>) point at files that
 * exist in the checkout. github.com rejects automated requests for these
 * pages, so the external link checker skips them (see lychee.toml).
 *
 * Usage: node scripts/check-repo-links.mjs [files...]
 */

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO_URL =
  /https:\/\/github\.com\/chief-builder\/mcp_tool_description_validator\/(?:blob|tree)\/[^/\s"'<>)]+\/([^\s"'<>)#?]+)/g;

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync('git', ['ls-files', '*.md', '*.html', 'src/*.ts'], {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean);

let checked = 0;
const missing = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(REPO_URL)) {
    checked++;
    const target = decodeURIComponent(match[1]);
    if (!existsSync(target)) missing.push(`${file}: ${match[0]}`);
  }
}

if (missing.length > 0) {
  console.error(`Links to missing repository files:\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`${checked} repository file links OK`);
