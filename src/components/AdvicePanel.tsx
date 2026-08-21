import type { FishingAdvice } from '../types';

export function AdvicePanel({ advice }: { advice: FishingAdvice | null }) {
  if (!advice) {
    return (
      <section className="panel advice-panel">
        <h2>今日怎么钓</h2>
        <p className="muted">等天气到位后，再给出水层、鱼饵和钓法。</p>
      </section>
    );
  }

  return (
    <section className="panel advice-panel">
      <h2>今日怎么钓</h2>
      <p className="layer">
        经验主攻<strong>{advice.layer}</strong>
      </p>
      <p className="targets">对象鱼：{advice.targetFish.join('、')}</p>
      <dl>
        <div>
          <dt>{advice.lureNote ? '拟饵' : '味形'}</dt>
          <dd>{advice.baitLabel}</dd>
        </div>
        {advice.lureColorWhy ? (
          <div>
            <dt>饵色</dt>
            <dd>{advice.lureColorWhy}</dd>
          </div>
        ) : null}
        {advice.lureNote ? (
          <div>
            <dt>操法</dt>
            <dd>{advice.lureNote}</dd>
          </div>
        ) : null}
        <div>
          <dt>标点</dt>
          <dd>{advice.spot}</dd>
        </div>
        <div>
          <dt>窗口</dt>
          <dd>{advice.window}</dd>
        </div>
        <div>
          <dt>钓法</dt>
          <dd>
            {advice.method}
            <span>{advice.tip}</span>
          </dd>
        </div>
      </dl>
      <ul className="reasons">
        {advice.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
