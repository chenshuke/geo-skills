#!/usr/bin/env node
/** Compatibility wrapper for GEO content image generation.
 * Canonical implementation: ../geo-content-production/scripts/generate_image.js
 */
const path = require('path');
const cp = require('child_process');
const target = path.resolve(__dirname, '../../geo-content-production/scripts/generate_image.js');
const result = cp.spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);
