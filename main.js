// Trusted Types policy for CSP compliance
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (string) => string
  });
}

// Activate font stylesheet once loaded asynchronously
const fontStylesheet = document.getElementById('font-stylesheet');
if (fontStylesheet) {
  fontStylesheet.addEventListener('load', function () {
    this.media = 'all';
  });
}

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close menu when clicking any nav link
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });
}

// Scroll progress bar
const progressBar = document.getElementById('progressBar');
if (progressBar) {
  let progressTicking = false;
  window.addEventListener('scroll', () => {
    if (!progressTicking) {
      window.requestAnimationFrame(() => {
        const h = document.documentElement;
        const maxScroll = h.scrollHeight - h.clientHeight;
        const scrolled = maxScroll > 0 ? (h.scrollTop / maxScroll) * 100 : 0;
        progressBar.style.width = scrolled + '%';
        progressTicking = false;
      });
      progressTicking = true;
    }
  }, { passive: true });
}

// Stat count-up on first visibility
const statEls = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 900;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
statEls.forEach(el => statObserver.observe(el));

// Copy text to clipboard with button feedback
function copyLink(btn, url, announcement = 'Link copied to clipboard') {
  navigator.clipboard.writeText(url).then(() => {
    btn.classList.add('copied');
    const svg = btn.querySelector('svg');
    const original = svg.innerHTML;
    svg.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) announcer.textContent = announcement;
    setTimeout(() => {
      btn.classList.remove('copied');
      svg.innerHTML = original;
      if (announcer) announcer.textContent = '';
    }, 1500);
  });
}

// Drag & touch carousel
function initCarousel(config) {
  const carousel = document.getElementById(config.carouselId);
  if (!carousel) return;
  const viewport = carousel.querySelector(config.viewportSelector);
  const track = carousel.querySelector(config.trackSelector);
  const realSlides = Array.from(track.children);
  const total = realSlides.length;

  function getMetrics() {
    if (!config.peek) return { step: 100, offset: 0, gap: 0 };
    const isMobile = window.innerWidth <= 720;
    const cellWidth = isMobile ? 88 : config.cellWidth;
    const gapPercent = isMobile ? 1 : 2;
    const step = cellWidth + 2 * gapPercent;
    const offset = (100 - cellWidth) / 2;
    return { step, offset, gap: gapPercent };
  }

  // Infinite loop clones (real slides at DOM 1..total)
  function sanitizeClone(clone) {
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.querySelectorAll('[data-expand-target]').forEach((el) => el.removeAttribute('data-expand-target'));
    clone.querySelectorAll('[data-copy-url]').forEach((el) => el.removeAttribute('data-copy-url'));
    clone.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  }

  const firstClone = sanitizeClone(realSlides[0].cloneNode(true));
  const lastClone = sanitizeClone(realSlides[total - 1].cloneNode(true));
  track.appendChild(firstClone);
  track.insertBefore(lastClone, track.firstChild);
  const allSlides = Array.from(track.children);

  const dotsWrap = document.getElementById(config.dotsId);
  const prevBtn = config.prevId ? document.getElementById(config.prevId) : null;
  const nextBtn = config.nextId ? document.getElementById(config.nextId) : null;
  const announcer = document.getElementById('a11y-announcer');

  let index = 1; // DOM position 1 = real slide 0
  let isDragging = false;
  let startX = 0;
  let dragDeltaPercent = 0;
  let moved = false;

  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.setAttribute('aria-label', config.dotLabel(i, total));
    dot.addEventListener('click', () => goTo(i + 1));
    dotsWrap.appendChild(dot);
  }
  const dots = Array.from(dotsWrap.children);

  function realIndexFromDom(domIndex) {
    return ((domIndex - 1) % total + total) % total;
  }

  function render(animate) {
    track.style.transition = animate ? '' : 'none';
    const { step, offset, gap } = getMetrics();
    const shift = -(index * step) - gap + offset;
    track.style.transform = `translateX(calc(${shift}% + ${dragDeltaPercent}%))`;
    if (!animate) {
      track.offsetHeight; // Force reflow before next transition
    }
    allSlides.forEach((s, i) => s.classList.toggle('active', i === index));
    const r = realIndexFromDom(index);
    dots.forEach((d, i) => {
      const isActive = i === r;
      d.classList.toggle('active', isActive);
      d.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  let isAnimating = false;

  function goTo(newIndex, announce) {
    if (isAnimating) return;
    index = newIndex;
    dragDeltaPercent = 0;
    isAnimating = true;
    render(true);
    if (announce !== false && announcer) {
      const r = realIndexFromDom(index);
      announcer.textContent = config.announceText(r, total, realSlides[r]);
    }
  }

  // Silent snap from decoy clone back to matching real slide
  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || (e.propertyName && e.propertyName !== 'transform')) return;
    if (index === 0) {
      index = total;
      render(false);
    } else if (index === total + 1) {
      index = 1;
      render(false);
    }
    isAnimating = false;
  });

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));

  carousel.setAttribute('tabindex', '0');
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
  });

  function isInteractive(target) {
    return target.closest('a, button');
  }

  track.addEventListener('pointerdown', (e) => {
    if (isInteractive(e.target)) return;
    isDragging = true;
    moved = false;
    startX = e.clientX;
    track.classList.add('dragging');
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 4) moved = true;
    const viewportWidth = viewport.getBoundingClientRect().width || 1;
    dragDeltaPercent = (deltaX / viewportWidth) * 100;
    render(false);
  });

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('dragging');
    const threshold = 18;
    if (dragDeltaPercent <= -threshold) {
      goTo(index + 1);
    } else if (dragDeltaPercent >= threshold) {
      goTo(index - 1);
    } else {
      dragDeltaPercent = 0;
      render(true);
    }
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('click', (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
      return;
    }
    // In peek mode, clicking a non-active slide brings it to center
    if (config.peek) {
      const realTarget = document.elementFromPoint(e.clientX, e.clientY);
      const clickedSlide = realTarget ? realTarget.closest(config.trackSelector + ' > *') : null;
      if (clickedSlide) {
        const domIdx = allSlides.indexOf(clickedSlide);
        if (domIdx !== -1 && domIdx !== index) {
          e.preventDefault();
          e.stopPropagation();
          goTo(domIdx);
        }
      }
    }
  }, true);

  // Trackpad horizontal swipe with cooldown to absorb trailing momentum
  let wheelAccum = 0;
  let cooldownUntil = 0;
  viewport.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();

    const now = performance.now();
    if (isAnimating || now < cooldownUntil) {
      wheelAccum = 0;
      return;
    }

    wheelAccum += e.deltaX;
    if (Math.abs(wheelAccum) > 60) {
      goTo(wheelAccum > 0 ? index + 1 : index - 1);
      wheelAccum = 0;
      cooldownUntil = now + 650;
    }
  }, { passive: false });

  window.addEventListener('resize', () => {
    render(false);
  });

  render(false);
}

initCarousel({
  carouselId: 'projectCarousel',
  viewportSelector: '.carousel-viewport',
  trackSelector: '.carousel-track',
  dotsId: 'carouselDots',
  prevId: 'carouselPrev',
  nextId: 'carouselNext',
  peek: true,
  cellWidth: 50,
  dotLabel: (i, total) => 'Go to project ' + (i + 1) + ' of ' + total,
  announceText: (i, total, slideEl) => {
    const nameEl = slideEl.querySelector('.project-name');
    return 'Showing project ' + (i + 1) + ' of ' + total + ': ' + (nameEl ? nameEl.textContent : '');
  }
});

initCarousel({
  carouselId: 'experienceCarousel',
  viewportSelector: '.hero-viewport',
  trackSelector: '.hero-track',
  dotsId: 'experienceDots',
  prevId: 'experiencePrev',
  nextId: 'experienceNext',
  dotLabel: (i, total) => 'Go to role ' + (i + 1) + ' of ' + total,
  announceText: (i, total, slideEl) => {
    const titleEl = slideEl.querySelector('.hero-title');
    const expBg = document.querySelector('.experience-bg');
    if (expBg && slideEl) {
      const bgImg = slideEl.style.backgroundImage;
      if (bgImg) expBg.style.setProperty('--experience-bg-image', bgImg);
    }
    return 'Showing role ' + (i + 1) + ' of ' + total + ': ' + (titleEl ? titleEl.textContent : '');
  }
});

// Expand/collapse the "View Details" panel on each experience hero slide
document.querySelectorAll('[data-expand-target]').forEach((btn) => {
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById(btn.dataset.expandTarget);
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const label = btn.querySelector('.hero-cta-label');
    if (label) label.textContent = isOpen ? 'Hide Details' : 'View Details';
    const summary = btn.dataset.summaryTarget ? document.getElementById(btn.dataset.summaryTarget) : null;
    if (summary) summary.classList.toggle('hero-desc-hidden', isOpen);
  });
});

// Wire up all copy buttons via data attributes instead of inline onclick
document.querySelectorAll('[data-copy-url]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyLink(btn, btn.dataset.copyUrl, 'Project link copied to clipboard');
  });
});

document.querySelectorAll('[data-copy-email]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    copyLink(btn, btn.dataset.copyEmail, 'Email address copied to clipboard');
  });
});

// Scrollspy: Highlight active nav link on scroll
const spySections = document.querySelectorAll('section[id], header[id]');
const navItemLinks = document.querySelectorAll('.nav-links a');
if (spySections.length && navItemLinks.length && 'IntersectionObserver' in window) {
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navItemLinks.forEach((link) => {
          link.classList.toggle('active-link', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  spySections.forEach((section) => spyObserver.observe(section));
}

// Floating Back to Top Button
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('is-visible');
    } else {
      backToTopBtn.classList.remove('is-visible');
    }
  }, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });
}
