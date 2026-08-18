import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { identifyFishFromImage } from '../src/lib/fishId/server';

const CASES_R1 = [
  { expected: '鲫鱼', file: '01-crucian.jpg' },
  { expected: '鲤鱼', file: '02-carp.jpg' },
  { expected: '草鱼', file: '03-grass.jpg' },
  { expected: '鲈鱼', file: '04-seabass.jpg' },
  { expected: '翘嘴', file: '05-culter.jpg' },
  { expected: '黑鱼', file: '06-snakehead.jpg' },
  { expected: '黄颡鱼', file: '07-yellowcat.jpg' },
  { expected: '罗非鱼', file: '08-tilapia.jpg' },
  { expected: '鳜鱼', file: '09-mandarin.jpg' },
  { expected: '白条', file: '10-hemiculter.jpg' },
];

const CASES_R2 = [
  { expected: '鲫鱼', file: '01.jpg' },
  { expected: '鲤鱼', file: '02.jpg' },
  { expected: '青鱼', file: '03.jpg' },
  { expected: '鳊鱼', file: '04.jpg' },
  { expected: '翘嘴', file: '05.jpg' },
  { expected: '黑鱼', file: '06.jpg' },
  { expected: '鲶鱼', file: '07.jpg' },
  { expected: '罗非鱼', file: '08.jpg' },
  { expected: '鳜鱼', file: '09.jpg' },
  { expected: '黄颡鱼', file: '10.jpg' },
];

async function main() {
  const round2 = process.argv.includes('--r2');
  const CASES = round2 ? CASES_R2 : CASES_R1;
  const root = process.cwd();
  const dir = join(root, 'fish_scout_data', round2 ? 'fish-id-samples-r2' : 'fish-id-samples');
  const outFile = round2 ? 'fish-id-accuracy-r2.json' : 'fish-id-accuracy.json';
  const source = round2
    ? 'iNaturalist research-grade photos, 10 new catalog species (round 2, different photo IDs)'
    : 'iNaturalist research-grade photos, 10 catalog species';
  const env = { ...loadEnv('development', root, ''), ...process.env } as Record<string, string>;
  const rows: Record<string, unknown>[] = [];
  let correct = 0;
  for (const item of CASES) {
    const started = Date.now();
    const bytes = readFileSync(join(dir, item.file));
    try {
      const result = await identifyFishFromImage(bytes.toString('base64'), 'image/jpeg', env);
      const ok = result.species === item.expected;
      if (ok) correct += 1;
      const row = {
        expected: item.expected,
        predicted: result.species,
        confidence: result.confidence,
        alternatives: result.alternatives.map((a) => a.species).join('、'),
        cues: result.cues.join('；'),
        ok,
        ms: Date.now() - started,
        file: item.file,
      };
      rows.push(row);
      console.log(JSON.stringify({ expected: item.expected, predicted: result.species, ok, ms: row.ms }));
    } catch (error) {
      rows.push({
        expected: item.expected,
        predicted: error instanceof Error ? error.message : String(error),
        confidence: 0,
        alternatives: '',
        cues: '',
        ok: false,
        ms: Date.now() - started,
        file: item.file,
      });
      console.log(JSON.stringify({ expected: item.expected, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  const out = {
    at: new Date().toISOString(),
    source,
    n: CASES.length,
    correct,
    accuracy: Number((correct / CASES.length).toFixed(2)),
    rows,
  };
  writeFileSync(join(root, 'fish_scout_data', outFile), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ summary: true, correct, n: CASES.length, accuracy: out.accuracy }));
}

void main();
