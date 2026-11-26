(() => {
  'use strict';

  const ALLOWED_LANGS = new Set(['en', 'de', 'id']);
  const STORAGE_KEY = 'kc_lang';

  /**
   * Collapse the mobile/tablet navigation drawer when an anchor link is clicked.
   */
  function initMobileNavAutoClose() {
    const collapseEl = document.getElementById('karimaNavbarNav');
    if (!collapseEl) return;

    const navLinks = collapseEl.querySelectorAll('a[href^="#"]');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (!collapseEl.classList.contains('show')) return;
        const bsCollapse = window.bootstrap?.Collapse?.getOrCreateInstance(collapseEl, {
          toggle: false,
        });
        bsCollapse?.hide();
      });
    });
  }

  /**
   * Preserve current section hash and remember functional language preference
   * when switching between /en/, /de/, and /id/.
   */
  function initLanguageSwitcher() {
    const langLinks = document.querySelectorAll('a[data-lang-choice]');
    langLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const chosen = link.getAttribute('data-lang-choice');
        if (!chosen || !ALLOWED_LANGS.has(chosen)) return;

        try {
          window.localStorage.setItem(STORAGE_KEY, chosen);
        } catch {
          // Ignore storage restrictions (e.g. private browsing)
        }

        const currentHash = window.location.hash;
        if (currentHash && /^#[a-zA-Z0-9_-]+$/.test(currentHash)) {
          event.preventDefault();
          window.location.assign(`/${chosen}/${currentHash}`);
        }
      });
    });
  }

  /**
   * Highlight active navigation link based on scroll position.
   */
  function initActiveNavHighlight() {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.kc-nav-link[href^="#"]'));
    if (!sections.length || !navLinks.length || !('IntersectionObserver' in window)) return;

    const linkMap = new Map(navLinks.map((a) => [a.getAttribute('href')?.slice(1), a]));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => link.classList.remove('active'));
          const active = linkMap.get(entry.target.id);
          if (active) active.classList.add('active');
        });
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNavAutoClose();
    initLanguageSwitcher();
    initActiveNavHighlight();
  });
})();
