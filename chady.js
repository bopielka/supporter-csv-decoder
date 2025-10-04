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

const NAME = 'Wspierający';
const LEVEL = 'Obecny poziom';

const inputArg = process.argv[2];
const outIdx = process.argv.indexOf('--out');
const outArg = outIdx > -1 ? process.argv[outIdx + 1] : null;

if (!inputArg) {
  console.error('Użycie: node chady.js "<plik.csv>" [--out wynik.txt]');
  process.exit(1);
}

const inputAbs = path.resolve(process.cwd(), inputArg);
const defaultOut = path.join(path.dirname(inputAbs), 'chady-lista.txt');
const outAbs = outArg ? path.resolve(process.cwd(), outArg) : defaultOut;

console.log('▶ Start');
console.log('• Wejście :', inputAbs);
console.log('• Wyjście :', outAbs);

if (!fs.existsSync(inputAbs)) {
  console.error('❌ Plik wejściowy nie istnieje:', inputAbs);
  process.exit(1);
}

const raw = fs.readFileSync(inputAbs, 'utf8');
// autodetekcja separatora
const header = raw.split(/\r?\n/).find(l => l.trim().length > 0) || '';
const delimiter = (header.match(/;/g) || []).length > (header.match(/,/g) || []).length ? ';' : ',';

const rows = parse(raw, { columns: true, skip_empty_lines: true, delimiter });
if (!rows.length || !(NAME in rows[0]) || !(LEVEL in rows[0])) {
  console.error(`❌ Brak kolumn "${NAME}" lub "${LEVEL}" w CSV.`);
  process.exit(1);
}

const order = ['OSADNIK', 'WATAŻKA', 'KSIĄŻE', 'KRÓL', 'IMPERATOR', 'BÓSTWO'];
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
  out.push(`${headerMap[lvl]}:`);
  out.push(names.length ? names.map(n => `${n}`).join('\n') : '(brak)');
  out.push('');
}

fs.writeFileSync(outAbs, out.join('\n'), 'utf8');
console.log('✔ Zapisano:', outAbs);
