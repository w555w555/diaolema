export type TabId = 'home' | 'spots' | 'publish' | 'hub' | 'me';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: '策略' },
  { id: 'spots', label: '钓点' },
  { id: 'publish', label: 'AI 识鱼' },
  { id: 'hub', label: '渔圈' },
  { id: 'me', label: '我的' },
];

export function BottomNav({
  tab,
  onChange,
  hubUnread = 0,
}: {
  tab: TabId;
  onChange: (tab: TabId) => void;
  hubUnread?: number;
}) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {TABS.map((item) =>
        item.id === 'publish' ? (
          <button
            key={item.id}
            type="button"
            className="nav-fab"
            data-active={tab === item.id ? 'true' : 'false'}
            aria-label="AI 识鱼"
            onClick={() => onChange(item.id)}
          >
            <span className="nav-fab-text">
              <b>AI</b>
              <small>识鱼</small>
            </span>
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
            {item.id === 'hub' && hubUnread > 0 ? (
              <i className="nav-badge">{hubUnread > 99 ? '99+' : hubUnread}</i>
            ) : null}
          </button>
        ),
      )}
    </nav>
  );
}
