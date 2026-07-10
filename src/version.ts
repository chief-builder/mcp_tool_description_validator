/**
 * Single source of truth for the validator version.
 * The value is inlined from package.json at build time (tsup/esbuild
 * resolves the JSON import), so dist output has no runtime dependency
 * on package.json.
 */
import pkg from '../package.json';

export const VERSION: string = pkg.version;
