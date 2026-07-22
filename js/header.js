// Lädt header.html in das #header-Element, markiert die aktive Seite
// und steuert die Dropdown-Menüs (Touch + Desktop).
export async function loadHeader() {
  const headerContainer = document.getElementById('header');
  if (!headerContainer) return;

  try {
    const response = await fetch('./header.html');
    if (!response.ok) {
      throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }
    const data = await response.text();
    headerContainer.innerHTML = data;

    // Aktive Seite markieren & Reload beim Klick auf die aktuelle Seite verhindern
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = headerContainer.querySelectorAll('a');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const parentDropdown = link.closest('.nav-item.dropdown');
          if (parentDropdown) parentDropdown.classList.remove('is-open');
        });
      }
    });

    // Dropdown-Steuerung (funktioniert per Touch & Klick, kein reines :hover)
    const dropdownItems = headerContainer.querySelectorAll('.nav-item.dropdown');

    dropdownItems.forEach((item) => {
      const btn = item.querySelector('.dropdown-toggle');
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = item.classList.contains('is-open');
        dropdownItems.forEach((other) => other.classList.remove('is-open'));
        if (!isOpen) item.classList.add('is-open');
      });
    });

    document.addEventListener('click', () => {
      dropdownItems.forEach((item) => item.classList.remove('is-open'));
    });
  } catch (error) {
    console.error('Header-Fehler:', error);
  }
}
