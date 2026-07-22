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

            // 1. Aktive Seite im Menü hervorheben
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const links = headerContainer.querySelectorAll('a');
            
            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                    const parentItem = link.closest('.nav-item');
                    if (parentItem) parentItem.classList.add('active');
                }
            });

            const dropdownItems = headerContainer.querySelectorAll('.nav-item.dropdown');

            dropdownItems.forEach(item => {
                // Wenn man über einen Menüpunkt fährt, sofort ALLE ANDEREN schließen
                item.addEventListener('mouseenter', () => {
                    dropdownItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('is-open');
                        }
                    });
                    item.classList.add('is-open');
                });

                // Beim Verlassen wieder schließen
                item.addEventListener('mouseleave', () => {
                    item.classList.remove('is-open');
                });
            });

            document.addEventListener('click', (e) => {
                if (!headerContainer.contains(e.target)) {
                    dropdownItems.forEach(item => item.classList.remove('is-open'));
                }
            });
        })
        .catch(error => {
            console.error('Fehler beim Laden des Headers:', error);
        });
});