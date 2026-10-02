/**
 * Single source of truth for the validator's name and version.
 * The values are inlined from package.json at build time (tsup/esbuild
 * resolves the JSON import), so dist output has no runtime dependency
 * on package.json.
 */
import pkg from '../package.json';

export const PACKAGE_NAME: string = pkg.name;
export const VERSION: string = pkg.version;
