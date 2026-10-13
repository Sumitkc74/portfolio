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
    clone.querySelectorAll('a, button, summary').forEach((el) => el.setAttribute('tabindex', '-1'));
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
    return target.closest('a, button, summary');
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


// Reveal section headings and cards once, with a short stagger within each group.
const revealMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !revealMotion.matches) {
  const revealSelector = '.section-eyebrow, h2.tagline, .skills-grid .skill-card, #education .card-item, .cert-item, .resume-frame, .contact-card';
  const revealElements = Array.from(document.querySelectorAll(revealSelector));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (!revealMotion.matches && !el.contains(document.activeElement)) {
        const siblings = Array.from(el.parentElement.children).filter((child) => child.matches(revealSelector));
        const delay = Math.min(siblings.indexOf(el), 3) * 70;
        el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('scroll-reveal');
        el.addEventListener('animationend', () => {
          el.classList.remove('scroll-reveal');
          el.style.removeProperty('--reveal-delay');
        }, { once: true });
      }
      revealObserver.unobserve(el);
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
  revealElements.forEach((el) => revealObserver.observe(el));

  revealMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    revealObserver.disconnect();
    revealElements.forEach((el) => {
      el.classList.remove('scroll-reveal');
      el.style.removeProperty('--reveal-delay');
    });
  });
}


// A short hello on click, Enter, or Space; no animation for reduced motion.
const pixelRobot = document.getElementById('pixelRobot');
if (pixelRobot) {
  let robotHelloTimer;
  pixelRobot.addEventListener('click', () => {
    clearTimeout(robotHelloTimer);
    pixelRobot.classList.remove('is-waving');
    void pixelRobot.offsetWidth;
    pixelRobot.classList.add('is-waving');
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) announcer.textContent = 'The pixel robot says hello!';
    robotHelloTimer = setTimeout(() => {
      pixelRobot.classList.remove('is-waving');
      if (announcer && announcer.textContent === 'The pixel robot says hello!') announcer.textContent = '';
    }, 1200);
  });
}


// Follow a mouse pointer with small eye movements, without moving the robot.
if (pixelRobot) {
  const robotMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let robotPointerFrame = 0;
  let robotPointerX = 0;
  let robotPointerY = 0;
  const resetRobotGaze = () => {
    cancelAnimationFrame(robotPointerFrame);
    robotPointerFrame = 0;
    pixelRobot.style.removeProperty('--robot-look-x');
    pixelRobot.style.removeProperty('--robot-look-y');
  };
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || robotMotion.matches) return;
    robotPointerX = event.clientX;
    robotPointerY = event.clientY;
    if (robotPointerFrame) return;
    robotPointerFrame = requestAnimationFrame(() => {
      robotPointerFrame = 0;
      if (robotMotion.matches) return;
      const rect = pixelRobot.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const dx = robotPointerX - (rect.left + rect.width / 2);
      const dy = robotPointerY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      const strength = Math.min(distance / 120, 1);
      pixelRobot.style.setProperty('--robot-look-x', (distance ? dx / distance * 3 * strength : 0) + 'px');
      pixelRobot.style.setProperty('--robot-look-y', (distance ? dy / distance * 2 * strength : 0) + 'px');
    });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetRobotGaze);
  window.addEventListener('blur', resetRobotGaze);
  robotMotion.addEventListener('change', resetRobotGaze);
}


// Start at the original hero position, then run after the scrolling page.
if (pixelRobot) {
  const companionMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const companionHero = pixelRobot.closest('.hero');
  let companionFrame = 0;
  let companionLastTime = 0;
  let companionY = 0;
  let companionX = 0;

  function updateCompanion(now) {
    companionFrame = 0;
    if (pixelRobot.hidden || companionMotion.matches) {
      pixelRobot.classList.remove('is-companion', 'is-walking', 'is-running-up');
      pixelRobot.style.removeProperty('--robot-walk-x');
      pixelRobot.style.removeProperty('--robot-walk-y');
      companionY = 0;
      companionX = 0;
      companionLastTime = 0;
      return;
    }
    const dt = companionLastTime ? Math.min(now - companionLastTime, 50) : 16;
    companionLastTime = now;
    const originY = companionHero.getBoundingClientRect().top + window.scrollY + pixelRobot.offsetTop;
    const targetY = Math.max(0, window.scrollY + Math.min(originY, window.innerHeight * 0.35) - originY);
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    // Stay near the original lane, moving slightly outward rather than over text.
    const rightSpace = Math.max(0, (window.innerWidth - companionHero.getBoundingClientRect().right) - 8);
    const targetX = Math.min(36, rightSpace) * Math.min(window.scrollY / 160, 1)
      + Math.sin(progress * Math.PI) * Math.min(10, rightSpace / 3);
    const distanceY = targetY - companionY;
    const distanceX = targetX - companionX;
    const catchUp = 1 - Math.exp(-dt / 200);
    companionY += distanceY * catchUp;
    companionX += distanceX * catchUp;
    const running = Math.abs(distanceY) > 0.75 || Math.abs(distanceX) > 0.5;
    if (!running) {
      companionY = targetY;
      companionX = targetX;
    }
    pixelRobot.classList.add('is-companion');
    pixelRobot.classList.toggle('is-walking', running);
    pixelRobot.classList.toggle('is-running-up', running && distanceY < 0);
    pixelRobot.style.setProperty('--robot-walk-x', companionX + 'px');
    pixelRobot.style.setProperty('--robot-walk-y', companionY + 'px');
    positionRobotSpeech();
    pixelRobot.style.setProperty('--robot-lean', distanceY >= 0 ? '3deg' : '-3deg');
    pixelRobot.style.setProperty('--robot-stride', Math.abs(distanceY) > 40 ? '0.26s' : '0.36s');
    if (running) companionFrame = requestAnimationFrame(updateCompanion);
    else companionLastTime = 0;
  }
  function scheduleCompanion() {
    if (!companionFrame) companionFrame = requestAnimationFrame(updateCompanion);
  }
  window.addEventListener('scroll', scheduleCompanion, { passive: true });
  window.addEventListener('resize', scheduleCompanion, { passive: true });
  companionMotion.addEventListener('change', scheduleCompanion);
  pixelRobot.addEventListener('robot-restored', () => {
    const originY = companionHero.getBoundingClientRect().top + window.scrollY + pixelRobot.offsetTop;
    companionY = Math.max(0, window.scrollY + Math.min(originY, window.innerHeight * 0.35) - originY);
    companionLastTime = 0;
    scheduleCompanion();
  });
  scheduleCompanion();
}


// Short section hints, shown once per section during this visit.
const robotSpeech = document.getElementById('robotSpeech');
const robotSpeechText = document.getElementById('robotSpeechText');
const robotSpeechClose = document.getElementById('robotSpeechClose');
const robotRemove = document.getElementById('robotRemove');
const robotRestore = document.getElementById('robotRestore');
function positionRobotSpeech() {
  if (!pixelRobot || pixelRobot.hidden) return;
  const rect = pixelRobot.getBoundingClientRect();
  if (robotRemove && !robotRemove.hidden) {
    robotRemove.style.left = Math.max(8, Math.min(rect.right - 16, window.innerWidth - 36)) + 'px';
    robotRemove.style.top = Math.max(68, Math.min(rect.top - 12, window.innerHeight - 36)) + 'px';
  }
  if (!robotSpeech || robotSpeech.hidden) return;
  const width = robotSpeech.offsetWidth;
  const height = robotSpeech.offsetHeight;
  robotSpeech.style.left = Math.max(12, Math.min(rect.left - width - 10, window.innerWidth - width - 12)) + 'px';
  robotSpeech.style.top = Math.max(72, Math.min(rect.top, window.innerHeight - height - 12)) + 'px';
}
if (pixelRobot && robotSpeech && robotSpeechText && robotSpeechClose) {
  const hints = {
    experience: "Here's where I've put my skills to work.",
    projects: 'Click a walkthrough to see how it works.',
    skills: "Here's what I build with.",
    education: 'The learning behind the projects.',
    certifications: 'Click a credential to verify it.',
    resume: 'Want a copy? Download my resume.',
    contact: "Let's build something together."
  };
  const hintSections = Array.from(document.querySelectorAll('section[id]')).filter(el => hints[el.id]);
  const shownHints = new Set();
  let hintTimer;
  let robotRemoveTimer;
  let hintScrollTimer;
  let currentHint = '';
  function hideRobotSpeech() {
    clearTimeout(hintTimer);
    robotSpeech.hidden = true;
  }
  robotSpeechClose.addEventListener('click', () => {
    hideRobotSpeech();
    pixelRobot.focus({ preventScroll: true });
  });
  robotSpeech.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideRobotSpeech();
      pixelRobot.focus({ preventScroll: true });
    }
  });
  function checkRobotSection() {
    if (pixelRobot.hidden || robotSpeech.contains(document.activeElement)) return;
    const probe = window.innerHeight * 0.45;
    const section = hintSections.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    });
    const sectionId = section ? section.id : '';
    if (sectionId === currentHint) return;
    currentHint = sectionId;
    hideRobotSpeech();
    if (!section || shownHints.has(sectionId)) return;
    shownHints.add(sectionId);
    robotSpeechText.textContent = hints[sectionId];
    robotSpeech.hidden = false;
    positionRobotSpeech();
    hintTimer = setTimeout(hideRobotSpeech, 3000);
  }
  pixelRobot.addEventListener('click', () => {
    clearTimeout(hintTimer);
    robotSpeechText.textContent = hints[currentHint] || 'Hello! Explore my projects, or scroll to see what I build.';
    robotSpeech.hidden = false;
    if (robotRemove) {
      clearTimeout(robotRemoveTimer);
      robotRemove.hidden = false;
      robotRemoveTimer = setTimeout(() => { robotRemove.hidden = true; }, 3000);
    }
    positionRobotSpeech();
    hintTimer = setTimeout(hideRobotSpeech, 3000);
  });
  if (robotRemove) {
    robotRemove.addEventListener('click', () => {
      clearTimeout(robotRemoveTimer);
      hideRobotSpeech();
      pixelRobot.hidden = true;
      robotRemove.hidden = true;
      if (robotRestore) robotRestore.hidden = false;
      pixelRobot.classList.remove('is-walking', 'is-waving');
      const main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    });
  }
  if (robotRestore) {
    robotRestore.addEventListener('click', () => {
      pixelRobot.hidden = false;
      robotRestore.hidden = true;
      pixelRobot.dispatchEvent(new Event('robot-restored'));
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pixelRobot.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      requestAnimationFrame(() => {
        pixelRobot.click();
        robotSpeechText.textContent = "I'm back!";
        positionRobotSpeech();
        pixelRobot.focus({ preventScroll: true });
      });
    });
  }
  window.addEventListener('scroll', () => {
    positionRobotSpeech();
    clearTimeout(hintScrollTimer);
    hintScrollTimer = setTimeout(checkRobotSection, 120);
  }, { passive: true });
  window.addEventListener('resize', positionRobotSpeech, { passive: true });
  checkRobotSection();
  // Greet visitors after the page has loaded, using the same wave and bubble.
  function greetWithRobot() {
    if (!pixelRobot.hidden) {
      pixelRobot.click();
      if (robotRemove) robotRemove.hidden = true;
    }
  }
  if (document.readyState === 'complete') {
    greetWithRobot();
  } else {
    window.addEventListener('load', greetWithRobot, { once: true });
  }
}
