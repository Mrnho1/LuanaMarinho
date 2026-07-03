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

  /* ---------- Formulário de contato (envio AJAX via Formspree) ---------- */
  const form = document.querySelector('.contato-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const submitBtn = form.querySelector('.form-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Se o endpoint ainda não foi configurado, evita um envio quebrado.
      if (form.action.includes('SEU_ID_FORMSPREE')) {
        status.textContent = 'Configure o endpoint do Formspree para ativar o envio.';
        status.className = 'form-status erro';
        return;
      }

      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Enviando...';
      status.textContent = '';
      status.className = 'form-status';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (response.ok) {
          form.reset();
          status.textContent = 'Mensagem enviada com sucesso! Em breve entrarei em contato.';
          status.className = 'form-status ok';
        } else {
          throw new Error('Falha no envio');
        }
      } catch (err) {
        status.textContent = 'Não foi possível enviar agora. Tente pelo WhatsApp ou e-mail.';
        status.className = 'form-status erro';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }
});
