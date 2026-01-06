(function () {
  // DOM Elements
  const splash = document.getElementById('splash');
  const splashGlobe = document.getElementById('splash-globe');
  const splashSVG = document.getElementById('splash-svg');
  const progressFill = document.getElementById('progress-fill');
  const headerLogoContainer = document.getElementById('header-logo');
  const logoWordWrap = document.getElementById('logo-text');
  const signinBtn = document.querySelector('.signin-btn');
  
  if (!splash || !splashGlobe) return;

  // Start a single 360° rotation for the splash globe
  function startGlobeStroke() {
    const earth = splashSVG; // FIXED
    if (!earth) return;

    earth.classList.remove('rotate-once');
    void earth.offsetWidth; // force reflow
    earth.classList.add('rotate-once');
  }

  // Simulate asset loading with progress bar
  function simulateLoading(duration = 1600) {
    return new Promise((resolve) => {
      const start = performance.now();
      let last = 0;
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 2); // ease-out for the progress feel
        const pct = Math.round(eased * 100);
        if (progressFill) progressFill.style.width = pct + '%';
        if (t < 1) {
          last = pct;
          requestAnimationFrame(frame);
        } else {
          if (progressFill) progressFill.style.width = '100%';
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function getCenterRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; // Return center point (x,y) and dimensions
  }

  async function flyToHeader() {
    const from = getCenterRect(splashGlobe); // compute transform to move splashGlobe into headerLogoContainer center
    const to = getCenterRect(headerLogoContainer); // The header will eventually contain an SVG; use headerLogoContainer location

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const scale = (headerLogoContainer.offsetWidth) / (splashGlobe.offsetWidth); // compute scale ratio based on widths

    // Make sure splashGlobe is positioned fixed (it is in CSS), then animate transform
    splashGlobe.style.transformOrigin = 'center center';
    splashGlobe.classList.add('moving');

    void splashGlobe.offsetWidth; // trigger a reflow so the transition applies

    splashGlobe.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    splashGlobe.style.opacity = '1'; // also fade slightly while moving

    await new Promise((res) => {
      const onEnd = (e) => {
        // Only resolve once for transform
        if (e.propertyName && e.propertyName.indexOf('transform') === -1) return;
        splashGlobe.removeEventListener('transitionend', onEnd);
        res();
      };
      splashGlobe.addEventListener('transitionend', onEnd);
    });

    // Move the SVG node into the header logo container so it becomes part of the header
    // Clone to keep header SVG attributes correct, then remove the fixed splash node
    try {
      const svgNode = splashSVG;
      // Clean inline transform so it matches header sizing
      svgNode.removeAttribute('width');
      svgNode.removeAttribute('height');

      // empty the header container and append the svg
      headerLogoContainer.innerHTML = '';
      headerLogoContainer.appendChild(svgNode);

      // Small safety: ensure styling matches header
      svgNode.style.width = '';
      svgNode.style.height = '';

      // Trigger a single rotation on the header earth for a subtle flourish
      try {
        const headerEarth = svgNode;
        if (headerEarth) {
          headerEarth.classList.remove('rotate-once');
          void headerEarth.offsetWidth;
          headerEarth.classList.add('rotate-once');
        }

      } catch (e) { }

    } catch (err) {
      console.warn('Failed to move svg into header.', err);
    }

    // Hide the splash overlay
    splash.classList.add('hidden');
    splash.setAttribute('aria-hidden', 'true');

    if (logoWordWrap) {
      logoWordWrap.classList.add('revealed');
      typeWrite(logoWordWrap, 'Globlit', 90); // Write the logo text
    }

    // Animate sign-in if present (defensive: earlier versions used a full nav)
    if (signinBtn) signinBtn.classList.add('visible');
  }
  
  // Animate Typewriter
  function typeWrite(element, text, delay) {
    element.textContent = '';
    element.classList.add('typing');
    let i = 0;
    const step = () => {
      if (i < text.length) {
        element.textContent += text[i++];
        setTimeout(step, delay + Math.random() * 50);
      } else {
        element.classList.remove('typing');
      }
    };
    step();
  }

  function setupRevealObserver() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;

        // Let the scroll sequence control feature-card reveals; only auto-reveal non-feature elements
        if (e.target.closest('.features')) {
          return; // handled by setupScrollSequence
        } else {
          e.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
    
  function setupScrollSequence() {
    const features = document.querySelector('.features');
    const deco = document.querySelector('.globe-deco');

    if (!features || !deco) return;

    let inView = false;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !inView) {
          inView = true;

          deco.classList.add('centered'); // center and enlarge the globe smoothly

          // after transition finishes, reveal feature cards if not already
          const onEnd = (e) => {
            if (e.propertyName && e.propertyName.indexOf('transform') === -1) return;
            deco.removeEventListener('transitionend', onEnd);
            revealFeatureCards(false);
          };

          deco.addEventListener('transitionend', onEnd);
        } else if (!entry.isIntersecting && inView) {
          inView = false;
          deco.classList.remove('centered');
          revealFeatureCards(true); // hide cards so they can reveal again when scrolling down
        }
      });
    }, { threshold: 0.5 }); //0.22

    obs.observe(features);
  }

  function setupGlobeHover() {
    const headerLogo = document.getElementById('header-logo');

    if (!headerLogo) return;

    headerLogo.addEventListener('mouseenter', () => {
      const earth = headerLogo.querySelector('.earth');
      if (earth) {
        earth.style.setProperty('--hover-x', '10deg');
        earth.style.setProperty('--hover-y', '10deg');
      }
    });
    
    headerLogo.addEventListener('mouseleave', () => {
      const earth = headerLogo.querySelector('.earth');
      if (earth) earth.style.transform = '';
    });
  }

  function setupHeroParallax() {
    const hero = document.querySelector('.hero-parallax');
    const deco = document.querySelector('.globe-deco');

    if (!hero || !deco) return;

    hero.addEventListener('pointermove', (event) => {
      const r = hero.getBoundingClientRect();
      const mx = (event.clientX - r.left) / r.width - 0.5;
      const my = (event.clientY - r.top) / r.height - 0.5;
      // don't apply parallax when globe is centered/enlarged
      if (deco.classList.contains('centered')) return;
      deco.style.transform = `translate3d(${mx * 12}px, ${my * 10}px, 0) rotate(${mx * 6}deg)`;
    });
    hero.addEventListener('pointerleave', () => deco.style.transform = '');
  }

  function setupCardTilt() {
    document.querySelectorAll('.feature-card[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', (event) => {
        const r = card.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width - 0.5; // -0.5 -> 0.5
        const py = (event.clientY - r.top) / r.height - 0.5;
        const rotY = px * 8; // degrees
        const rotX = -py * 8;
        card.style.transform = `perspective(900px) translateZ(8px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  function revealFeatureCards(reverse = false) {
    const cards = Array.from(document.querySelectorAll('.features .feature-card'));

    if (!cards.length) return;

    if (reverse) {
      cards.forEach(c => c.classList.remove('in-view'));
      return;
    }

    cards.forEach((card, index) => {
      setTimeout(() => card.classList.add('in-view'), index * 160);
    });
  }

  function setupInteractions() {
    setupRevealObserver();
    setupCardTilt();
    setupHeroParallax();
    setupGlobeHover();
    setupScrollSequence();
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    startGlobeStroke(); // start stroke draw

    await simulateLoading(1200);
    
    // small delay so stroke finish looks nice
    await new Promise(r => setTimeout(r, 160));
    await flyToHeader();

    setupInteractions(); // initialize micro-interactions after the header is in place
  });
})();