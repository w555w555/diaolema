export type TabId = 'home' | 'spots' | 'publish' | 'hub' | 'me';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: '策略' },
  { id: 'spots', label: '钓点' },
  { id: 'publish', label: '发布' },
  { id: 'hub', label: '渔圈' },
  { id: 'me', label: '我的' },
];

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {TABS.map((item) =>
        item.id === 'publish' ? (
          <button
            key={item.id}
            type="button"
            className="nav-fab"
            data-active={tab === item.id ? 'true' : 'false'}
            aria-label="发布"
            onClick={() => onChange(item.id)}
          >
            <span className="nav-plus" aria-hidden />
          </button>
        ) : (
          <button
            key={item.id}
            type="button"
            className="nav-item"
            data-active={tab === item.id ? 'true' : 'false'}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
