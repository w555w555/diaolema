import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLarkRunner } from './feishuCli';
import { FEISHU_TABLE_NAME, TABLE_FIELDS } from './store';

function tokenFrom(payload: unknown, keys: string[]): string {
  const walk = (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const rec = value as Record<string, unknown>;
    for (const key of keys) {
      const hit = rec[key];
      if (typeof hit === 'string' && hit.trim()) return hit.trim();
    }
    for (const nested of Object.values(rec)) {
      const found = walk(nested);
      if (found) return found;
    }
    return '';
  };
  return walk(payload);
}

function upsertEnv(root: string, pairs: Record<string, string>) {
  const envPath = join(root, '.env');
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const lines = current.split(/\r?\n/);
  const next = [...lines];
  for (const [key, value] of Object.entries(pairs)) {
    const idx = next.findIndex((line) => line.startsWith(`${key}=`));
    const row = `${key}=${value}`;
    if (idx >= 0) next[idx] = row;
    else next.push(row);
  }
  writeFileSync(envPath, `${next.filter((line, i) => line !== '' || i < next.length - 1).join('\n').replace(/\n*$/, '\n')}`, 'utf8');
}

async function main() {
  const root = process.cwd();
  const run = createLarkRunner(root, 120000);
  const created = await run(['base', '+base-create', '--name', '钓了嘛', '--time-zone', 'Asia/Shanghai', '--as', 'user']);
  const baseToken = tokenFrom(created, ['app_token', 'base_token', 'token']);
  if (!baseToken) {
    throw new Error(`创建 Base 成功但没读到 token：${JSON.stringify(created).slice(0, 400)}`);
  }
  const table = await run([
    'base',
    '+table-create',
    '--base-token',
    baseToken,
    '--name',
    FEISHU_TABLE_NAME,
    '--fields',
    JSON.stringify(TABLE_FIELDS),
    '--as',
    'user',
  ]);
  const tableId = tokenFrom(table, ['table_id', 'id']) || FEISHU_TABLE_NAME;
  upsertEnv(root, {
    FEISHU_BASE_TOKEN: baseToken,
    FEISHU_TABLE_ID: tableId,
    FEISHU_AS: 'user',
  });
  const url = tokenFrom(created, ['url']);
  console.log(
    JSON.stringify(
      {
        ok: true,
        name: '钓了嘛',
        baseToken,
        tableId,
        url: url || `https://feishu.cn/base/${baseToken}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (/not configured|not_configured|unauthenticated|login/i.test(message)) {
    console.error('请先运行 npm run feishu:login，用浏览器完成飞书授权后再执行 npm run feishu:provision。');
  }
  process.exit(1);
});
