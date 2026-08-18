import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

function mount() {
  const root = document.getElementById('root');
  if (!root) return;
  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    root.textContent = error instanceof Error ? error.message : '页面启动失败，请刷新。';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
