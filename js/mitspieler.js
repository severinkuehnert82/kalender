import { db } from '../db.js';
import { loadHeader } from './header.js';

loadHeader();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addPlayerForm');
    const input = document.getElementById('playerNameInput');
    const playerList = document.getElementById('playerList');
    const playerCount = document.getElementById('playerCount');
    const formError = document.getElementById('formError');

    function showError(message) {
        formError.textContent = message;
        formError.hidden = false;
        input.classList.add('input-error');
    }

    function clearError() {
        formError.hidden = true;
        input.classList.remove('input-error');
    }

    async function ladeSpieler() {
        try {
            const spielerListe = await db.mitspieler.orderBy('name').toArray();
            playerList.innerHTML = '';
            playerCount.textContent = spielerListe.length;

            if (spielerListe.length === 0) {
                playerList.innerHTML = '<li class="empty-hint">Noch keine Spieler gespeichert.</li>';
                return;
            }

            spielerListe.forEach((s) => {
                const li = document.createElement('li');
                li.className = 'player-item';
                li.innerHTML = `
                    <span class="player-name">${escapeHtml(s.name)}</span>
                    <button class="btn-delete" data-id="${s.id}" aria-label="${escapeHtml(s.name)} löschen">✕</button>
                `;
                playerList.appendChild(li);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Spieler:', error);
        }
    }

    if (form && input) {
        input.addEventListener('input', clearError);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const name = input.value.trim();
            if (!name) {
                showError('Bitte gib einen Namen ein.');
                return;
            }
            if (name.length > 24) {
                showError('Der Name darf höchstens 24 Zeichen lang sein.');
                return;
            }

            try {
                const doppelte = await db.mitspieler
                    .filter((s) => s.name.toLowerCase() === name.toLowerCase())
                    .toArray();

                if (doppelte.length > 0) {
                    showError(`„${name}“ ist bereits gespeichert.`);
                    return;
                }

                await db.mitspieler.add({ name });
                input.value = '';
                input.focus();
                await ladeSpieler();
            } catch (error) {
                console.error('Fehler beim Speichern:', error);
                showError('Speichern fehlgeschlagen. Bitte versuch es erneut.');
            }
        });
    }

    if (playerList) {
        playerList.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-delete');
            if (!btn) return;
            const id = Number(btn.getAttribute('data-id'));
            if (id) {
                await db.mitspieler.delete(id);
                await ladeSpieler();
            }
        });
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[m]));
    }

    ladeSpieler();
});
