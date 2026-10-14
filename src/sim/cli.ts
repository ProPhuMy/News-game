import { parseArgs } from 'node:util';
import { loadContent } from './load-content.ts';
import { balanceReport } from './report.ts';

const { values } = parseArgs({ options: { matches: { type: 'string', default: '500' } } });
const matches = Number(values.matches);
if (!Number.isInteger(matches) || matches < 1) {
  console.error('--matches must be a positive integer');
  process.exit(2);
}

const { content, source } = await loadContent();
const report = balanceReport(matches, content);
console.log(`content: ${source}`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
