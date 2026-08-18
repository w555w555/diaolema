import type { IngestConfig } from './config';
import type { AiInfo } from './extract';

export async function aiExtractFishingInfo(rawText: string, config: IngestConfig): Promise<AiInfo | null> {
  const ai = config.ai;
  if (!ai.enabled || !ai.api_key || !ai.base_url || !ai.model || !rawText.trim()) return null;
  const endpoint = ai.base_url.replace(/\/$/, '') + '/chat/completions';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ai.api_key}`,
      },
      body: JSON.stringify({
        model: ai.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '从钓鱼相关中文文本提取 JSON：summary, location, fish_species, fishing_method, bait, catch_amount, time_hint, confidence_score(0-1)。没有的字段用空字符串，confidence_score 用数字。只返回 JSON。',
          },
          { role: 'user', content: rawText.slice(0, ai.max_input_chars || 4000) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as AiInfo;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
