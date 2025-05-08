document.addEventListener('DOMContentLoaded', () => {
  // Animação de fade-in ao rolar
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      }
    });
  }, {
    threshold: 0.1
  });

  const elements = document.querySelectorAll('.fade-in-on-scroll');
  elements.forEach(el => observer.observe(el));

  // Menu hamburguer + animação em X
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navbar = document.querySelector(".navbar");

  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("nav-active");
    menuToggle.classList.toggle("active"); // ativa animação do X
  });

  // Efeito de rolagem para navbar
  window.addEventListener("scroll", function () {
    if (window.scrollY > 50) {
      navbar.classList.add("navbar-scrolled");
    } else {
      navbar.classList.remove("navbar-scrolled");
    }
  });

  // Fechar o menu e navegar para o link clicado
  const navLinksItems = document.querySelectorAll(".nav-links a");
  navLinksItems.forEach(item => {
    item.addEventListener("click", () => {
      // Fechar o menu
      navLinks.classList.remove("nav-active");
      menuToggle.classList.remove("active");
    });
  });
});
