// Required because the CSP enforces Trusted Types for script-controlled HTML.
// This policy simply passes strings through unchanged (we don't handle any
// user-supplied content, only our own fixed SVG markup).
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (string) => string
  });
}

// Swap the async-loaded font stylesheet from print -> all once it's ready
// (replaces the inline onload attribute so script-src can drop 'unsafe-inline')
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
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.style.display === 'flex';
    navLinks.style.display = isOpen ? 'none' : 'flex';
    navLinks.style.cssText += 'flex-direction:column; position:fixed; top:64px; right:0; background:var(--cream-card); padding:20px 28px; border-radius:0 0 0 14px; box-shadow:0 8px 24px rgba(0,0,0,0.1);';
  });
}

// Scroll progress bar
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  progressBar.style.width = scrolled + '%';
});

// Stat count-up, once, on first visibility
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

// Copy project link
function copyLink(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.classList.add('copied');
    const svg = btn.querySelector('svg');
    const original = svg.innerHTML;
    svg.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) announcer.textContent = 'Project link copied to clipboard';
    setTimeout(() => {
      btn.classList.remove('copied');
      svg.innerHTML = original;
      if (announcer) announcer.textContent = '';
    }, 1500);
  });
}

// Wire up all copy-link buttons via data-copy-url instead of inline onclick
// (replaces inline onclick attributes so script-src can drop 'unsafe-inline')
document.querySelectorAll('[data-copy-url]').forEach((btn) => {
  btn.addEventListener('click', () => {
    copyLink(btn, btn.dataset.copyUrl);
  });
});
