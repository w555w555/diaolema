import { runDailyScout } from './runDaily';

const result = await runDailyScout(process.cwd());
console.log(`鱼情日报已生成：${result.reportPath}`);
console.log(`公开发现 ${result.discovered} 条，新增入库 ${result.inserted} 条（读到正文 ${result.fetched_body} / 仅摘要 ${result.snippet_only}）`);
if (result.discoveryPath) console.log(`发现记录：${result.discoveryPath}`);
