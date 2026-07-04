document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Reveal ao rolar (com stagger suave) ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('show');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  // Aplica um pequeno atraso encadeado para itens irmãos (ex.: cards de áreas)
  revealEls.forEach(el => {
    const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
    const idx = siblings.indexOf(el);
    if (siblings.length > 1) {
      el.style.transitionDelay = `${Math.min(idx, 6) * 90}ms`;
    }
    observer.observe(el);
  });

  /* ---------- Navbar: menu mobile ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navbar = document.querySelector('.navbar');

  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('nav-active');
    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  });

  /* ---------- Navbar: efeito ao rolar ---------- */
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('navbar-scrolled', window.scrollY > 50);
  });

  /* ---------- Fechar menu ao clicar em um link ---------- */
  const navItems = document.querySelectorAll('.nav-links a');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navLinks.classList.remove('nav-active');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Scrollspy: destaca o link da seção atual ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      navItems.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Manifesto: efeito máquina de escrever ---------- */
  const typeEl = document.querySelector('.jm-type');
  if (typeEl) {
    const frases = [
      'Toda pessoa tem direito a uma defesa digna.',
      'A presunção de inocência é um pilar da justiça.',
      'Onde há acusação, deve haver defesa técnica.',
      'O direito ao silêncio também é um direito.',
      'Defender é garantir que a lei valha para todos.'
    ];

    const caret = document.querySelector('.jm-caret');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      // Sem animação: mostra uma frase estática e esconde o cursor.
      typeEl.textContent = frases[0];
      if (caret) caret.style.display = 'none';
    } else {
      let fraseIdx = 0;
      let charIdx = 0;
      let apagando = false;

      const tick = () => {
        const frase = frases[fraseIdx];

        if (!apagando) {
          charIdx++;
          typeEl.textContent = frase.slice(0, charIdx);
          if (charIdx === frase.length) {
            apagando = true;
            return setTimeout(tick, 2400); // pausa para leitura
          }
          setTimeout(tick, 45 + Math.random() * 45);
        } else {
          charIdx--;
          typeEl.textContent = frase.slice(0, charIdx);
          if (charIdx === 0) {
            apagando = false;
            fraseIdx = (fraseIdx + 1) % frases.length;
            return setTimeout(tick, 500); // pausa antes da próxima frase
          }
          setTimeout(tick, 25);
        }
      };

      setTimeout(tick, 700);
    }
  }
});
