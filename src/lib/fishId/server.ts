import type { FishIdResult } from '../../types';
import { FISH_CATALOG, UNCERTAIN, parseFishReply } from './catalog';

export const DEFAULT_FISH_ID_SITE = 'https://www.doubao.com';
export const DEFAULT_FISH_ID_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
export const DEFAULT_FISH_ID_MODEL = 'doubao-seed-2-1-turbo-260628';

export function fishIdConfigured(env: Record<string, string>): boolean {
  return Boolean(env.FISH_ID_API_KEY?.trim());
}

export function fishIdAgentUrl(env: Record<string, string>): string {
  const origin = (env.FISH_ID_SITE_URL || DEFAULT_FISH_ID_SITE).replace(/\/$/, '');
  const agent = env.FISH_ID_AGENT_ID?.trim();
  return agent ? `${origin}/agent/${agent}` : origin;
}

function chatCompletionsUrl(env: Record<string, string>): string {
  const base = (env.FISH_ID_BASE_URL || DEFAULT_FISH_ID_BASE).replace(/\/$/, '');
  return `${base}/chat/completions`;
}

export async function identifyFishFromImage(
  imageBase64: string,
  mime: string,
  env: Record<string, string>,
): Promise<FishIdResult> {
  const key = env.FISH_ID_API_KEY?.trim();
  if (!key) {
    const err = new Error('not_configured');
    err.name = 'FishIdNotConfigured';
    throw err;
  }
  const model = env.FISH_ID_MODEL || DEFAULT_FISH_ID_MODEL;
  const catalog = FISH_CATALOG.join('、');
  const dataUrl = `data:${mime || 'image/jpeg'};base64,${imageBase64.replace(/^data:[^;]+;base64,/, '')}`;
  const endpoint = chatCompletionsUrl(env);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 400,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  `仔细看图里最主要那条鱼的口位、口须、体色、斑纹、鳍形，再认种。名称只能是：${catalog}，或${UNCERTAIN}。完全不是鱼才用${UNCERTAIN}。挡了一部分但外形能对上词表，就给最像的种，不要空判。`,
                  '易混：鲫鱼无口须体侧扁；鲤鱼有两对口须体较厚。草鱼青黄吻钝；青鱼青黑。鲈鱼体侧有斑下颌略突。翘嘴下颌明显长于上颌、口裂向上接近眼睛，鱼小也判翘嘴，不要因为个体小就判白条。白条吻短口裂小、体极细。黑鱼头扁口大有云斑，隔着玻璃也先看头和云斑。黄颡鱼无鳞有硬刺体黄。鳜鱼大口褐斑。鲶鱼无鳞须长。',
                  `只返回 JSON：{"species":"词表名或${UNCERTAIN}","confidence":0-1,"alternatives":[{"species":"","confidence":0}],"cues":["口位/体色/斑纹依据"]}`,
                ].join('\n'),
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    if (name === 'TimeoutError' || /aborted due to timeout/i.test(message)) {
      throw new Error('豆包识图超过 2 分钟还没返回。请换一张更小、更清晰的鱼照再试。');
    }
    throw error;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`豆包识鱼返回 ${res.status}${detail ? `：${detail.slice(0, 120)}` : ''}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) {
    return parseFishReply('豆包没有返回文字');
  }
  return parseFishReply(content);
}
