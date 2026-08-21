import { describe, expect, it } from 'vitest';
import { parseSearchSnippets, parseWikiSummary, wikiTitleFor } from './fishLookup';

describe('fishLookup', () => {
  it('maps 翘嘴 to the Wikipedia title', () => {
    expect(wikiTitleFor('翘嘴')).toBe('翘嘴鲌');
  });

  it('parses a Wikipedia summary extract', () => {
    const note = parseWikiSummary(
      {
        extract: '鲫是鲤科的一种淡水鱼，广泛分布于东亚湖泊与缓流。体侧扁，杂食。',
        content_urls: { desktop: { page: 'https://zh.wikipedia.org/wiki/鲫' } },
      },
      '鲫鱼',
    );
    expect(note?.source).toBe('中文维基百科');
    expect(note?.summary).toContain('鲤科');
    expect(note?.url).toContain('wikipedia');
  });

  it('rejects empty wiki extracts', () => {
    expect(parseWikiSummary({ extract: '短' }, '鲫鱼')).toBeNull();
  });

  it('falls back to a public search snippet that names the fish', () => {
    const note = parseSearchSnippets(
      [
        { title: '无关', snippet: '天气很好。', url: 'https://example.com/a' },
        { title: '鲫鱼习性', snippet: '鲫鱼喜群居，多在近岸泥底觅食，口较轻。', url: 'https://example.com/ji' },
      ],
      '鲫鱼',
    );
    expect(note?.source).toBe('公开搜索摘要');
    expect(note?.summary).toContain('近岸');
  });
});
