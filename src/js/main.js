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

  /**
   * Soft fade-up of section headers and cards as they scroll into view (runs once per element).
   * Elements are only hidden after JS opts in, so content stays visible if JS fails or
   * the visitor prefers reduced motion.
   */
  function initScrollReveal() {
    const REVEAL_SELECTOR = [
      'main section[id] .kc-section-header',
      '.kc-info-card',
      '.kc-portrait-panel',
      '.kc-course-card',
      '.kc-skill-card',
      '.kc-mentorship-banner',
      '.kc-pricing-card',
      '.kc-delivery-card',
      '.kc-trial-banner',
      '.kc-marquee-viewport',
      '.kc-faq-accordion',
      '.kc-cta-card',
    ].join(',');
    const MAX_STAGGER_STEPS = 4;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    if (!targets.length) return;

    targets.forEach((el) => el.classList.add('kc-reveal'));

    const observer = new IntersectionObserver(
      (entries) => {
        // Elements entering together (e.g. a row of cards) cascade one after another
        let step = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delayStep = Math.min(step, MAX_STAGGER_STEPS);
          if (delayStep > 0) el.classList.add(`kc-reveal-d${delayStep}`);
          el.classList.add('is-visible');
          observer.unobserve(el);
          // Hand transitions back to the card's own hover styles once the reveal is done
          const onRevealEnd = (event) => {
            if (event.target !== el || event.propertyName !== 'opacity') return;
            el.removeEventListener('transitionend', onRevealEnd);
            el.classList.remove('kc-reveal', 'is-visible', `kc-reveal-d${delayStep}`);
          };
          el.addEventListener('transitionend', onRevealEnd);
          step += 1;
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    targets.forEach((el) => observer.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initMobileNavAutoClose();
    initLanguageSwitcher();
    initActiveNavHighlight();
  });
})();
