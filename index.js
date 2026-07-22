document.addEventListener('DOMContentLoaded', () => {
    fetch('header.html')
        .then(response => {
            if (!response.ok) throw new Error('header.html konnte nicht geladen werden');
            return response.text();
        })
        .then(data => {
            const headerContainer = document.getElementById('header');
            if (!headerContainer) return;

            headerContainer.innerHTML = data;

            // 1. Aktive Seite markieren
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const links = headerContainer.querySelectorAll('a');
            
            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                    const parentItem = link.closest('.nav-item');
                    if (parentItem) parentItem.classList.add('active');
                }
            });

            // 2. Dropdown-Steuerung für Touch & Desktop
            const dropdownItems = headerContainer.querySelectorAll('.nav-item.dropdown');

            dropdownItems.forEach(item => {
                const btn = item.querySelector('.dropdown-toggle');

                // Klick/Tap-Steuerung (für Smartphones)
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const isOpen = item.classList.contains('is-open');

                    // Alle anderen schließen
                    dropdownItems.forEach(other => other.classList.remove('is-open'));

                    // Aktuelles umschalten
                    if (!isOpen) {
                        item.classList.add('is-open');
                    }
                });
            });

            // Schließen, wenn irgendwo auf den Bildschirm getippt wird
            document.addEventListener('click', () => {
                dropdownItems.forEach(item => item.classList.remove('is-open'));
            });
        })
        .catch(error => console.error('Header-Fehler:', error));
});