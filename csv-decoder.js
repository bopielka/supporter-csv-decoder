#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

process.on('uncaughtException', (e) => {
  console.error('❌ uncaughtException:', e.message);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('❌ unhandledRejection:', e);
  process.exit(1);
});

const NAME = 'Wspierający'; //supporter
const LEVEL = 'Obecny poziom'; //current level

const outIdx = process.argv.indexOf('--out');
const outArg = outIdx > -1 ? process.argv[outIdx + 1] : null;

function findFirstCsv(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && /\.csv$/i.test(e.name))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }));
  return files.length ? path.join(dir, files[0]) : null;
}

const rootDir = process.cwd();
const inputAbs = findFirstCsv(rootDir);

if (!inputAbs) {
  console.error('❌ NO CSV file found in directory:', rootDir);
  process.exit(1);
}

const defaultOut = path.join(path.dirname(inputAbs), 'supporter-list.txt');
const outAbs = outArg ? path.resolve(process.cwd(), outArg) : defaultOut;

console.log('▶ Start');
console.log('• IN :', inputAbs);
console.log('• OUT :', outAbs);

if (!fs.existsSync(inputAbs)) {
  console.error('❌ FILE DOESN\'T EXIST:', inputAbs);
  process.exit(1);
}

const raw = fs.readFileSync(inputAbs, 'utf8');

const header = raw.split(/\r?\n/).find(l => l.trim().length > 0) || '';
const delimiter = (header.match(/;/g) || []).length > (header.match(/,/g) || []).length ? ';' : ',';

const rows = parse(raw, { columns: true, skip_empty_lines: true, delimiter });
if (!rows.length || !(NAME in rows[0]) || !(LEVEL in rows[0])) {
  console.error(`❌ No "${NAME}" or "${LEVEL}" column in CSV.`);
  process.exit(1);
}

// your supporter levels
const order = ['OSADNIK', 'WATAŻKA', 'KSIĄŻE', 'KRÓL', 'IMPERATOR', 'BÓSTWO'];
// Map<'level': 'conjunction'>
const headerMap = {
  'OSADNIK': 'OSADNICY',
  'WATAŻKA': 'WATAŻKOWIE',
  'KSIĄŻE': 'KSIĄŻĘTA',
  'KRÓL': 'KRÓLOWIE',
  'IMPERATOR': 'IMPERATORZY',
  'BÓSTWO': 'BOGOWIE'
};
const groups = new Map(order.map(k => [k, []]));

for (const r of rows) {
  const name = String(r[NAME] ?? '').trim();
  const level = String(r[LEVEL] ?? '').trim();
  if (!name || !level) continue;
  if (!groups.has(level)) groups.set(level, []);
  groups.get(level).push(name);
}

for (const [k, arr] of groups) {
  const uniq = [...new Set(arr)];
  uniq.sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }));
  groups.set(k, uniq);
}

let out = [];
for (const lvl of order) {
  const names = groups.get(lvl) ?? [];
  if (!names.length) continue; // pomiń poziomy bez wpisów
  out.push(`${headerMap[lvl]}:`);
  out.push(names.join('\n'));
  out.push('');
}

fs.writeFileSync(outAbs, out.join('\n'), 'utf8');
console.log('✔ Saved:', outAbs);
