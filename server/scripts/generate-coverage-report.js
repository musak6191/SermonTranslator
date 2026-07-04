const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '..', 'coverage');
const summaryPath = path.join(coverageDir, 'coverage-summary.json');
const outputPath = path.join(coverageDir, 'coverage-report.md');

fs.mkdirSync(coverageDir, { recursive: true });

function formatPct(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '0.00%';
}

if (!fs.existsSync(summaryPath)) {
  const placeholder = ['# Coverage Report', '', 'Coverage summary was not generated.', ''].join('\n');
  fs.writeFileSync(outputPath, placeholder);
  console.log(`Coverage report written to ${outputPath}`);
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const lines = [
  '# Coverage Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  ''
];

const totals = summary.total || {};
const fileEntries = Object.entries(summary)
  .filter(([key]) => key !== 'total')
  .sort(([left], [right]) => left.localeCompare(right));

lines.push('| File | Statements | Branches | Functions | Lines |');
lines.push('| --- | ---: | ---: | ---: | ---: |');

for (const [file, metrics] of fileEntries) {
  const displayPath = file.replace(/\\/g, '/');
  lines.push(`| ${displayPath} | ${formatPct(metrics?.statements?.pct)} | ${formatPct(metrics?.branches?.pct)} | ${formatPct(metrics?.functions?.pct)} | ${formatPct(metrics?.lines?.pct)} |`);
}

lines.push('');
lines.push('## Totals');
lines.push('');
lines.push(`- Statements: ${formatPct(totals?.statements?.pct)}`);
lines.push(`- Branches: ${formatPct(totals?.branches?.pct)}`);
lines.push(`- Functions: ${formatPct(totals?.functions?.pct)}`);
lines.push(`- Lines: ${formatPct(totals?.lines?.pct)}`);
lines.push('');

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`Coverage report written to ${outputPath}`);
