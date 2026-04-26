(function () {
  const STORAGE_KEY = 'lactomi-theme';
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {
      // localStorage may be unavailable in private modes.
    }
    return 'light';
  }

  function setTheme(theme, persist) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', nextTheme);
    root.style.colorScheme = nextTheme;

    if (toggle) {
      const isDark = nextTheme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      const icon = toggle.querySelector('.theme-toggle-icon');
      const text = toggle.querySelector('.theme-toggle-text');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
      if (text) text.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
    }

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, nextTheme); } catch (_) {}
    }

    window.dispatchEvent(new CustomEvent('lactomi-theme-change', { detail: { theme: nextTheme } }));
  }

  setTheme(getPreferredTheme(), false);

  if (toggle) {
    toggle.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }
})();
