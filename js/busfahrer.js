import { db } from '../db.js';
import { loadHeader } from './header.js';

// Bayerisches Blatt: Herz & Gras = rot, Eichel & Schelle = schwarz (32 Karten, kein "6")
const FARBEN = [
  { name: 'Herz',    symbol: '♥️', rot: true },
  { name: 'Gras',    symbol: '🍃', rot: true },
  { name: 'Eichel',  symbol: '🌰', rot: false },
  { name: 'Schelle', symbol: '🔔', rot: false },
];

const WERTE = [
  { name: '7',     wert: 7 },
  { name: '8',     wert: 8 },
  { name: '9',     wert: 9 },
  { name: '10',    wert: 10 },
  { name: 'Unter', wert: 11 },
  { name: 'Ober',  wert: 12 },
  { name: 'König', wert: 13 },
  { name: 'Sau',   wert: 14 },
];

function erstelleEinzelnesDeck() {
  const deck = [];
  for (const farbe of FARBEN) {
    for (const wert of WERTE) {
      deck.push({
        farbe: farbe.name,
        symbol: farbe.symbol,
        isRot: farbe.rot,
        wertName: wert.name,
        wert: wert.wert,
      });
    }
  }
  return deck;
}

function mischeDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function erstelleMehrereDecks(anzahlDecks) {
  let gesamtDeck = [];
  for (let i = 0; i < anzahlDecks; i++) {
    gesamtDeck = gesamtDeck.concat(erstelleEinzelnesDeck());
  }
  return mischeDeck(gesamtDeck);
}

// Sicherheitsnetz: falls das Deck (z. B. bei vielen Spielern + 1 Deck) leer wird,
// wird automatisch neu gemischt statt das Spiel abstürzen zu lassen.
function ziehKarte() {
  if (aktuellesDeck.length === 0) {
    aktuellesDeck = erstelleMehrereDecks(gewaehlteDecks);
  }
  return aktuellesDeck.pop();
}

// ==========================================
// Spielstatus (rein im Arbeitsspeicher – wird NICHT in die Spieler-Datenbank
// geschrieben, damit die Spielerverwaltung sauber bleibt und jeder Kartenzug
// sofort reagiert statt auf einen Datenbank-Request zu warten)
// ==========================================
let alleGespeichertenSpieler = [];
let ausgewaehlteIds = new Set();
let teilnehmer = []; // { id, name, karten: [] }
let aktuellesDeck = [];
let aktiverSpielerIndex = 0;
let gewaehlteDecks = 1;

let pyramideReihen = [];
let aufgedecktePyramidenKarten = new Set();

let busfahrerSpieler = null;
let busfahrerWarZufall = false;
let busVorkarte = null;
let busReihe = [];
let busIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadHeader();
  zeigeStartScreen();
});

// ==========================================
// Kleine Render-Helfer
// ==========================================
function kartenHtml(karte, klein = false) {
  if (!karte) return `<div class="game-card-element is-hidden${klein ? ' is-small' : ''}"></div>`;
  const farbKlasse = karte.isRot ? 'is-rot' : 'is-schwarz';
  return `
    <div class="game-card-element ${farbKlasse}${klein ? ' is-small' : ''}">
      <div class="card-corner top"><span>${karte.wertName}</span><span>${karte.symbol}</span></div>
      <div class="card-center-symbol">${karte.symbol}</div>
      <div class="card-corner bottom"><span>${karte.wertName}</span><span>${karte.symbol}</span></div>
    </div>
  `;
}

function renderKarte(karte, container) {
  container.innerHTML = kartenHtml(karte);
}

function renderKartenReihe(karten, container) {
  // karten: [{karte, titel}]
  container.innerHTML = `
    <div class="karten-reihe">
      ${karten
        .map(
          (k) => `
        <div class="karten-reihe-item">
          <span class="karten-reihe-titel">${k.titel}</span>
          ${kartenHtml(k.karte)}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function setElemente() {
  return {
    roundTitle: document.getElementById('roundTitle'),
    gameInstruction: document.getElementById('gameInstruction'),
    cardWrapper: document.getElementById('cardWrapper'),
    controlsArea: document.getElementById('controlsArea'),
  };
}

function ergebnisAnzeigen(gameInstruction, richtig) {
  if (richtig) {
    gameInstruction.innerHTML = `
      <div class="ergebnis ergebnis-richtig">Richtig! 🎉</div>
      <div class="ergebnis-hinweis">Du musst nicht trinken.</div>
    `;
  } else {
    gameInstruction.innerHTML = `
      <div class="ergebnis ergebnis-falsch">Falsch! ❌</div>
      <div class="ergebnis-hinweis ergebnis-trinken">🍻 1 Schluck trinken! 🍻</div>
    `;
  }
}

// ==========================================
// Start-/Vorbereitungsbildschirm
// ==========================================
async function zeigeStartScreen() {
  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();

  roundTitle.textContent = 'Busfahrer';
  gameInstruction.textContent = 'Wähle die Mitspieler für diese Runde aus.';
  renderKarte(null, cardWrapper);

  try {
    alleGespeichertenSpieler = await db.mitspieler.orderBy('name').toArray();
  } catch (error) {
    console.error('Fehler beim Laden der Spieler:', error);
    alleGespeichertenSpieler = [];
  }

  // Beim allerersten Aufruf sind standardmäßig alle Spieler ausgewählt
  if (ausgewaehlteIds.size === 0) {
    ausgewaehlteIds = new Set(alleGespeichertenSpieler.map((s) => s.id));
  } else {
    // Nur Spieler behalten, die noch existieren
    ausgewaehlteIds = new Set(
      [...ausgewaehlteIds].filter((id) => alleGespeichertenSpieler.some((s) => s.id === id))
    );
  }

  renderStartScreen(controlsArea);
}

function renderStartScreen(controlsArea) {
  let spielerHtml = '';
  if (alleGespeichertenSpieler.length === 0) {
    spielerHtml = `
      <div class="empty-hint" style="padding: 0.75rem 0;">
        Noch keine Spieler gespeichert.
      </div>
    `;
  } else {
    spielerHtml = alleGespeichertenSpieler
      .map(
        (s) => `
      <label class="player-select-item">
        <input type="checkbox" class="player-checkbox" value="${s.id}" ${ausgewaehlteIds.has(s.id) ? 'checked' : ''}>
        <span>${s.name}</span>
      </label>
    `
      )
      .join('');
  }

  const anzahlAusgewaehlt = ausgewaehlteIds.size;

  controlsArea.innerHTML = `
    <div class="setup-split">
      <div class="setup-box">
        <div style="width: 100%;">
          <h3>Mitspieler (${anzahlAusgewaehlt} ausgewählt)</h3>
          <div class="player-select-list">
            ${spielerHtml}
          </div>
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
    <p id="startFehler" class="form-error" hidden></p>
    <button class="btn-game btn-start" id="btnSpielStarten">Spiel starten</button>
  `;

  controlsArea.querySelectorAll('.btn-deck').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      gewaehlteDecks = Number(e.target.getAttribute('data-decks'));
      controlsArea.querySelectorAll('.btn-deck').forEach((b) => b.classList.remove('selected'));
      e.target.classList.add('selected');
    });
  });

  controlsArea.querySelectorAll('.player-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = Number(e.target.value);
      if (e.target.checked) ausgewaehlteIds.add(id);
      else ausgewaehlteIds.delete(id);
      renderStartScreen(controlsArea);
    });
  });

  document.getElementById('btnSpielStarten').addEventListener('click', () => {
    const startFehler = document.getElementById('startFehler');
    if (ausgewaehlteIds.size === 0) {
      startFehler.textContent = alleGespeichertenSpieler.length === 0
        ? 'Bitte lege zuerst mindestens einen Spieler unter „Spieler verwalten“ an.'
        : 'Bitte wähle mindestens einen Spieler aus.';
      startFehler.hidden = false;
      return;
    }

    teilnehmer = alleGespeichertenSpieler
      .filter((s) => ausgewaehlteIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, karten: [] }));

    aktuellesDeck = erstelleMehrereDecks(gewaehlteDecks);
    aktiverSpielerIndex = 0;
    starteRunde1();
  });
}

// ==========================================
// RUNDE 1: Rot oder Schwarz
// ==========================================
function starteRunde1() {
  if (aktiverSpielerIndex >= teilnehmer.length) {
    aktiverSpielerIndex = 0;
    starteRunde2();
    return;
  }

  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];

  roundTitle.textContent = 'Runde 1: Rot oder Schwarz?';
  gameInstruction.textContent = `${aktuellerSpieler.name} ist dran: Ist die nächste Karte Rot oder Schwarz?`;
  renderKarte(null, cardWrapper);

  controlsArea.innerHTML = `
    <div class="fortschritt">Spieler ${aktiverSpielerIndex + 1}/${teilnehmer.length}</div>
    <button class="btn-game btn-rot" id="btnRot">Rot</button>
    <button class="btn-game btn-schwarz" id="btnSchwarz">Schwarz</button>
  `;

  document.getElementById('btnRot').addEventListener('click', () => pruefeRunde1(true));
  document.getElementById('btnSchwarz').addEventListener('click', () => pruefeRunde1(false));
}

function pruefeRunde1(tippIstRot) {
  const { cardWrapper, controlsArea, gameInstruction } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];
  const gezogeneKarte = ziehKarte();
  aktuellerSpieler.karten.push(gezogeneKarte);

  renderKarte(gezogeneKarte, cardWrapper);
  ergebnisAnzeigen(gameInstruction, tippIstRot === gezogeneKarte.isRot);

  controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnWeiter1">Weiter</button>`;
  document.getElementById('btnWeiter1').addEventListener('click', () => {
    aktiverSpielerIndex++;
    starteRunde1();
  });
}

// ==========================================
// RUNDE 2: Drüber, Drunter oder Gleich (bezogen auf 1. Karte)
// ==========================================
function starteRunde2() {
  if (aktiverSpielerIndex >= teilnehmer.length) {
    aktiverSpielerIndex = 0;
    starteRunde3();
    return;
  }

  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];
  const referenzKarte = aktuellerSpieler.karten[0];

  roundTitle.textContent = 'Runde 2: Drüber, Drunter oder Gleich?';
  gameInstruction.textContent = `${aktuellerSpieler.name}: Ist die nächste Karte höher, niedriger oder gleich?`;
  renderKarte(referenzKarte, cardWrapper);

  controlsArea.innerHTML = `
    <div class="fortschritt">Spieler ${aktiverSpielerIndex + 1}/${teilnehmer.length}</div>
    <div class="btn-row-3">
      <button class="btn-game btn-blau" id="btnDrunter">Drunter ⬇️</button>
      <button class="btn-game btn-grau" id="btnGleich">Gleich 🟰</button>
      <button class="btn-game btn-gruen" id="btnDrueber">Drüber ⬆️</button>
    </div>
  `;

  document.getElementById('btnDrunter').addEventListener('click', () => pruefeRunde2('drunter', referenzKarte));
  document.getElementById('btnGleich').addEventListener('click', () => pruefeRunde2('gleich', referenzKarte));
  document.getElementById('btnDrueber').addEventListener('click', () => pruefeRunde2('drueber', referenzKarte));
}

function pruefeRunde2(tipp, referenzKarte) {
  const { cardWrapper, controlsArea, gameInstruction } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];
  const gezogeneKarte = ziehKarte();
  aktuellerSpieler.karten.push(gezogeneKarte);

  renderKartenReihe(
    [
      { karte: referenzKarte, titel: 'Meine Karte' },
      { karte: gezogeneKarte, titel: 'Gezogene Karte' },
    ],
    cardWrapper
  );

  let hatGewonnen = false;
  if (tipp === 'drueber' && gezogeneKarte.wert > referenzKarte.wert) hatGewonnen = true;
  if (tipp === 'drunter' && gezogeneKarte.wert < referenzKarte.wert) hatGewonnen = true;
  if (tipp === 'gleich' && gezogeneKarte.wert === referenzKarte.wert) hatGewonnen = true;

  ergebnisAnzeigen(gameInstruction, hatGewonnen);

  controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnWeiter2">Weiter</button>`;
  document.getElementById('btnWeiter2').addEventListener('click', () => {
    aktiverSpielerIndex++;
    starteRunde2();
  });
}

// ==========================================
// RUNDE 3: Innerhalb, Außerhalb oder Gleich (bezogen auf 1. + 2. Karte)
// ==========================================
function starteRunde3() {
  if (aktiverSpielerIndex >= teilnehmer.length) {
    aktiverSpielerIndex = 0;
    starteRunde4();
    return;
  }

  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];
  const ref1 = aktuellerSpieler.karten[0];
  const ref2 = aktuellerSpieler.karten[1];

  roundTitle.textContent = 'Runde 3: Innerhalb, Außerhalb oder Gleich?';
  gameInstruction.textContent = `${aktuellerSpieler.name}: Liegt die nächste Karte zwischen den beiden, außerhalb oder ist sie gleich?`;
  renderKartenReihe(
    [
      { karte: ref1, titel: 'Karte 1' },
      { karte: ref2, titel: 'Karte 2' },
    ],
    cardWrapper
  );

  controlsArea.innerHTML = `
    <div class="fortschritt">Spieler ${aktiverSpielerIndex + 1}/${teilnehmer.length}</div>
    <div class="btn-row-3">
      <button class="btn-game btn-blau" id="btnInnerhalb">Innerhalb ↔️</button>
      <button class="btn-game btn-grau" id="btnGleichR3">Gleich 🟰</button>
      <button class="btn-game btn-lila" id="btnAusserhalb">Außerhalb ↕️</button>
    </div>
  `;

  document.getElementById('btnInnerhalb').addEventListener('click', () => pruefeRunde3('innerhalb', ref1, ref2));
  document.getElementById('btnGleichR3').addEventListener('click', () => pruefeRunde3('gleich', ref1, ref2));
  document.getElementById('btnAusserhalb').addEventListener('click', () => pruefeRunde3('ausserhalb', ref1, ref2));
}

function pruefeRunde3(tipp, ref1, ref2) {
  const { cardWrapper, controlsArea, gameInstruction } = setElemente();
  const aktuellerSpieler = teilnehmer[aktiverSpielerIndex];
  const gezogeneKarte = ziehKarte();
  aktuellerSpieler.karten.push(gezogeneKarte);

  renderKartenReihe(
    [
      { karte: ref1, titel: 'Karte 1' },
      { karte: ref2, titel: 'Karte 2' },
      { karte: gezogeneKarte, titel: 'Gezogen' },
    ],
    cardWrapper
  );

  const minVal = Math.min(ref1.wert, ref2.wert);
  const maxVal = Math.max(ref1.wert, ref2.wert);

  let hatGewonnen = false;
  if (ref1.wert === ref2.wert) {
    if (tipp === 'gleich' && gezogeneKarte.wert === ref1.wert) hatGewonnen = true;
    if (tipp === 'ausserhalb' && gezogeneKarte.wert !== ref1.wert) hatGewonnen = true;
  } else {
    if (tipp === 'gleich' && (gezogeneKarte.wert === ref1.wert || gezogeneKarte.wert === ref2.wert)) {
      hatGewonnen = true;
    } else if (tipp === 'innerhalb' && gezogeneKarte.wert > minVal && gezogeneKarte.wert < maxVal) {
      hatGewonnen = true;
    } else if (tipp === 'ausserhalb' && (gezogeneKarte.wert < minVal || gezogeneKarte.wert > maxVal)) {
      hatGewonnen = true;
    }
  }

  ergebnisAnzeigen(gameInstruction, hatGewonnen);

  controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnWeiter3">Weiter</button>`;
  document.getElementById('btnWeiter3').addEventListener('click', () => {
    aktiverSpielerIndex++;
    starteRunde3();
  });
}

// ==========================================
// RUNDE 4: Die Pyramide
// Zeile 0 = Spitze (1 Karte, 1 Schluck) ... Zeile 3 = Basis (4 Karten, 4 Schlücke)
// ==========================================
const PYRAMIDE_REIHENGROESSEN = [1, 2, 3, 4];

function starteRunde4() {
  const { roundTitle } = setElemente();
  roundTitle.textContent = 'Runde 4: Die Pyramide';

  pyramideReihen = PYRAMIDE_REIHENGROESSEN.map((groesse) => {
    const reihe = [];
    for (let i = 0; i < groesse; i++) reihe.push(ziehKarte());
    return reihe;
  });
  aufgedecktePyramidenKarten.clear();

  renderPyramidenScreen();
}

function renderHandkartenUebersicht() {
  const zeilen = teilnehmer
    .map((s) => {
      const kartenHtmlListe = s.karten.length
        ? s.karten.map((k) => kartenHtml(k, true)).join('')
        : '<span class="keine-karten-hinweis">Keine Karten mehr</span>';
      return `
        <tr>
          <td class="hand-spielername">${s.name}</td>
          <td><div class="hand-karten-zeile">${kartenHtmlListe}</div></td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="hand-uebersicht">
      <h4>Spieler & Handkarten</h4>
      <table class="hand-tabelle">
        <thead>
          <tr><th>Spieler</th><th>Karten auf der Hand</th></tr>
        </thead>
        <tbody>${zeilen}</tbody>
      </table>
    </div>
  `;
}

function renderPyramidenScreen() {
  const { gameInstruction, cardWrapper, controlsArea } = setElemente();

  let pyramideHtml = '<div class="pyramide">';
  pyramideReihen.forEach((reihe, reihenIndex) => {
    pyramideHtml += `<div class="pyramide-reihe">`;
    reihe.forEach((karte, kartenIndex) => {
      const schluessel = `${reihenIndex}-${kartenIndex}`;
      const istAufgedeckt = aufgedecktePyramidenKarten.has(schluessel);
      if (istAufgedeckt) {
        pyramideHtml += `<div class="pyramide-karte">${kartenHtml(karte, true)}</div>`;
      } else {
        pyramideHtml += `
          <button class="pyramide-karte pyramide-verdeckt" data-reihe="${reihenIndex}" data-karte="${kartenIndex}" aria-label="Karte aufdecken (${reihenIndex + 1} Schluck${reihenIndex > 0 ? 'e' : ''})">
            <span>?</span>
          </button>
        `;
      }
    });
    pyramideHtml += `<span class="pyramide-schlucke">${reihenIndex + 1} Schluck${reihenIndex > 0 ? 'e' : ''}</span>`;
    pyramideHtml += `</div>`;
  });
  pyramideHtml += '</div>';

  cardWrapper.innerHTML = `
    <div class="pyramide-layout">
      ${renderHandkartenUebersicht()}
      <div class="pyramide-box">
        <h4>Die Pyramide</h4>
        ${pyramideHtml}
      </div>
    </div>
  `;

  cardWrapper.querySelectorAll('.pyramide-verdeckt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reihenIndex = Number(btn.getAttribute('data-reihe'));
      const kartenIndex = Number(btn.getAttribute('data-karte'));
      klickePyramidenKarte(reihenIndex, kartenIndex);
    });
  });

  const gesamtKartenAnzahl = PYRAMIDE_REIHENGROESSEN.reduce((a, b) => a + b, 0);
  if (aufgedecktePyramidenKarten.size >= gesamtKartenAnzahl) {
    gameInstruction.textContent = 'Die Pyramide ist komplett aufgedeckt.';
    controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnZumBus">Weiter: Wer muss Busfahren?</button>`;
    document.getElementById('btnZumBus').addEventListener('click', ermittleBusfahrer);
  } else {
    gameInstruction.textContent = 'Tippe auf eine verdeckte Karte in der Pyramide, um sie aufzudecken.';
    controlsArea.innerHTML = `<div class="fortschritt">${aufgedecktePyramidenKarten.size}/${gesamtKartenAnzahl} Karten aufgedeckt</div>`;
  }
}

function klickePyramidenKarte(reihenIndex, kartenIndex) {
  const schluessel = `${reihenIndex}-${kartenIndex}`;
  if (aufgedecktePyramidenKarten.has(schluessel)) return;
  aufgedecktePyramidenKarten.add(schluessel);

  const gezogeneKarte = pyramideReihen[reihenIndex][kartenIndex];
  const anzahlSchluecke = reihenIndex + 1;

  const trefferSpieler = [];
  for (const s of teilnehmer) {
    // Ein Spieler kann pro Pyramidenkarte mehrere passende Karten abwerfen (z. B. bei mehreren Decks)
    let idx = s.karten.findIndex((k) => k.wert === gezogeneKarte.wert);
    while (idx !== -1) {
      s.karten.splice(idx, 1);
      trefferSpieler.push(s.name);
      idx = s.karten.findIndex((k) => k.wert === gezogeneKarte.wert);
    }
  }

  renderPyramidenScreen();

  const { gameInstruction } = setElemente();
  let werVerteiltHtml = '';
  if (trefferSpieler.length > 0) {
    werVerteiltHtml = `
      <div class="pyramide-match">
        <div class="pyramide-match-titel">📣 Diese Spieler dürfen Schlücke verteilen:</div>
        <ul>
          ${trefferSpieler.map((name) => `<li><b>${name}</b> verteilt <b>${anzahlSchluecke}</b> Schluck${anzahlSchluecke > 1 ? 'e' : ''}!</li>`).join('')}
        </ul>
      </div>
    `;
  } else {
    werVerteiltHtml = `<div class="pyramide-kein-match">Kein Spieler besitzt diese Karte. Niemand verteilt.</div>`;
  }

  gameInstruction.innerHTML = `
    <div class="pyramide-aufgedeckt">Aufgedeckt: <b>${gezogeneKarte.wertName} ${gezogeneKarte.symbol}</b> (${anzahlSchluecke} Schluck${anzahlSchluecke > 1 ? 'e' : ''})</div>
    ${werVerteiltHtml}
  `;
}

// ==========================================
// Wer muss Busfahren? (meiste Handkarten, Tie-Break über Punktsumme, dann Los)
// ==========================================
function ermittleBusfahrer() {
  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  roundTitle.textContent = 'Wer muss Busfahren?';

  let kandidaten = [...teilnehmer];
  const maxKarten = Math.max(...kandidaten.map((s) => s.karten.length));
  kandidaten = kandidaten.filter((s) => s.karten.length === maxKarten);

  busfahrerWarZufall = false;
  if (kandidaten.length > 1) {
    const punkteVon = (s) => s.karten.reduce((sum, k) => sum + k.wert, 0);
    const maxPunkte = Math.max(...kandidaten.map(punkteVon));
    kandidaten = kandidaten.filter((s) => punkteVon(s) === maxPunkte);
  }
  if (kandidaten.length > 1) {
    busfahrerWarZufall = true;
    kandidaten = [kandidaten[Math.floor(Math.random() * kandidaten.length)]];
  }

  busfahrerSpieler = kandidaten[0];

  cardWrapper.innerHTML = `
    <div class="busfahrer-reveal">
      <div class="busfahrer-emoji">🚌</div>
      <div class="busfahrer-name">${busfahrerSpieler.name}</div>
      <div class="busfahrer-untertitel">muss Busfahren!</div>
      ${busfahrerWarZufall ? '<div class="busfahrer-los-hinweis">(Entscheidung durch Los bei Gleichstand)</div>' : ''}
    </div>
  `;
  gameInstruction.textContent = `${busfahrerSpieler.name} hatte mit ${busfahrerSpieler.karten.length} Karten die meisten übrig.`;

  controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnZumFinale">Weiter zum Busfahren</button>`;
  document.getElementById('btnZumFinale').addEventListener('click', starteBusfahren);
}

// ==========================================
// RUNDE 5: Das Busfahren (Finale)
// ==========================================
function neueBusReihe() {
  busVorkarte = ziehKarte();
  busReihe = [ziehKarte(), ziehKarte(), ziehKarte(), ziehKarte(), ziehKarte()];
  busIndex = 0;
}

function starteBusfahren() {
  aktuellesDeck = erstelleMehrereDecks(gewaehlteDecks);
  neueBusReihe();
  renderBusfahrenScreen('Karte 1 von 5: Höher, tiefer oder gleich wie die Startkarte?');
}

function renderBusfahrenScreen(hinweisText) {
  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  roundTitle.textContent = `🚌 ${busfahrerSpieler.name} fährt Bus`;
  gameInstruction.textContent = hinweisText;

  const reihenHtml = busReihe
    .map((karte, i) => {
      const istAufgedeckt = i < busIndex;
      const istAktiv = i === busIndex;
      return `<div class="bus-karte ${istAktiv ? 'bus-karte-aktiv' : ''}">${kartenHtml(istAufgedeckt ? karte : null)}</div>`;
    })
    .join('');

  cardWrapper.innerHTML = `
    <div class="bus-reihe">
      <div class="bus-karte bus-startkarte">
        ${kartenHtml(busVorkarte)}
        <span class="bus-label">Start</span>
      </div>
      ${reihenHtml}
    </div>
  `;

  controlsArea.innerHTML = `
    <div class="fortschritt">Karte ${busIndex + 1} von 5</div>
    <div class="btn-row-3">
      <button class="btn-game btn-blau" id="btnBusTiefer">Tiefer ⬇️</button>
      <button class="btn-game btn-grau" id="btnBusGleich">Gleich 🟰</button>
      <button class="btn-game btn-gruen" id="btnBusHoeher">Höher ⬆️</button>
    </div>
  `;

  document.getElementById('btnBusTiefer').addEventListener('click', () => pruefeBusfahren('tiefer'));
  document.getElementById('btnBusGleich').addEventListener('click', () => pruefeBusfahren('gleich'));
  document.getElementById('btnBusHoeher').addEventListener('click', () => pruefeBusfahren('hoeher'));
}

function pruefeBusfahren(tipp) {
  const referenz = busIndex === 0 ? busVorkarte : busReihe[busIndex - 1];
  const aktuelleKarte = busReihe[busIndex];

  let richtig = false;
  if (tipp === 'gleich') richtig = aktuelleKarte.wert === referenz.wert;
  else if (tipp === 'hoeher') richtig = aktuelleKarte.wert > referenz.wert;
  else if (tipp === 'tiefer') richtig = aktuelleKarte.wert < referenz.wert;

  if (richtig) {
    busIndex++;
    if (busIndex >= busReihe.length) {
      zeigeBusfahrenGewonnen();
      return;
    }
    renderBusfahrenScreen(`Richtig! Weiter mit Karte ${busIndex + 1} von 5.`);
  } else {
    neueBusReihe();
    renderBusfahrenScreen('Falsch! 🍻 1 Schluck trinken. Die Reihe wird neu gemischt – zurück zu Karte 1.');
  }
}

function zeigeBusfahrenGewonnen() {
  const { roundTitle, gameInstruction, cardWrapper, controlsArea } = setElemente();
  roundTitle.textContent = '🎉 Geschafft!';
  gameInstruction.innerHTML = `<b>${busfahrerSpieler.name}</b> hat alle 5 Karten richtig erraten und ist kein Busfahrer mehr!`;

  cardWrapper.innerHTML = `
    <div class="bus-reihe">
      ${busReihe.map((k) => kartenHtml(k)).join('')}
    </div>
  `;

  controlsArea.innerHTML = `<button class="btn-game btn-start" id="btnNeuesSpiel">Neues Spiel starten</button>`;
  document.getElementById('btnNeuesSpiel').addEventListener('click', () => {
    teilnehmer = [];
    zeigeStartScreen();
  });
}
