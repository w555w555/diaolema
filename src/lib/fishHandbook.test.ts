import { describe, expect, it } from 'vitest';
import { FISH_CATALOG, FISH_METHODS } from './fishId/catalog';
import { fishGuide } from './fishGuide';
import { FISH_HANDBOOK, HANDBOOK_UPDATED_AT } from './fishHandbook';
import { auditHandbook, auditSummary } from './fishHandbookAudit';
import raw from '../data/fish-handbook.json';

describe('fishHandbook', () => {
  it('词表每种鱼都有手册，水层与饵与词条一致', () => {
    expect(HANDBOOK_UPDATED_AT).toBe('2026-08-21');
    expect(Object.keys(raw.fish).sort()).toEqual([...FISH_CATALOG].sort());
    for (const fish of FISH_CATALOG) {
      const book = FISH_HANDBOOK[fish];
      const guide = fishGuide(fish);
      expect(book.habitLayer, fish).toBe(guide.habitLayer);
      expect(book.baitHint, fish).toBe(guide.baitHint);
      expect(guide.methods).toEqual([...FISH_METHODS[fish]]);
    }
  });

  it('逐条用引擎计算，结果与手册相符', () => {
    const summary = auditSummary(auditHandbook());
    const report = summary.failures
      .map((row) => `${row.fish} ${row.style} ${row.caseId}: ${row.mismatches.join('；')}`)
      .join('\n');
    expect(summary.failed, report).toBe(0);
    expect(summary.total).toBeGreaterThan(19);
  });
});
