/**
 * Security Rules (SEC-*)
 *
 * Rules for detecting security vulnerabilities and input validation gaps.
 */

export { default as sec001 } from './sec-001.js';
export { default as sec002 } from './sec-002.js';
export { default as sec003 } from './sec-003.js';
export { default as sec004 } from './sec-004.js';
export { default as sec005 } from './sec-005.js';
export { default as sec006 } from './sec-006.js';
export { default as sec007 } from './sec-007.js';
export { default as sec008 } from './sec-008.js';
export { default as sec009 } from './sec-009.js';
export { default as sec010 } from './sec-010.js';

// Re-export helper function for cross-rule use
export { isSensitiveParameter } from './sec-007.js';
