import { db } from '../db.js';
import { loadHeader } from './header.js';

loadHeader();

document.addEventListener('DOMContentLoaded', async () => {
    const spielerAnzahl = document.getElementById('spielerAnzahl');
    const btnReset = document.getElementById('btnReset');
    const resetStatus = document.getElementById('resetStatus');

    async function aktualisiereAnzahl() {
        try {
            spielerAnzahl.textContent = String(await db.mitspieler.count());
        } catch (error) {
            spielerAnzahl.textContent = '–';
            console.error('Fehler beim Zählen der Spieler:', error);
        }
    }

    await aktualisiereAnzahl();

    btnReset.addEventListener('click', async () => {
        const bestaetigt = window.confirm('Wirklich ALLE gespeicherten Spieler löschen? Das kann nicht rückgängig gemacht werden.');
        if (!bestaetigt) return;

        try {
            await db.mitspieler.clear();
            await aktualisiereAnzahl();
            resetStatus.textContent = 'Alle Spieler wurden gelöscht.';
            resetStatus.hidden = false;
        } catch (error) {
            console.error('Fehler beim Zurücksetzen:', error);
            resetStatus.textContent = 'Zurücksetzen fehlgeschlagen. Bitte erneut versuchen.';
            resetStatus.hidden = false;
        }
    });
});
