(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 900px)');

  const storage = {
    get(key, fallback = null) {
      try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* Storage is optional */ }
    }
  };

  const readTerminalHistory = () => {
    try {
      const parsed = JSON.parse(storage.get('akash-qa-terminal-history', '[]') || '[]');
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice(-30) : [];
    } catch { return []; }
  };

  const state = {
    theme: storage.get('akash-theme', 'light'),
    terminalHistory: readTerminalHistory(),
    historyIndex: -1,
    paletteIndex: 0,
    scrollTicking: false,
    pointerTicking: false
  };

  /* ==========================================================================
     Theme Management (Dark / Light / Auto)
     ========================================================================== */
  const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const themeMeta = $('meta[name="theme-color"]');

  const resolvedTheme = () => state.theme === 'auto' ? (themeMedia.matches ? 'dark' : 'light') : state.theme;

  const syncThemeButtons = () => {
    $$('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === state.theme));
    });
    $$('[data-theme-value]').forEach(label => {
      label.textContent = state.theme.charAt(0).toUpperCase() + state.theme.slice(1);
    });
  };

  const applyTheme = (theme, persist = true) => {
    const nextTheme = ['light', 'dark', 'auto'].includes(theme) ? theme : 'dark';
    state.theme = nextTheme;
    const resolved = resolvedTheme();
    root.dataset.theme = resolved;
    root.dataset.themeChoice = nextTheme;
    if (themeMeta) themeMeta.setAttribute('content', resolved === 'dark' ? '#070a10' : '#f8f9fa');
    if (persist) storage.set('akash-theme', nextTheme);
    syncThemeButtons();
  };

  applyTheme(state.theme, false);
  themeMedia.addEventListener?.('change', () => { if (state.theme === 'auto') applyTheme('auto', false); });

  // Theme menu inside the primary navigation
  const themeDropdown = $('.nav-theme-control');
  const themeToggleBtn = $('#nav-theme-toggle');
  const closeThemeMenu = () => {
    themeDropdown?.classList.remove('is-open');
    themeToggleBtn?.setAttribute('aria-expanded', 'false');
  };

  themeToggleBtn?.addEventListener('click', event => {
    event.stopPropagation();
    const open = !themeDropdown?.classList.contains('is-open');
    themeDropdown?.classList.toggle('is-open', open);
    themeToggleBtn.setAttribute('aria-expanded', String(open));
  });

  $$('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
    applyTheme(button.dataset.themeChoice);
    closeThemeMenu();
    closeMobileMenu?.();
  }));

  document.addEventListener('click', event => {
    if (!themeDropdown?.contains(event.target)) closeThemeMenu();
  });

  /* ==========================================================================
     Header & Scroll Indicators
     ========================================================================== */
  const header = $('.site-header');
  const scrollProgress = $('.scroll-progress span');

  const updateScrollUI = () => {
    state.scrollTicking = false;
    const scrollTop = window.scrollY;
    header?.classList.toggle('is-scrolled', scrollTop > 25);
    if (scrollProgress) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.style.width = `${scrollable > 0 ? Math.min(100, (scrollTop / scrollable) * 100) : 0}%`;
    }
  };

  const requestScrollUI = () => {
    if (!state.scrollTicking) {
      state.scrollTicking = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  };

  window.addEventListener('scroll', requestScrollUI, { passive: true });
  window.addEventListener('resize', requestScrollUI, { passive: true });
  updateScrollUI();

  /* ==========================================================================
     Mobile Navigation Drawer
     ========================================================================== */
  const navMenu = $('#primary-nav');
  const mobileToggle = $('#mobile-toggle');

  const closeMobileMenu = () => {
    navMenu?.classList.remove('is-open');
    mobileToggle?.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  };

  const toggleMobileMenu = event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const isOpen = !navMenu?.classList.contains('is-open');
    navMenu?.classList.toggle('is-open', isOpen);
    mobileToggle?.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('menu-open', isOpen);
  };

  mobileToggle?.addEventListener('click', toggleMobileMenu);

  $$('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  // Stop click bubbling from inside the navigation drawer
  navMenu?.addEventListener('click', event => {
    if (!event.target.closest('.nav-link') && !event.target.closest('[data-theme-choice]')) {
      event.stopPropagation();
    }
  });

  document.addEventListener('click', event => {
    if (!navMenu?.classList.contains('is-open')) return;
    if (!navMenu.contains(event.target) && !mobileToggle?.contains(event.target)) {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeMobileMenu();
    }
  }, { passive: true });

  /* ==========================================================================
     Section Active Navigation Tracking
     ========================================================================== */
  const sections = $$('section[id]');
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          $$('.nav-link').forEach(link => {
            link.setAttribute('aria-current', link.getAttribute('href') === `#${id}` ? 'page' : 'false');
          });
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

    sections.forEach(section => navObserver.observe(section));
  }

  /* ==========================================================================
     Scroll Reveal Observer
     ========================================================================== */
  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotionQuery.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-visible'));
  }

  /* ==========================================================================
     Animated Number Counters
     ========================================================================== */
  const counters = $$('[data-counter]');
  const animateCounter = el => {
    const target = Number(el.dataset.target || 0);
    const suffix = el.dataset.suffix || '';
    if (reduceMotionQuery.matches || target === 0) {
      el.textContent = `${target}${suffix}`;
      return;
    }
    const startTime = performance.now();
    const duration = 1200;
    const tick = now => {
      const progress = Math.min(1, (now - startTime) / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(target * easeOut)}${suffix}`;
      if (progress < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && !reduceMotionQuery.matches) {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  /* ==========================================================================
     Hero Interactive Spotlight
     ========================================================================== */
  const heroSection = $('.hero-section');
  const heroVisual = $('.hero-visual-card');

  const onPointerMove = event => {
    if (reduceMotionQuery.matches || state.pointerTicking || !heroSection) return;
    state.pointerTicking = true;
    window.requestAnimationFrame(() => {
      state.pointerTicking = false;
      const rect = heroSection.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      heroSection.style.setProperty('--spot-x', `${x}px`);
      heroSection.style.setProperty('--spot-y', `${y}px`);
      if (heroVisual && window.innerWidth > 960) {
        const tiltX = (x / rect.width - 0.5) * 8;
        const tiltY = (y / rect.height - 0.5) * 6;
        heroVisual.style.transform = `perspective(1000px) rotateY(${tiltX * 0.4}deg) rotateX(${-tiltY * 0.4}deg) translate3d(${tiltX}px, ${tiltY}px, 0)`;
      }
    });
  };

  heroSection?.addEventListener('pointermove', onPointerMove, { passive: true });
  heroSection?.addEventListener('pointerleave', () => {
    if (heroVisual) heroVisual.style.transform = '';
  }, { passive: true });

  /* ==========================================================================
     Tools Filter Tabs
     ========================================================================== */
  const filterButtons = $$('.tools-filter-btn');
  const toolCards = $$('.tool-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const category = btn.dataset.filter;

      toolCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'flex';
          window.requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => { card.style.display = 'none'; }, 200);
        }
      });
    });
  });

  /* ========================================================================
     Project Filters by Company
     ======================================================================== */
  const projectFilterButtons = $$('.projects-filter-btn');
  const projectCards = $$('.project-card');

  projectFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      projectFilterButtons.forEach(button => {
        button.classList.toggle('is-active', button === btn);
        button.setAttribute('aria-pressed', String(button === btn));
      });

      const company = btn.dataset.projectFilter;
      projectCards.forEach(card => {
        const isMatch = company === 'all' || card.dataset.company === company;
        card.hidden = !isMatch;
        card.setAttribute('aria-hidden', String(!isMatch));
      });
    });
  });

  /* ==========================================================================
     Project Deep-Dive Modals
     ========================================================================== */
  const projectDetails = {
    'hincol': {
      title: 'HINCOL — Web & Mobile Platform',
      company: 'Publicis Groupe (Oct 2025 – Present)',
      role: 'Senior Quality Analyst – Web & Mobile',
      overview: 'HINCOL is an enterprise-scale web and mobile application for India’s premier manufacturer of bitumen derivatives, powering mission-critical logistics, operations, and quality road construction projects across the nation.',
      responsibilities: [
        'Reviewed business and functional requirements (FRD/BRD) in early sprint phases to identify testing scope and eliminate requirement ambiguity.',
        'Designed, authored, and executed comprehensive test scenarios and test cases covering multi-tier commercial workflows, project estimations, and plant dispatch logic.',
        'Performed thorough functional, regression, smoke, sanity, and integration testing across responsive web portals and native iOS/Android mobile applications.',
        'Conducted extensive cross-platform mobile testing on real Android and iOS devices, validating UI responsiveness, gestures, GPS location tracking, and offline data sync.',
        'Reported, categorized, and managed defect lifecycles through JIRA with precise reproduction steps, screen recordings, and logs.',
        'Partnered actively with developers, project managers, and client stakeholders in Agile ceremonies to accelerate bug triage and resolution.'
      ],
      methodologies: ['Functional Testing', 'Regression Testing', 'Mobile App Testing (iOS & Android)', 'Smoke & Sanity', 'SIT', 'UAT Support'],
      tools: ['JIRA', 'Postman', 'BrowserStack', 'Lighthouse', 'MS Excel', 'Confluence']
    },
    'citroen': {
      title: 'Citroën — Automobile Digital Platform',
      company: 'Publicis Groupe (Jul 2024 – Apr 2026)',
      role: 'Senior QA',
      overview: 'A premium, high-traffic digital customer portal for Citroën India, providing customers with seamless vehicle discovery, custom 3D digital showroom, price comparison, online booking, service appointment scheduling, and dealer locator.',
      responsibilities: [
        'Conducted comprehensive end-to-end quality assurance ensuring strict adherence to global automotive brand standards and performance KPIs.',
        'Performed Functional, Retesting, Regression, and Cross-Browser Testing across desktop, tablet, and mobile breakpoints.',
        'Collaborated closely with UI/UX designers and frontend engineers to ensure pixel-perfect brand alignment and interactive fidelity.',
        'Engineered detailed test scenarios and test cases for the dealer locator, financing calculators, promotional offers, and car configuration workflows.',
        'Communicated testing progress, blockers, release risks, and test coverage metrics in weekly stakeholder governance meetings.',
        'Executed stringent regression testing before each major release cycle, preventing regressions in production.'
      ],
      methodologies: ['Functional Testing', 'UI/UX Testing', 'Cross-Browser Testing', 'Retesting', 'Regression Testing', 'End-to-End Testing'],
      tools: ['BrowserStack', 'JIRA', 'Postman', 'Chrome DevTools', 'Confluence', 'Lighthouse']
    },
    'redington': {
      title: 'Redington — Enterprise B2B E-Commerce Platform',
      company: 'Publicis Groupe (Nov 2022 – Dec 2023)',
      role: 'QA Team Lead',
      overview: 'An upgraded high-throughput B2B digital commerce platform for Redington, incorporating advanced commercial features including Advanced RFQ (Request for Quote), ORC, Stock Allocation, dynamic bulk pricing, and ERP synchronization.',
      responsibilities: [
        'Led the QA team and formulated end-to-end test strategies, master test plans, and release governance for the enterprise e-commerce platform.',
        'Mentored QA engineers, conducted rigorous test case reviews, and ensured complete coverage across complex pricing and inventory engines.',
        'Conducted functional, integration, smoke, sanity, regression, and API testing across Spryker and Shopify integrations.',
        'Managed defect prioritization, triage meetings, and defect prevention initiatives with backend developers and system architects.',
        'Validated high-concurrency order placement, automated RFQ status transitions, customer credit checks, and stock reservation logic.',
        'Delivered daily/weekly QA execution reports, risk matrices, and release sign-offs to corporate stakeholders.'
      ],
      methodologies: ['QA Leadership & Strategy', 'System Integration Testing (SIT)', 'Regression Testing', 'API Testing', 'UAT Coordination'],
      tools: ['Postman', 'JIRA', 'TestLink', 'SQL', 'Shopify', 'Spryker Framework', 'Confluence']
    },
    'freight-club': {
      title: 'Freight Club — Logistics',
      company: 'QualiteSoft (May 2019 – Dec 2022)',
      role: 'Senior Software Test Engineer',
      overview: 'An advanced web-based freight logistics management platform designed to help retail merchants and enterprises automate shipping, rate calculation, bill of lading generation, and multi-carrier real-time tracking.',
      responsibilities: [
        'Prepared detailed test procedures, test scenarios, and comprehensive test cases using Black Box testing techniques.',
        'Developed automated test scripts using Selenium WebDriver with custom element locators (XPath, CSS Selectors) to expedite regression cycles.',
        'Executed automated Selenium regression test suites, analyzed test run results, and documented issues in JIRA.',
        'Conducted manual and automated functional testing across rating engines, routing algorithms, and multi-carrier booking APIs.',
        'Maintained SQL database verification queries to ensure transaction consistency across rate quotes and carrier dispatches.',
        'Prepared and published daily and weekly test execution status reports to engineering leads.'
      ],
      methodologies: ['Automation Testing (Selenium)', 'Black Box Testing', 'Regression Testing', 'Database Testing (SQL)', 'Functional Testing'],
      tools: ['Selenium WebDriver', 'Java', 'JIRA', 'SQL', 'TestLink', 'MS Excel']
    },
    'cymax': {
      title: 'Cymax — Online Furniture Retail E-Commerce',
      company: 'QualiteSoft (May 2019 – Dec 2022)',
      role: 'Software Test Engineer',
      overview: 'A major North American online furniture and home decor e-commerce retail platform serving millions of customers across the United States and Canada.',
      responsibilities: [
        'Authored and executed comprehensive test cases covering product catalog search, category filters, cart operations, promo codes, and checkout flows.',
        'Developed automated test scripts with Selenium WebDriver to automate core user purchase flows and repetitive regression test cases.',
        'Conducted extensive Black Box testing across multiple browsers and operating system combinations.',
        'Logged, tracked, and verified defect resolutions in JIRA, participating in bug scrub meetings with the development team.',
        'Verified payment gateway integrations, order status updates, and third-party logistics data pipelines.'
      ],
      methodologies: ['Functional Testing', 'Automation Testing', 'Cross-Browser Testing', 'Regression Testing', 'Black Box Testing'],
      tools: ['Selenium WebDriver', 'JIRA', 'SQL', 'BrowserStack', 'MS Excel']
    }
  };

  const modalBackdrop = $('#project-modal-backdrop');
  const modalTitle = $('#modal-project-title');
  const modalRole = $('#modal-project-role');
  const modalCompany = $('#modal-project-company');
  const modalOverview = $('#modal-project-overview');
  const modalRespList = $('#modal-project-responsibilities');
  const modalMethodList = $('#modal-project-methodologies');
  const modalToolsList = $('#modal-project-tools');
  let returnFocusElement = null;

  const openProjectModal = projectId => {
    const data = projectDetails[projectId];
    if (!data || !modalBackdrop) return;
    returnFocusElement = document.activeElement;

    if (modalTitle) modalTitle.textContent = data.title;
    if (modalRole) modalRole.textContent = data.role;
    if (modalCompany) modalCompany.textContent = data.company;
    if (modalOverview) modalOverview.textContent = data.overview;

    if (modalRespList) {
      modalRespList.innerHTML = data.responsibilities.map(r => `<li>${r}</li>`).join('');
    }
    if (modalMethodList) {
      modalMethodList.innerHTML = data.methodologies.map(m => `<span class="tag">${m}</span>`).join('');
    }
    if (modalToolsList) {
      modalToolsList.innerHTML = data.tools.map(t => `<span class="tag">${t}</span>`).join('');
    }

    modalBackdrop.classList.add('is-open');
    body.style.overflow = 'hidden';
    modalBackdrop.focus();
  };

  const closeProjectModal = () => {
    modalBackdrop?.classList.remove('is-open');
    body.style.overflow = '';
    returnFocusElement?.focus?.({ preventScroll: true });
    returnFocusElement = null;
  };

  $$('[data-open-project]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      openProjectModal(btn.dataset.openProject);
    });
  });

  $('#modal-close-btn')?.addEventListener('click', closeProjectModal);
  modalBackdrop?.addEventListener('click', event => {
    if (event.target === modalBackdrop) closeProjectModal();
  });

  /* ==========================================================================
     Interactive QA Terminal Console Simulator
     ========================================================================== */
  const terminalScreen = $('#terminal-screen');
  const terminalInput = $('#terminal-input');
  const terminalForm = $('#terminal-form');
  const terminalPrefix = 'qa';

  const terminalCommands = {
    help: 'List all available QA terminal commands',
    about: 'Read professional summary and leadership philosophy',
    skills: 'Display technical skills & testing methodologies',
    tools: 'List automation, API, and defect management tools',
    projects: 'View selected projects (HINCOL, Citroën, Redington, etc.)',
    experience: 'Show career history and organizations',
    certifications: 'View professional certifications & education',
    'run-suite': 'Simulate an automated test execution suite in the browser',
    contact: 'Get email, phone, location & direct contact channels',
    resume: 'Open printable ATS resume in a new tab',
    theme: 'Toggle color theme between Dark, Light, and Auto',
    clear: 'Clear terminal screen history',
    history: 'Display recent command history'
  };

  const escapeHTML = str => String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));

  const printToTerminal = (htmlContent, type = '') => {
    if (!terminalScreen) return;
    const line = document.createElement('div');
    line.className = `terminal-result${type ? ` terminal-result--${type}` : ''}`;
    line.innerHTML = htmlContent;
    terminalScreen.appendChild(line);
    terminalScreen.scrollTop = terminalScreen.scrollHeight;
  };

  const executeCommand = rawInput => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // Normalize command
    let cmd = trimmed.toLowerCase();
    if (cmd.startsWith('qa ')) {
      cmd = cmd.slice(3).trim();
    } else if (cmd === 'qa') {
      cmd = 'help';
    }

    // Save to history
    state.terminalHistory = [...state.terminalHistory.filter(c => c !== trimmed), trimmed].slice(-30);
    storage.set('akash-qa-terminal-history', JSON.stringify(state.terminalHistory));
    state.historyIndex = state.terminalHistory.length;

    // Echo input
    printToTerminal(`<span class="terminal-prompt">akash@qa-suite:~$</span> ${escapeHTML(trimmed)}`, 'command');

    switch (cmd) {
      case 'help': {
        const rows = Object.entries(terminalCommands)
          .map(([c, d]) => `<div><code>qa ${c}</code></div><div>${d}</div>`)
          .join('');
        printToTerminal(`<span class="terminal-green">QA Console Help — Available Commands:</span><div class="terminal-help-grid">${rows}</div>`);
        break;
      }
      case 'about':
        printToTerminal('<strong>Akash Sihol</strong> — Senior Quality Analyst & QA Lead with 7+ years of experience specializing in Manual & Automation Testing, test strategy, defect management, and Agile methodologies across Web, Mobile, Automobile, Logistics, and E-Commerce platforms.');
        break;
      case 'skills':
        printToTerminal('<strong>Core Testing Expertise:</strong><br>• Functional, SIT, UAT, Smoke & Sanity, Retesting, Regression, End-to-End Testing<br>• Automation: Playwright, Cypress, Selenium WebDriver<br>• API Testing: Postman (REST API validation)<br>• Database: SQL queries & data consistency verification<br>• Cross-Browser: BrowserStack, DevTools, Lighthouse');
        break;
      case 'tools':
        printToTerminal('<strong>Tools & Tech Stack:</strong><br>Playwright · Cypress · Selenium WebDriver · Postman · JIRA · Confluence · TestLink · BrowserStack · SQL · Shopify · Spryker · Lighthouse · MS Excel');
        break;
      case 'projects':
        printToTerminal('<strong>Selected Projects:</strong><br>1. <span class="terminal-green">HINCOL</span> — Web & Mobile Platform (Bitumen & Infrastructure)<br>2. <span class="terminal-green">Citroën</span> — Automobile Digital Platform<br>3. <span class="terminal-green">Redington</span> — Enterprise B2B E-Commerce (RFQ & Stock Allocation)<br>4. <span class="terminal-green">Freight Club</span> — Logistics & Freight Shipping Management<br>5. <span class="terminal-green">Cymax</span> — Online Furniture Retail E-Commerce');
        break;
      case 'experience':
        printToTerminal('<strong>Career History:</strong><br>• <strong>Publicis Groupe</strong> (Oct 2025 – Present): Senior Quality Analyst – Web & Mobile<br>• <strong>Publicis Groupe</strong> (Jul 2024 – Apr 2026): Senior QA<br>• <strong>Publicis Groupe</strong> (Nov 2022 – Dec 2023): QA Team Lead<br>• <strong>QualiteSoft</strong> (May 2019 – Dec 2022): Senior Software Test Engineer & Software Test Engineer');
        break;
      case 'certifications':
        printToTerminal('<strong>Certifications & Education:</strong><br>• <strong>Selenium with Java</strong> Automation Testing Certification<br>• <strong>Cypress Automation Testing</strong> Certification<br>• <strong>Bachelor of Technology (B.Tech.)</strong> in Electronics & Communication Engineering');
        break;
      case 'run-suite': {
        printToTerminal('<span class="terminal-green">Initializing Automated Test Suite...</span>');
        setTimeout(() => printToTerminal('✓ [Playwright] Functional UI tests: 42 passed (0 failed)'), 300);
        setTimeout(() => printToTerminal('✓ [Postman] REST API health checks: 28 passed, 0ms latency avg'), 600);
        setTimeout(() => printToTerminal('✓ [Cypress] E2E checkout & RFQ workflows: 16 passed'), 900);
        setTimeout(() => printToTerminal('✓ [SQL] Database state verification: 100% data integrity'), 1200);
        setTimeout(() => printToTerminal('<span class="terminal-green">✔ Test Suite Completed: 86 / 86 tests passed. Zero critical defects!</span>'), 1500);
        break;
      }
      case 'contact':
        printToTerminal('<strong>Contact Details:</strong><br>• Email: <a href="mailto:aksihol216@gmail.com" class="terminal-prompt">aksihol216@gmail.com</a><br>• Phone: +91-9380948319<br>• Location: Kangra, Himachal Pradesh, India<br>• Status: Open to Senior QA / QA Lead Opportunities');
        break;
      case 'resume':
        printToTerminal('Opening <a href="./resume.html" target="_blank" class="terminal-prompt">Akash Sihol Resume</a> in new tab...');
        window.open('./resume.html', '_blank', 'noopener,noreferrer');
        break;
      case 'theme': {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        printToTerminal(`Theme changed to <span class="terminal-green">${next}</span> mode.`);
        break;
      }
      case 'history':
        printToTerminal(state.terminalHistory.length ? state.terminalHistory.map((h, i) => `${i + 1}. ${escapeHTML(h)}`).join('<br>') : 'No commands in history.');
        break;
      case 'clear':
        if (terminalScreen) terminalScreen.innerHTML = '';
        break;
      default:
        printToTerminal(`Unknown command: <code>${escapeHTML(cmd)}</code>. Type <span class="terminal-green">qa help</span> to see all available commands.`, 'error');
        break;
    }
  };

  terminalForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!terminalInput) return;
    executeCommand(terminalInput.value);
    terminalInput.value = '';
  });

  terminalInput?.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!state.terminalHistory.length) return;
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      terminalInput.value = state.terminalHistory[state.historyIndex] || '';
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.historyIndex = Math.min(state.terminalHistory.length, state.historyIndex + 1);
      terminalInput.value = state.terminalHistory[state.historyIndex] || '';
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const val = terminalInput.value.trim().toLowerCase();
      const match = Object.keys(terminalCommands).find(k => `qa ${k}`.startsWith(val) || k.startsWith(val));
      if (match) terminalInput.value = `qa ${match}`;
    }
  });

  $$('[data-cmd]').forEach(chip => {
    chip.addEventListener('click', () => {
      terminalInput?.focus();
      executeCommand(chip.dataset.cmd);
    });
  });

  /* ==========================================================================
     Command Palette (Ctrl / Cmd + K)
     ========================================================================== */
  const paletteBackdrop = $('#palette-backdrop');
  const paletteInput = $('#palette-search-input');
  const paletteList = $('#palette-list');
  let paletteReturnFocus = null;

  const paletteCommands = [
    { label: 'qa help', desc: 'Show all terminal commands', action: () => executeCommand('qa help') },
    { label: 'qa projects', desc: 'Explore HINCOL, Citroën, Redington & more', action: () => { window.location.hash = '#experience'; } },
    { label: 'qa skills', desc: 'View testing competencies & automation tools', action: () => { window.location.hash = '#expertise'; } },
    { label: 'qa tools', desc: 'Filter Playwright, Cypress, Postman, JIRA', action: () => { window.location.hash = '#tools'; } },
    { label: 'qa resume', desc: 'Open printable ATS resume', action: () => window.open('./resume.html', '_blank') },
    { label: 'qa contact', desc: 'Email, phone, and direct contact options', action: () => { window.location.hash = '#contact'; } },
    { label: 'qa run-suite', desc: 'Simulate automated test execution', action: () => executeCommand('qa run-suite') },
    { label: 'Toggle theme', desc: 'Switch Dark / Light / Auto mode', action: () => applyTheme(state.theme === 'dark' ? 'light' : 'dark') }
  ];

  const renderPalette = query => {
    if (!paletteList) return;
    const filtered = paletteCommands.filter(item => `${item.label} ${item.desc}`.toLowerCase().includes(query.toLowerCase()));
    state.paletteIndex = Math.min(state.paletteIndex, Math.max(0, filtered.length - 1));

    paletteList.innerHTML = filtered.map((item, index) => `
      <button type="button" class="palette-item" role="option" aria-selected="${index === state.paletteIndex}" data-idx="${index}">
        <span><code>${item.label}</code> — ${item.desc}</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">Select ↵</span>
      </button>
    `).join('');

    $$('.palette-item', paletteList).forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        closePalette();
        filtered[idx]?.action();
      });
    });
  };

  const openPalette = () => {
    if (!paletteBackdrop) return;
    paletteReturnFocus = document.activeElement;
    paletteBackdrop.classList.add('is-open');
    state.paletteIndex = 0;
    renderPalette('');
    setTimeout(() => paletteInput?.focus(), 25);
  };

  const closePalette = () => {
    paletteBackdrop?.classList.remove('is-open');
    paletteReturnFocus?.focus?.({ preventScroll: true });
    paletteReturnFocus = null;
  };

  $('#palette-toggle-btn')?.addEventListener('click', openPalette);

  paletteInput?.addEventListener('input', () => {
    state.paletteIndex = 0;
    renderPalette(paletteInput.value);
  });

  paletteInput?.addEventListener('keydown', event => {
    const items = $$('.palette-item', paletteList);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!items.length) return;
      state.paletteIndex = (state.paletteIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.setAttribute('aria-selected', String(i === state.paletteIndex)));
    } else if (event.key === 'Enter') {
      items[state.paletteIndex]?.click();
    }
  });

  paletteBackdrop?.addEventListener('click', event => {
    if (event.target === paletteBackdrop) closePalette();
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (paletteBackdrop?.classList.contains('is-open')) closePalette();
      else openPalette();
    } else if (event.key === 'Escape') {
      closeMobileMenu();
      closeThemeMenu();
      closeProjectModal();
      closePalette();
    }
  });

  /* ==========================================================================
     Email Copy Helper with Visual Feedback
     ========================================================================== */
  const copyEmailBtn = $('#copy-email-btn');
  copyEmailBtn?.addEventListener('click', async () => {
    const email = copyEmailBtn.dataset.email || 'aksihol216@gmail.com';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const temp = document.createElement('textarea');
        temp.value = email;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      const prevText = copyEmailBtn.textContent;
      copyEmailBtn.textContent = 'Copied!';
      copyEmailBtn.style.background = 'var(--gold-primary)';
      copyEmailBtn.style.color = '#070a10';
      setTimeout(() => {
        copyEmailBtn.textContent = prevText;
        copyEmailBtn.style.background = '';
        copyEmailBtn.style.color = '';
      }, 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });

  /* ==========================================================================
     Page Loader Dismissal
     ========================================================================== */
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = $('.page-loader');
      if (loader) {
        loader.classList.add('is-loaded');
        setTimeout(() => loader.remove(), 600);
      }
    }, reduceMotionQuery.matches ? 0 : 350);
  }, { once: true });

})();
