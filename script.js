/* LibraConnect interactions (vanilla JS) */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Mobile hamburger menu ---------- */
  const sidebar = $('#sidebar');
  const overlay = $('#overlay');
  const menuBtn = $('#menuBtn');
  menuBtn.setAttribute('aria-expanded', 'false');

  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.firstElementChild.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  }
  menuBtn.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
  overlay.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
  window.addEventListener('resize', () => window.innerWidth > 768 && setMenu(false));

  /* ---------- 2. Smooth scrolling + active nav state ---------- */
  const navItems = $$('.nav-item');

  function setActive(id) {
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.target === id));
  }

  function scrollToTarget(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'top') window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (id === 'search') setTimeout(() => $('#heroSearch').focus({ preventScroll: true }), 400);
  }

  navItems.forEach((item) =>
    item.addEventListener('click', (e) => {
      e.preventDefault();
      setActive(item.dataset.target);
      scrollToTarget(item.dataset.target);
      setMenu(false);
    })
  );

  // Logo returns home
  $('[data-home]').addEventListener('click', (e) => {
    e.preventDefault();
    setActive('top');
    scrollToTarget('top');
  });

  // Highlight the nav item for the section currently in view
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && setActive(en.target.id)),
      { rootMargin: '-40% 0px -50% 0px' }
    );
    ['search', 'featured', 'quick', 'recommended'].forEach((id) => spy.observe(document.getElementById(id)));
    window.addEventListener('scroll', () => window.scrollY < 60 && setActive('top'), { passive: true });
  }

  // Remaining placeholder links should not jump to the top of the page
  $$('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  /* ---------- 3. Search: validation, success message, filtering ---------- */
  const topInput = $('#topSearch');
  const heroInput = $('#heroSearch');
  const msg = $('#searchMsg');
  const cards = $$('.book-card');
  const forms = $$('.search');

  // Keep both search inputs in sync
  topInput.addEventListener('input', () => (heroInput.value = topInput.value));
  heroInput.addEventListener('input', () => (topInput.value = heroInput.value));

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'search-msg ' + (type || '');
  }

  function runSearch(raw) {
    const q = raw.trim().toLowerCase();
    forms.forEach((f) => f.classList.remove('invalid'));

    // Validation rules: required, at least 2 characters
    if (!q || q.length < 2) {
      forms.forEach((f) => f.classList.add('invalid'));
      showMsg(!q ? 'Please enter a book, author, or subject.' : 'Enter at least 2 characters to search.', 'error');
      return;
    }

    let found = 0;
    cards.forEach((card) => {
      const match = card.textContent.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
      if (match) found++;
    });
    showMsg(
      found ? `Success! Found ${found} book${found > 1 ? 's' : ''} matching "${raw.trim()}".` : `No books match "${raw.trim()}". Try another title or author.`,
      found ? 'success' : 'error'
    );
    scrollToTarget('featured');
  }

  forms.forEach((form) =>
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch($('input', form).value);
    })
  );

  // Clearing the input restores all books
  [topInput, heroInput].forEach((input) =>
    input.addEventListener('input', () => {
      forms.forEach((f) => f.classList.remove('invalid'));
      if (!input.value) {
        cards.forEach((c) => (c.style.display = ''));
        showMsg('');
      }
    })
  );

  /* ---------- 4. Featured books carousel (mobile) ---------- */
  const grid = $('.book-grid');
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';
  nav.innerHTML =
    '<button type="button" aria-label="Previous books"><i class="fa-solid fa-chevron-left"></i></button>' +
    '<button type="button" aria-label="Next books"><i class="fa-solid fa-chevron-right"></i></button>';
  $('.section-head').insertBefore(nav, $('.section-head .link'));
  const [prev, next] = $$('button', nav);

  const step = () => (cards.find((c) => c.offsetParent) || cards[0]).offsetWidth + 12;
  prev.addEventListener('click', () => grid.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => grid.scrollBy({ left: step(), behavior: 'smooth' }));

  function updateArrows() {
    prev.disabled = grid.scrollLeft <= 4;
    next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
  }
  grid.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  /* ---------- 5. Subtle scroll-reveal animations ---------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    const targets = $$('.hero, .section-head, .book-card, .quick, .reco');
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (el.classList.contains('book-card') ? (cards.indexOf(el) % 4) * 80 : 0) + 'ms';
    });
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          el.classList.add('in');
          io.unobserve(el);
          // Remove animation classes afterwards so hover effects work normally
          setTimeout(() => {
            el.classList.remove('reveal', 'in');
            el.style.transitionDelay = '';
          }, 900);
        }),
      { threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));
  }

  // Accordion/tabs: the design has no collapsible or tabbed content, so none are added.
})();
