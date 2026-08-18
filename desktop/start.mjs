import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5174;
const url = `http://127.0.0.1:${PORT}`;

function waitForPort(port, host = '127.0.0.1', tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (left <= 1) reject(new Error('服务启动超时'));
        else setTimeout(() => attempt(left - 1), 500);
      });
    };
    attempt(tries);
  });
}

function openAppWindow(target) {
  const browsers = [
    join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const bin = browsers.find((p) => existsSync(p));
  if (bin) {
    spawn(bin, [`--app=${target}`, '--new-window'], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('cmd', ['/c', 'start', '', target], { detached: true, stdio: 'ignore' }).unref();
}

function lanUrls(port) {
  const urls = [];
  for (const rows of Object.values(networkInterfaces())) {
    for (const row of rows || []) {
      if (row.internal) continue;
      if (row.family !== 'IPv4' && row.family !== 4) continue;
      urls.push(`http://${row.address}:${port}`);
    }
  }
  return urls;
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '0.0.0.0'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

vite.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => vite.kill('SIGINT'));
process.on('SIGTERM', () => vite.kill('SIGTERM'));

try {
  await waitForPort(PORT);
  openAppWindow(url);
  console.log(`钓了嘛已启动：${url}`);
  for (const lan of lanUrls(PORT)) console.log(`手机访问：${lan}（定位/实时取景需 HTTPS；系统相机选图可用）`);
  spawn('npx', ['vite-node', 'src/lib/scout/cli.ts'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    shell: true,
  }).unref();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  vite.kill();
  process.exit(1);
}
