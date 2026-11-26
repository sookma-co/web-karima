(() => {
  'use strict';

  const ALLOWED_LANGS = new Set(['en', 'de', 'id']);
  const DEFAULT_LANG = 'en';

  let target = DEFAULT_LANG;
  try {
    const saved = window.localStorage.getItem('kc_lang');
    if (saved && ALLOWED_LANGS.has(saved)) {
      target = saved;
    }
  } catch {
    // Fallback safely to default English
  }

  const hash = window.location.hash && /^#[a-zA-Z0-9_-]+$/.test(window.location.hash)
    ? window.location.hash
    : '';

  window.location.replace(`/${target}/${hash}`);
})();
