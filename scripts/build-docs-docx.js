#!/usr/bin/env node
/**
 * Build Word (.docx) versions of the three published guides from Markdown.
 * Requires Pandoc 2.x+ on PATH: https://pandoc.org/installing.html
 *
 * Usage: node scripts/build-docs-docx.js [output-dir]
 * Default output: dist/docs/
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, process.argv[2] || path.join('dist', 'docs'));

const guides = [
  {
    source: 'INSTALLATION_GUIDE.md',
    output: 'Installation-Guide.docx',
    label: 'Installation'
  },
  {
    source: 'STAFF_GUIDE.md',
    output: 'Staff-Guide.docx',
    label: 'Staff (front desk check-in)'
  },
  {
    source: 'ADMIN_GUIDE.md',
    output: 'Front-Desk-Admin-Guide.docx',
    label: 'Admin / supervisor (front desk)'
  }
];

function pandocOnPath() {
  const r = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function main() {
  if (!pandocOnPath()) {
    console.error(
      '[build-docs-docx] Pandoc is not installed or not on PATH.\n' +
        '  Install: https://pandoc.org/installing.html\n' +
        '  Ubuntu/CI: sudo apt-get install -y pandoc'
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const { source, output, label } of guides) {
    const srcPath = path.join(projectRoot, source);
    const destPath = path.join(outDir, output);
    if (!fs.existsSync(srcPath)) {
      console.error(`[build-docs-docx] Missing source: ${source}`);
      process.exit(1);
    }
    console.log(`[build-docs-docx] ${label}: ${source} → ${output}`);
    execSync(
      `pandoc "${srcPath}" --from=gfm --output="${destPath}"`,
      { stdio: 'inherit', shell: true, cwd: projectRoot }
    );
  }

  console.log(`[build-docs-docx] Done. Output: ${outDir}`);
}

main();
