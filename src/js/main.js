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
      '.kc-marquee',
      '.kc-testimonial-static .kc-testimonial-card',
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

  /**
   * Testimonials marquee that visitors can also move themselves.
   * The viewport becomes a native horizontal scroller (touch swipe, trackpad, wheel + shift),
   * mouse users can click-and-drag, and an auto-glide keeps it moving when nobody interacts.
   * The duplicated card set lets the scroll position wrap around seamlessly in both directions.
   */
  function initTestimonialMarquee() {
    const viewport = document.querySelector('.kc-marquee-viewport');
    const track = viewport?.querySelector('.kc-marquee-track');
    if (!viewport || !track) return;

    const AUTO_SPEED_PX_PER_S = 36; // ≈ one card every 12s, same pace as the CSS fallback
    const RESUME_DELAY_MS = 2500; // pause after the visitor lets go before gliding again
    const DRAG_THRESHOLD_PX = 5;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    viewport.classList.add('is-interactive');

    // Width of one full card set (half the track plus half a gap) — where the loop wraps
    const loopWidth = () => {
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      return (track.scrollWidth + gap) / 2;
    };

    let position = 0; // float scroll position (scrollLeft may be rounded by the browser)
    let hovering = false;
    let holding = false; // pointer/touch down or keyboard focus inside
    let resumeAt = 0;
    let inView = false;
    let lastFrame = null;
    let rafId = null;

    const wrap = () => {
      const width = loopWidth();
      if (width <= 0) return;
      if (position >= width) position -= width;
      else if (position < 1) position += width;
    };

    const applyPosition = () => {
      wrap();
      viewport.scrollLeft = position;
    };

    const pauseFor = (ms = RESUME_DELAY_MS) => {
      resumeAt = performance.now() + ms;
    };

    const isAutoRunning = (now) => !reduceMotion && inView && !hovering && !holding && now >= resumeAt && !document.hidden;

    const tick = (now) => {
      rafId = null;
      if (lastFrame !== null && isAutoRunning(now)) {
        const dt = Math.min(now - lastFrame, 100) / 1000; // clamp after tab switches
        position += AUTO_SPEED_PX_PER_S * dt;
        applyPosition();
      }
      lastFrame = now;
      schedule();
    };

    const schedule = () => {
      if (rafId === null && inView && !reduceMotion) rafId = requestAnimationFrame(tick);
    };

    // Visitor scrolled natively (swipe, trackpad, wheel, keyboard): follow it and pause briefly
    viewport.addEventListener(
      'scroll',
      () => {
        if (Math.abs(viewport.scrollLeft - position) > 2) {
          position = viewport.scrollLeft;
          pauseFor();
          if (position < 1 || position >= loopWidth()) applyPosition();
        }
      },
      { passive: true }
    );

    viewport.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') hovering = true;
    });
    viewport.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') hovering = false;
    });

    // Touch: let the browser handle the swipe natively, just hold the auto-glide
    viewport.addEventListener('touchstart', () => { holding = true; }, { passive: true });
    viewport.addEventListener('touchend', () => { holding = false; pauseFor(); }, { passive: true });
    viewport.addEventListener('touchcancel', () => { holding = false; pauseFor(); }, { passive: true });

    // Mouse: click-and-drag to move the cards
    let drag = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag ={ startX: e.clientX, startPos: position, moved: false, id: e.pointerId };
      holding = true;
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!drag.moved) {
        drag.moved = true;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(e.pointerId);
      }
      const target = drag.startPos - dx;
      position = target;
      applyPosition();
      drag.startPos += position - target; // shift the anchor if the loop wrapped, so dragging stays smooth
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved) {
        viewport.classList.remove('is-dragging');
        // Swallow the click that follows a drag so it doesn't activate anything underneath
        viewport.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
      }
      drag = null;
      holding = false;
      pauseFor();
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // Keyboard users: pause while focus is inside (e.g. reading a long quote)
    viewport.addEventListener('focusin', () => { holding = true; });
    viewport.addEventListener('focusout', () => { holding = false; pauseFor(); });

    // Only run the animation loop while the testimonials are on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        lastFrame = null;
        schedule();
      }).observe(viewport);
    } else {
      inView = true;
      schedule();
    }

    position = viewport.scrollLeft;
    applyPosition();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initTestimonialMarquee();
    initMobileNavAutoClose();
    initLanguageSwitcher();
    initActiveNavHighlight();
  });
})();
