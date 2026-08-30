(function () {
  const root = document.documentElement;
  const storageKey = 'np-theme';

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Ignore private-mode storage failures.
    }
    document.querySelectorAll('[data-np-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        next === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
      );
    });
  }

  function handleThemeToggle() {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }

  function runDataStream() {
    const bar = document.getElementById('np-data-stream');
    if (!bar) {
      return;
    }
    bar.classList.add('is-loading');
    window.setTimeout(() => {
      bar.classList.add('is-done');
    }, 400);
  }

  function handleCopyLink(event) {
    const button = event.target.closest('[data-np-copy]');
    if (!button) {
      return;
    }
    const url = button.getAttribute('data-np-copy');
    if (!url || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      button.classList.add('is-copied');
      window.setTimeout(() => button.classList.remove('is-copied'), 1600);
    });
  }

  function handlePortfolioFilter(event) {
    const button = event.target.closest('[data-np-filter]');
    if (!button) {
      return;
    }
    const filter = button.getAttribute('data-np-filter') || 'all';
    document.querySelectorAll('[data-np-filter]').forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
    document.querySelectorAll('[data-np-tags]').forEach((item) => {
      const tags = (item.getAttribute('data-np-tags') || '').toLowerCase();
      const show = filter === 'all' || tags.split(/\s+/).includes(filter);
      item.hidden = !show;
    });
  }

  function handleMailto(event) {
    const form = event.target.closest('[data-np-mailto]');
    if (!form || event.target !== form) {
      return;
    }
    event.preventDefault();
    const email = form.getAttribute('data-np-mailto');
    const address = form.querySelector('[name="email"]')?.value?.trim() ?? '';
    const payload = form.querySelector('[name="message"]')?.value?.trim() ?? '';
    if (!email) {
      return;
    }
    const subject = encodeURIComponent('ESTABLISH_CONNECTION');
    const body = encodeURIComponent(`From: ${address}\n\n${payload}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-np-theme-toggle]')) {
      handleThemeToggle();
    }
    handleCopyLink(event);
    handlePortfolioFilter(event);
  });

  document.addEventListener('submit', handleMailto);

  setTheme(currentTheme());
  runDataStream();
})();
