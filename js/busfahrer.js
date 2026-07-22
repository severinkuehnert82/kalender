import { db } from '../db.js';

// Definition der bayerischen Farben (Herz & Gras = rot, Eichel & Schelle = schwarz)
const FARBEN = [
  { name: 'Herz',    symbol: '♥️', rot: true },
  { name: 'Gras',    symbol: '🍃', rot: true },
  { name: 'Eichel',  symbol: '🌰', rot: false },
  { name: 'Schelle', symbol: '🔔', rot: false }
];

const WERTE = [
  { name: '7',     wert: 7 },
  { name: '8',     wert: 8 },
  { name: '9',     wert: 9 },
  { name: '10',    wert: 10 },
  { name: 'Unter', wert: 11 },
  { name: 'Ober',  wert: 12 },
  { name: 'König', wert: 13 },
  { name: 'Sau',   wert: 14 }
];

function erstelleEinzeltesDeck() {
    const deck = [];
    for (const farbe of FARBEN) {
        for (const wert of WERTE) {
            deck.push({
                farbe: farbe.name,
                symbol: farbe.symbol,
                isRot: farbe.rot,
                wertName: wert.name,
                wert: wert.wert
            });
        }
    }
    return deck;
}

function erstelleMehrereDecks(anzahlDecks) {
    let gesamtDeck = [];
    for (let i = 0; i < anzahlDecks; i++) {
        gesamtDeck = gesamtDeck.concat(erstelleEinzeltesDeck());
    }
    return mischeDeck(gesamtDeck);
}

function mischeDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Spielstatus
let aktuellesDeck = [];
let spielerListe = [];
let aktiverSpielerIndex = 0;
let gewaehlteDecks = 1;

// Pyramiden-Status
let pyramideReihen = [];
let aufgedecktePyramidenKarten = new Set();

document.addEventListener('DOMContentLoaded', () => {
    zeigeStartScreen();
});

// Startbildschirm mit Links-Rechts-Layout
async function zeigeStartScreen() {
    const roundTitle = document.getElementById('roundTitle');
    const gameInstruction = document.getElementById('gameInstruction');
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');

    roundTitle.textContent = "Busfahrer Vorbereitung";
    gameInstruction.textContent = "Wähle Mitspieler aus und lege die Anzahl der Decks fest.";

    renderKarte(null, cardWrapper);

    try {
        spielerListe = await db.mitspieler.toArray();
    } catch (error) {
        console.error("Fehler beim Laden der Spieler:", error);
    }

    let spielerHtml = '';
    if (spielerListe.length === 0) {
        spielerHtml = '<li style="color: #fca5a5;">Keine Spieler!</li>';
    } else {
        spielerListe.forEach(s => {
            spielerHtml += `<li>${s.name}</li>`;
        });
    }

    controlsArea.innerHTML = `
        <div class="setup-split">
            <div class="setup-box">
                <div>
                    <h3>Mitspieler (${spielerListe.length})</h3>
                    <ul class="player-preview-list">
                        ${spielerHtml}
                    </ul>
                </div>
                <a href="mitspieler.html" class="btn-manage">Spieler verwalten</a>
            </div>
            <div class="setup-box">
                <div>
                    <h3>Kartendecks</h3>
                    <div class="deck-buttons">
                        <button class="btn-deck ${gewaehlteDecks === 1 ? 'selected' : ''}" data-decks="1">1 Deck (32)</button>
                        <button class="btn-deck ${gewaehlteDecks === 2 ? 'selected' : ''}" data-decks="2">2 Decks (64)</button>
                        <button class="btn-deck ${gewaehlteDecks === 3 ? 'selected' : ''}" data-decks="3">3 Decks (96)</button>
                    </div>
                </div>
            </div>
        </div>
        <button class="btn-game btn-start" id="btnSpielStarten">Spiel starten</button>
    `;

    controlsArea.querySelectorAll('.btn-deck').forEach(btn => {
        btn.addEventListener('click', (e) => {
            gewaehlteDecks = Number(e.target.getAttribute('data-decks'));
            controlsArea.querySelectorAll('.btn-deck').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    document.getElementById('btnSpielStarten').addEventListener('click', async () => {
        if (spielerListe.length === 0) {
            alert("Bitte lege zuerst mindestens einen Spieler in der Verwaltung an!");
            return;
        }

        for (const s of spielerListe) {
            await db.mitspieler.update(s.id, { karten: [] });
        }

        aktuellesDeck = erstelleMehrereDecks(gewaehlteDecks);
        aktiverSpielerIndex = 0;
        starteRunde1();
    });
}

function renderKarte(karte, container) {
    if (!karte) {
        container.innerHTML = `<div class="game-card-element is-hidden"></div>`;
        return;
    }

    const farbKlasse = karte.isRot ? 'is-rot' : 'is-schwarz';

    container.innerHTML = `
        <div class="game-card-element ${farbKlasse}">
            <div class="card-corner top">
                <span>${karte.wertName}</span>
                <span>${karte.symbol}</span>
            </div>
            <div class="card-center-symbol">${karte.symbol}</div>
            <div class="card-corner bottom">
                <span>${karte.wertName}</span>
                <span>${karte.symbol}</span>
            </div>
        </div>
    `;
}

function renderZweiKarten(karte1, titel1, karte2, titel2, container) {
    const getCardHtml = (karte) => {
        if (!karte) return `<div class="game-card-element is-hidden"></div>`;
        const farbKlasse = karte.isRot ? 'is-rot' : 'is-schwarz';
        return `
            <div class="game-card-element ${farbKlasse}">
                <div class="card-corner top">
                    <span>${karte.wertName}</span>
                    <span>${karte.symbol}</span>
                </div>
                <div class="card-center-symbol">${karte.symbol}</div>
                <div class="card-corner bottom">
                    <span>${karte.wertName}</span>
                    <span>${karte.symbol}</span>
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 1.5rem; width: 100%; align-items: center;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">${titel1}</span>
                ${getCardHtml(karte1)}
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">${titel2}</span>
                ${getCardHtml(karte2)}
            </div>
        </div>
    `;
}

function renderDreiKarten(karte1, titel1, karte2, titel2, karte3, titel3, container) {
    const getCardHtml = (karte) => {
        if (!karte) return `<div class="game-card-element is-hidden"></div>`;
        const farbKlasse = karte.isRot ? 'is-rot' : 'is-schwarz';
        return `
            <div class="game-card-element ${farbKlasse}" style="transform: scale(0.85);">
                <div class="card-corner top">
                    <span>${karte.wertName}</span>
                    <span>${karte.symbol}</span>
                </div>
                <div class="card-center-symbol">${karte.symbol}</div>
                <div class="card-corner bottom">
                    <span>${karte.wertName}</span>
                    <span>${karte.symbol}</span>
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 0.8rem; width: 100%; align-items: center; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">${titel1}</span>
                ${getCardHtml(karte1)}
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">${titel2}</span>
                ${getCardHtml(karte2)}
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">${titel3}</span>
                ${getCardHtml(karte3)}
            </div>
        </div>
    `;
}

// ==========================================
// RUNDE 1
// ==========================================
function starteRunde1() {
    if (aktiverSpielerIndex >= spielerListe.length) {
        aktiverSpielerIndex = 0;
        starteRunde2(); 
        return;
    }

    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const roundTitle = document.getElementById('roundTitle');
    const gameInstruction = document.getElementById('gameInstruction');
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');

    roundTitle.textContent = "Runde 1: Rot oder Schwarz?";
    gameInstruction.textContent = `${aktuellerSpieler.name} ist dran: Ist die nächste Karte Rot oder Schwarz?`;

    renderKarte(null, cardWrapper);

    controlsArea.innerHTML = `
        <button class="btn-game btn-rot" id="btnRot">Rot</button>
        <button class="btn-game btn-schwarz" id="btnSchwarz">Schwarz</button>
    `;

    document.getElementById('btnRot').addEventListener('click', () => pruefeRunde1(true));
    document.getElementById('btnSchwarz').addEventListener('click', () => pruefeRunde1(false));
}

async function pruefeRunde1(tippIstRot) {
    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const gezogeneKarte = aktuellesDeck.pop();
    
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');
    const gameInstruction = document.getElementById('gameInstruction');

    renderKarte(gezogeneKarte, cardWrapper);

    try {
        const aktuellerEintrag = await db.mitspieler.get(aktuellerSpieler.id);
        const bisherigeKarten = aktuellerEintrag.karten || [];
        bisherigeKarten.push(gezogeneKarte);
        await db.mitspieler.update(aktuellerSpieler.id, { karten: bisherigeKarten });
        aktuellerSpieler.karten = bisherigeKarten;
    } catch (error) {
        console.error("Fehler beim Speichern der Karte:", error);
    }

    if (tippIstRot === gezogeneKarte.isRot) {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #4ade80; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Richtig! 🎉</div>
            <div style="font-size: 1.1rem; color: #f8fafc;">Du musst <b>nicht</b> trinken.</div>
        `;
    } else {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #ef4444; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Falsch! ❌</div>
            <div style="font-size: 1.3rem; color: #ef4444; font-weight: bold; text-transform: uppercase;">🍻 DRINK NEHMEN! 🍻</div>
        `;
    }

    controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnNaechster">Nächster Spieler</button>`;

    document.getElementById('btnNaechster').addEventListener('click', () => {
        aktiverSpielerIndex++;
        starteRunde1();
    });
}

// ==========================================
// RUNDE 2
// ==========================================
async function starteRunde2() {
    if (aktiverSpielerIndex >= spielerListe.length) {
        aktiverSpielerIndex = 0;
        starteRunde3();
        return;
    }

    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const roundTitle = document.getElementById('roundTitle');
    const gameInstruction = document.getElementById('gameInstruction');
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');

    roundTitle.textContent = "Runde 2: Drüber, Drunter oder Gleich?";
    gameInstruction.textContent = `${aktuellerSpieler.name}: Ist die nächste Karte höher, niedriger oder gleich?`;

    let referenzKarte = null;
    try {
        const dbEintrag = await db.mitspieler.get(aktuellerSpieler.id);
        if (dbEintrag && dbEintrag.karten && dbEintrag.karten.length > 0) {
            referenzKarte = dbEintrag.karten[0];
            aktuellerSpieler.karten = dbEintrag.karten;
        }
    } catch (error) {
        console.error("Fehler beim Laden der Referenzkarte:", error);
    }

    renderKarte(referenzKarte, cardWrapper);

    controlsArea.innerHTML = `
        <div style="display: flex; gap: 0.5rem; width: 100%;">
            <button class="btn-game btn-schwarz" id="btnDrunter" style="flex: 1; background-color: #3b82f6;">Drunter ⬇️</button>
            <button class="btn-game btn-schwarz" id="btnGleich" style="flex: 1; background-color: #64748b;">Gleich 🟰</button>
            <button class="btn-game btn-schwarz" id="btnDrueber" style="flex: 1; background-color: #10b981;">Drüber ⬆️</button>
        </div>
    `;

    document.getElementById('btnDrunter').addEventListener('click', () => pruefeRunde2('drunter', referenzKarte));
    document.getElementById('btnGleich').addEventListener('click', () => pruefeRunde2('gleich', referenzKarte));
    document.getElementById('btnDrueber').addEventListener('click', () => pruefeRunde2('drueber', referenzKarte));
}

async function pruefeRunde2(tipp, referenzKarte) {
    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const gezogeneKarte = aktuellesDeck.pop();
    
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');
    const gameInstruction = document.getElementById('gameInstruction');

    try {
        const aktuellerEintrag = await db.mitspieler.get(aktuellerSpieler.id);
        const bisherigeKarten = aktuellerEintrag.karten || [];
        bisherigeKarten.push(gezogeneKarte);
        await db.mitspieler.update(aktuellerSpieler.id, { karten: bisherigeKarten });
        aktuellerSpieler.karten = bisherigeKarten;
    } catch (error) {
        console.error("Fehler beim Speichern der Karte:", error);
    }

    renderZweiKarten(referenzKarte, "Meine Karte", gezogeneKarte, "Gezogene Karte", cardWrapper);

    let hatGewonnen = false;
    if (tipp === 'drueber' && gezogeneKarte.wert > referenzKarte.wert) hatGewonnen = true;
    if (tipp === 'drunter' && gezogeneKarte.wert < referenzKarte.wert) hatGewonnen = true;
    if (tipp === 'gleich' && gezogeneKarte.wert === referenzKarte.wert) hatGewonnen = true;

    if (hatGewonnen) {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #4ade80; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Richtig! 🎉</div>
            <div style="font-size: 1.1rem; color: #f8fafc;">Du musst <b>nicht</b> trinken.</div>
        `;
    } else {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #ef4444; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Falsch! ❌</div>
            <div style="font-size: 1.3rem; color: #ef4444; font-weight: bold; text-transform: uppercase;">🍻 DRINK NEHMEN! 🍻</div>
        `;
    }

    controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnNaechsterR2">Nächster Spieler</button>`;

    document.getElementById('btnNaechsterR2').addEventListener('click', () => {
        aktiverSpielerIndex++;
        starteRunde2();
    });
}

// ==========================================
// RUNDE 3
// ==========================================
async function starteRunde3() {
    if (aktiverSpielerIndex >= spielerListe.length) {
        aktiverSpielerIndex = 0;
        starteRunde4(); 
        return;
    }

    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const roundTitle = document.getElementById('roundTitle');
    const gameInstruction = document.getElementById('gameInstruction');
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');

    roundTitle.textContent = "Runde 3: Innerhalb, Außerhalb oder Gleich?";
    gameInstruction.textContent = `${aktuellerSpieler.name}: Liegt die nächste Karte innerhalb, außerhalb oder ist sie gleich?`;

    let ref1 = null;
    let ref2 = null;
    try {
        const dbEintrag = await db.mitspieler.get(aktuellerSpieler.id);
        if (dbEintrag && dbEintrag.karten) {
            if (dbEintrag.karten.length > 0) ref1 = dbEintrag.karten[0];
            if (dbEintrag.karten.length > 1) ref2 = dbEintrag.karten[1];
            aktuellerSpieler.karten = dbEintrag.karten;
        }
    } catch (error) {
        console.error("Fehler beim Laden der Referenzkarten für Runde 3:", error);
    }

    renderZweiKarten(ref1, "Karte 1", ref2, "Karte 2", cardWrapper);

    controlsArea.innerHTML = `
        <div style="display: flex; gap: 0.5rem; width: 100%;">
            <button class="btn-game btn-schwarz" id="btnInnerhalb" style="flex: 1; background-color: #3b82f6;">Innerhalb ↔️</button>
            <button class="btn-game btn-schwarz" id="btnGleichR3" style="flex: 1; background-color: #64748b;">Gleich 🟰</button>
            <button class="btn-game btn-schwarz" id="btnAusserhalb" style="flex: 1; background-color: #8b5cf6;">Außerhalb ↕️</button>
        </div>
    `;

    document.getElementById('btnInnerhalb').addEventListener('click', () => pruefeRunde3('innerhalb', ref1, ref2));
    document.getElementById('btnGleichR3').addEventListener('click', () => pruefeRunde3('gleich', ref1, ref2));
    document.getElementById('btnAusserhalb').addEventListener('click', () => pruefeRunde3('ausserhalb', ref1, ref2));
}

async function pruefeRunde3(tipp, ref1, ref2) {
    const aktuellerSpieler = spielerListe[aktiverSpielerIndex];
    const gezogeneKarte = aktuellesDeck.pop();
    
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');
    const gameInstruction = document.getElementById('gameInstruction');

    try {
        const aktuellerEintrag = await db.mitspieler.get(aktuellerSpieler.id);
        const bisherigeKarten = aktuellerEintrag.karten || [];
        bisherigeKarten.push(gezogeneKarte);
        await db.mitspieler.update(aktuellerSpieler.id, { karten: bisherigeKarten });
        aktuellerSpieler.karten = bisherigeKarten;
    } catch (error) {
        console.error("Fehler beim Speichern der Karte:", error);
    }

    renderDreiKarten(ref1, "Karte 1", ref2, "Karte 2", gezogeneKarte, "Gezogene Karte", cardWrapper);

    let hatGewonnen = false;
    const v1 = ref1 ? ref1.wert : 0;
    const v2 = ref2 ? ref2.wert : 0;
    const minVal = Math.min(v1, v2);
    const maxVal = Math.max(v1, v2);

    if (v1 === v2) {
        if (tipp === 'gleich' && gezogeneKarte.wert === v1) hatGewonnen = true;
        if (tipp === 'ausserhalb' && gezogeneKarte.wert !== v1) hatGewonnen = true;
    } else {
        if (tipp === 'gleich' && (gezogeneKarte.wert === v1 || gezogeneKarte.wert === v2)) {
            hatGewonnen = true;
        } else if (tipp === 'innerhalb' && gezogeneKarte.wert > minVal && gezogeneKarte.wert < maxVal) {
            hatGewonnen = true;
        } else if (tipp === 'ausserhalb' && (gezogeneKarte.wert < minVal || gezogeneKarte.wert > maxVal)) {
            hatGewonnen = true;
        }
    }

    if (hatGewonnen) {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #4ade80; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Richtig! 🎉</div>
            <div style="font-size: 1.1rem; color: #f8fafc;">Du musst <b>nicht</b> trinken.</div>
        `;
    } else {
        gameInstruction.innerHTML = `
            <div style="font-size: 1.2rem; color: #ef4444; font-weight: bold; margin-bottom: 4px;">${aktuellerSpieler.name}: Falsch! ❌</div>
            <div style="font-size: 1.3rem; color: #ef4444; font-weight: bold; text-transform: uppercase;">🍻 DRINK NEHMEN! 🍻</div>
        `;
    }

    controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnNaechsterR3">Nächster Spieler</button>`;

    document.getElementById('btnNaechsterR3').addEventListener('click', () => {
        aktiverSpielerIndex++;
        starteRunde3();
    });
}

// ==========================================
// RUNDE 4: Die Pyramide (Mit vollständiger Kartentabelle)
// ==========================================
function starteRunde4() {
    const roundTitle = document.getElementById('roundTitle');
    roundTitle.textContent = "Runde 4: Die Pyramide";

    db.mitspieler.toArray().then(lesung => {
        spielerListe = lesung;
        
        pyramideReihen = [];
        const reihenGroessen = [4, 3, 2, 1];
        for (let groesse of reihenGroessen) {
            let reihe = [];
            for (let i = 0; i < groesse; i++) {
                if (aktuellesDeck.length > 0) {
                    reihe.push(aktuellesDeck.pop());
                }
            }
            pyramideReihen.push(reihe);
        }
        aufgedecktePyramidenKarten.clear();
        renderBusfahrerScreen();
    });
}

async function renderBusfahrerScreen() {
    const cardWrapper = document.getElementById('cardWrapper');
    const controlsArea = document.getElementById('controlsArea');

    // Erstelle eine saubere Tabelle, die ALLE verbleibenden Karten jedes Spielers nebeneinander anzeigt
    let tabellenZeilenHtml = '';
    for (const s of spielerListe) {
        let kartenHtml = '';
        if (s.karten && s.karten.length > 0) {
            s.karten.forEach(k => {
                const farbKlasse = k.isRot ? 'is-rot' : 'is-schwarz';
                // Saubere Mini-Karten Ansicht, damit jede Karte einzeln und gut lesbar ist
                kartenHtml += `
                    <div class="game-card-element ${farbKlasse}" style="width: 42px; height: 60px; font-size: 0.65rem; display: inline-flex; flex-direction: column; justify-content: space-between; padding: 3px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); flex-shrink: 0;">
                        <div style="font-weight: bold; line-height: 1;">${k.wertName}<br>${k.symbol}</div>
                        <div style="font-size: 0.9rem; text-align: center; line-height: 1;">${k.symbol}</div>
                    </div>
                `;
            });
        } else {
            kartenHtml = '<span style="font-size: 0.85rem; color: #64748b; font-style: italic;">Keine Karten mehr</span>';
        }

        tabellenZeilenHtml += `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 10px; font-weight: 600; color: #f8fafc; width: 30%; vertical-align: middle;">${s.name}</td>
                <td style="padding: 10px; width: 70%; vertical-align: middle;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; min-height: 45px;">
                        ${kartenHtml}
                    </div>
                </td>
            </tr>
        `;
    }

    let spielerTabelleHtml = `
        <div style="background: #0f172a; padding: 0.8rem; border-radius: 12px; border: 1px solid #1e293b; max-height: 420px; overflow-y: auto;">
            <h4 style="color: #cbd5e1; margin-bottom: 0.6rem; font-size: 0.95rem; text-align: center;">Spieler & Handkarten</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #334155; text-align: left; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">
                        <th style="padding: 6px;">Spieler</th>
                        <th style="padding: 6px;">Alle Karten auf der Hand</th>
                    </tr>
                </thead>
                <tbody>
                    ${tabellenZeilenHtml}
                </tbody>
            </table>
        </div>
    `;

    // Pyramide rendern
    let pyramideHtml = '<div style="display: flex; flex-direction: column; align-items: center; gap: 0.6rem; width: 100%;">';
    const schlueckeProReihe = [4, 3, 2, 1];

    pyramideReihen.forEach((reihe, reihenIndex) => {
        pyramideHtml += `<div style="display: flex; gap: 0.6rem; justify-content: center;">`;
        reihe.forEach((karte, kartenIndex) => {
            const kartenschlüssel = `${reihenIndex}-${kartenIndex}`;
            const istAufgedeck = aufgedecktePyramidenKarten.has(kartenschlüssel);

            if (istAufgedeck) {
                const farbKlasse = karte.isRot ? 'is-rot' : 'is-schwarz';
                pyramideHtml += `
                    <div class="game-card-element ${farbKlasse}" style="transform: scale(0.7); margin: -10px;">
                        <div class="card-corner top"><span>${karte.wertName}</span><span>${karte.symbol}</span></div>
                        <div class="card-center-symbol">${karte.symbol}</div>
                        <div class="card-corner bottom"><span>${karte.wertName}</span><span>${karte.symbol}</span></div>
                    </div>
                `;
            } else {
                pyramideHtml += `
                    <div class="game-card-element is-hidden" onclick="klickePyramidenKarte(${reihenIndex}, ${kartenIndex})" style="transform: scale(0.7); margin: -10px; cursor: pointer; border: 2px dashed #64748b;" title="${schlueckeProReihe[reihenIndex]} Schlücke">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-weight: bold;">?</div>
                    </div>
                `;
            }
        });
        pyramideHtml += `</div>`;
    });
    pyramideHtml += `</div>`;

    cardWrapper.innerHTML = `
        <div class="pyramid-container-layout" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem; width: 100%; max-width: 950px; align-items: start;">
            ${spielerTabelleHtml}
            <div style="background: #0f172a; padding: 0.8rem; border-radius: 12px; border: 1px solid #1e293b; display: flex; flex-direction: column; align-items: center;">
                <h4 style="color: #cbd5e1; margin-bottom: 0.5rem; font-size: 0.95rem; text-align: center;">Die Pyramide</h4>
                ${pyramideHtml}
            </div>
        </div>
    `;

    controlsArea.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem; text-align: center;">Tippe auf eine verdeckte Karte in der Pyramide, um sie aufzudecken.</div>`;
}

// Logik beim Anklicken einer Pyramiden-Karte
window.klickePyramidenKarte = async function(reihenIndex, kartenIndex) {
    const kartenschlüssel = `${reihenIndex}-${kartenIndex}`;
    if (aufgedecktePyramidenKarten.has(kartenschlüssel)) return;

    aufgedecktePyramidenKarten.add(kartenschlüssel);
    const gezogeneKarte = pyramideReihen[reihenIndex][kartenIndex];
    const schlueckeProReihe = [4, 3, 2, 1];
    const anzahlSchluecke = schlueckeProReihe[reihenIndex];

    let trefferSpieler = [];

    // Prüfen, ob ein Spieler eine Karte mit demselben Wert besitzt (z.B. 7 == 7 oder König == König)
    for (const s of spielerListe) {
        if (s.karten && s.karten.length > 0) {
            const kartenIndexInHand = s.karten.findIndex(k => k.wert === gezogeneKarte.wert);
            
            if (kartenIndexInHand !== -1) {
                // Karte aus der Hand des Spielers entfernen
                s.karten.splice(kartenIndexInHand, 1);
                
                try {
                    await db.mitspieler.update(s.id, { karten: s.karten });
                } catch (error) {
                    console.error("Fehler beim Aktualisieren der Spieler-Karten in der DB:", error);
                }

                trefferSpieler.push(s.name);
            }
        }
    }

    // UI aktualisieren, damit die weggenommene Karte sofort aus der Tabelle verschwindet
    await renderBusfahrerScreen();

    const gameInstruction = document.getElementById('gameInstruction');
    const controlsArea = document.getElementById('controlsArea');

    let werVerteiltHtml = '';
    if (trefferSpieler.length > 0) {
        werVerteiltHtml = `
            <div style="margin-top: 6px; background: #1e293b; padding: 8px 12px; border-radius: 8px; border: 1px solid #334155;">
                <div style="color: #4ade80; font-weight: bold; margin-bottom: 2px;">Diese Spieler dürfen Schlücke verteilen:</div>
                <ul style="margin: 0; padding-left: 18px; color: #f8fafc;">
                    ${trefferSpieler.map(name => `<li><b>${name}</b> verteilt <b>${anzahlSchluecke}</b> Schlücke! 🍻</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        werVerteiltHtml = `
            <div style="margin-top: 6px; color: #94a3b8; font-style: italic;">
                Kein Spieler besitzt diese Karte. Niemand darf Schlücke verteilen.
            </div>
        `;
    }

    gameInstruction.innerHTML = `
        <div style="font-size: 1.05rem; color: #38bdf8; margin-bottom: 2px;">Aufgedeckte Pyramiden-Karte: <b>${gezogeneKarte.wertName} ${gezogeneKarte.symbol}</b> (Ebene: ${anzahlSchluecke} Schlücke)</div>
        ${werVerteiltHtml}
    `;

    let gesamtKartenAnzahl = 10; // 4 + 3 + 2 + 1
    if (aufgedecktePyramidenKarten.size >= gesamtKartenAnzahl) {
        controlsArea.innerHTML = `<button class="btn-game btn-start" onclick="alert('Pyramide beendet! Weiter zum Bus.')">Weiter zum Finale (Der Bus)</button>`;
    } else {
        controlsArea.innerHTML = `<button class="btn-game btn-start" onclick="document.getElementById('gameInstruction').innerHTML = 'Klicke die nächste Karte an der Pyramide an.';">Nächste Pyramiden-Karte aufdecken</button>`;
    }
};