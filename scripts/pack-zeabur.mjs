import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist-zeabur');
const zip = join(outDir, 'yujian-zeabur.zip');

mkdirSync(outDir, { recursive: true });
execFileSync('git', ['archive', '--format=zip', `--output=${zip}`, 'HEAD'], {
  cwd: root,
  stdio: 'inherit',
});
console.log(`已生成 ${zip}`);
console.log('在 Zeabur 选择上传 zip；密钥只配控制台变量，不要把 .env 打进去。');
