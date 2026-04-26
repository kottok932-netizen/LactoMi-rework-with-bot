(function () {
  const nav = document.querySelector('.nav');
  const toggle = document.getElementById('mobileMenuToggle');
  const panel = document.getElementById('mobileMenuPanel');

  if (!nav || !toggle || !panel) return;

  function setOpen(isOpen) {
    nav.classList.toggle('is-menu-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('is-menu-open'));
  });

  panel.addEventListener('click', function (event) {
    const link = event.target.closest('a');
    if (link) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 761px)').matches) setOpen(false);
  });
})();
