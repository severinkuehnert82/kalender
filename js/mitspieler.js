import { db } from '../db.js';

// 1. Header laden & Dropdowns steuern
async function loadHeader() {
    const headerContainer = document.getElementById('header');
    if (!headerContainer) return;

    try {
        const response = await fetch('./header.html');
        
        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const data = await response.text();
        headerContainer.innerHTML = data;

        // Aktive Seite markieren & Reload verhindern
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const links = headerContainer.querySelectorAll('a');

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
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

        // Dropdown-Steuerung
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

        document.addEventListener('click', () => {
            dropdownItems.forEach(item => item.classList.remove('is-open'));
        });

    } catch (error) {
        console.error('Header-Fehler:', error);
    }
}

// Header SOFORT anstoßen (Lösung 2)
loadHeader();

// 2. Hauptlogik nach dem DOM-Laden ausführen
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addPlayerForm');
    const input = document.getElementById('playerNameInput');
    const playerList = document.getElementById('playerList');
    const playerCount = document.getElementById('playerCount');

    async function ladeSpieler() {
        try {
            const spielerListe = await db.mitspieler.toArray();
            playerList.innerHTML = '';
            playerCount.textContent = spielerListe.length;

            if (spielerListe.length === 0) {
                playerList.innerHTML = '<li class="empty-hint">Noch keine Spieler gespeichert.</li>';
                return;
            }

            spielerListe.forEach(s => {
                const li = document.createElement('li');
                li.className = 'player-item';
                li.innerHTML = `
                    <span class="player-name">${escapeHtml(s.name)}</span>
                    <button class="btn-delete" data-id="${s.id}" aria-label="Löschen">✕</button>
                `;
                playerList.appendChild(li);
            });
        } catch (error) {
            console.error("Fehler beim Laden der Spieler:", error);
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();

            if (!name) return;

            try {
                await db.mitspieler.add({ name });
                input.value = '';
                input.focus();
                await ladeSpieler();
            } catch (error) {
                console.error("Fehler beim Speichern:", error);
            }
        });
    }

    if (playerList) {
        playerList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const id = Number(e.target.getAttribute('data-id'));
                if (id) {
                    await db.mitspieler.delete(id);
                    await ladeSpieler();
                }
            }
        });
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    ladeSpieler();
});