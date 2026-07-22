function loadHeader() {
    fetch('header.html')
        .then(response => {
            if (!response.ok) throw new Error('header.html konnte nicht geladen werden');
            return response.text();
        })
        .then(data => {
            const headerContainer = document.getElementById('header');
            if (!headerContainer) return;

            headerContainer.innerHTML = data;

            // 1. Aktive Seite markieren & Reload verhindern
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const links = headerContainer.querySelectorAll('a');

            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');

                    // Klick abfangen: Kein Neuladen der aktuellen Seite
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const parentDropdown = link.closest('.nav-item.dropdown');
                        if (parentDropdown) {
                            parentDropdown.classList.remove('is-open');
                        }
                    });
                }
            });

            // 2. Dropdown-Steuerung für Touch & Desktop
            const dropdownItems = headerContainer.querySelectorAll('.nav-item.dropdown');

            dropdownItems.forEach(item => {
                const btn = item.querySelector('.dropdown-toggle');
                if (!btn) return;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const isOpen = item.classList.contains('is-open');

                    dropdownItems.forEach(other => other.classList.remove('is-open'));

                    if (!isOpen) {
                        item.classList.add('is-open');
                    }
                });
            });

            // Schließen bei Klick außerhalb
            document.addEventListener('click', () => {
                dropdownItems.forEach(item => item.classList.remove('is-open'));
            });
        })
        .catch(error => console.error('Header-Fehler:', error));
}

// SOFORT ausführen (ohne DOMContentLoaded-Verzögerung)
loadHeader();