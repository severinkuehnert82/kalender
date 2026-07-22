// js/busfahrer/ui.js
import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';
import { Game } from './game.js';

const db = new Dexie("BusfahrerApp");
db.version(1).stores({ recentPlayers: 'name' });

export async function initBusfahrer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const game = new Game();
    
    container.innerHTML = `
        <div id="bf-app" class="bf-container">
            <header class="bf-header"><h1>🚌 Busfahrer</h1></header>
            <main id="bf-main-content"></main>
        </div>
    `;
    const main = document.getElementById('bf-main-content');

    // --- Phase 1: Setup ---
    async function renderSetup() {
        const recent = await db.recentPlayers.toArray();
        main.innerHTML = `
            <div class="bf-card">
                <h2>Spieleinstellungen</h2>
                <div class="bf-input-group">
                    <label>Anzahl Decks (32 Karten)</label>
                    <input type="number" id="deckCount" value="1" min="1" max="3">
                </div>
                <h3>Spieler</h3>
                <div class="bf-player-add">
                    <input type="text" id="playerName" placeholder="Spielername" list="recent-names">
                    <datalist id="recent-names">
                        ${recent.map(p => `<option value="${p.name}">`).join('')}
                    </datalist>
                    <button id="addPlayerBtn" class="bf-btn bf-btn-primary">+</button>
                </div>
                <ul id="playerList" class="bf-player-list"></ul>
                <button id="startGameBtn" class="bf-btn bf-btn-success bf-mt" disabled>Spiel Starten</button>
            </div>
        `;

        const updatePlayerList = () => {
            const list = document.getElementById('playerList');
            list.innerHTML = game.players.map(p => `
                <li>${p.name} <button data-name="${p.name}" class="bf-btn-remove">x</button></li>
            `).join('');
            document.getElementById('startGameBtn').disabled = game.players.length === 0;
        };

        document.getElementById('addPlayerBtn').addEventListener('click', async () => {
            const name = document.getElementById('playerName').value.trim();
            if (game.addPlayer(name)) {
                await db.recentPlayers.put({ name });
                document.getElementById('playerName').value = '';
                updatePlayerList();
            }
        });

        main.addEventListener('click', (e) => {
            if (e.target.classList.contains('bf-btn-remove')) {
                game.removePlayer(e.target.getAttribute('data-name'));
                updatePlayerList();
            }
        });

        document.getElementById('startGameBtn').addEventListener('click', () => {
            game.initDeck(parseInt(document.getElementById('deckCount').value));
            startPhase2();
        });
    }

    // --- Phase 2: Ratespiel ---
    function startPhase2() {
        let currentPlayerIdx = 0;
        let currentRound = 1;

        const renderGuessUI = () => {
            if (currentPlayerIdx >= game.players.length) {
                currentPlayerIdx = 0;
                currentRound++;
                if (currentRound > 3) return startPhase3();
            }

            const player = game.players[currentPlayerIdx];
            const handHtml = player.hand.map(c => renderCard(c)).join('');

            let buttonsHtml = '';
            if (currentRound === 1) {
                buttonsHtml = `
                    <button class="bf-btn bf-btn-danger" data-guess="red">Rot</button>
                    <button class="bf-btn bf-btn-dark" data-guess="black">Schwarz</button>
                `;
            } else if (currentRound === 2) {
                buttonsHtml = `
                    <button class="bf-btn" data-guess="drunter">Drunter</button>
                    <button class="bf-btn" data-guess="gleich">Gleich</button>
                    <button class="bf-btn" data-guess="drüber">Drüber</button>
                `;
            } else if (currentRound === 3) {
                buttonsHtml = `
                    <button class="bf-btn" data-guess="innerhalb">Innerhalb</button>
                    <button class="bf-btn" data-guess="gleich">Gleich</button>
                    <button class="bf-btn" data-guess="außerhalb">Außerhalb</button>
                `;
            }

            main.innerHTML = `
                <div class="bf-card bf-text-center">
                    <h2>Runde ${currentRound}</h2>
                    <h3>${player.name} ist dran</h3>
                    <div class="bf-hand">${handHtml}</div>
                    <div class="bf-actions">${buttonsHtml}</div>
                </div>
            `;

            main.querySelectorAll('.bf-actions .bf-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const guess = e.target.getAttribute('data-guess');
                    const newCard = game.dealCardToPlayer(currentPlayerIdx);
                    
                    let correct = false;
                    if (currentRound === 1) correct = game.checkRound1(newCard, guess);
                    if (currentRound === 2) correct = game.checkRound2(newCard, player.hand[0], guess);
                    if (currentRound === 3) correct = game.checkRound3(newCard, player.hand[0], player.hand[1], guess);

                    alert(`${newCard.symbol} ${newCard.name}\n${correct ? 'Richtig!' : 'Falsch! 1 Schluck trinken 🍻'}`);
                    currentPlayerIdx++;
                    renderGuessUI();
                });
            });
        };
        renderGuessUI();
    }

    // --- Phase 3: Pyramide ---
    function startPhase3() {
        game.buildPyramid();
        
        const renderPyramid = () => {
            main.innerHTML = `
                <div class="bf-card bf-text-center">
                    <h2>Die Pyramide</h2>
                    <div class="bf-pyramid">
                        ${game.pyramid.map((row, rIdx) => `
                            <div class="bf-pyramid-row">
                                ${row.map((c, cIdx) => `
                                    <div class="bf-card-wrap" data-row="${rIdx}" data-col="${cIdx}">
                                        ${c.revealed ? renderCard(c.card) : '<div class="bf-card-back"></div>'}
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                    <button id="evalBtn" class="bf-btn bf-btn-primary bf-mt">Auswertung (Verlierer finden)</button>
                </div>
            `;

            main.querySelectorAll('.bf-card-back').forEach(el => {
                el.parentElement.addEventListener('click', function() {
                    const r = this.getAttribute('data-row');
                    const c = this.getAttribute('data-col');
                    if (game.pyramid[r][c].revealed) return;

                    game.pyramid[r][c].revealed = true;
                    const matches = game.checkPyramidMatch(game.pyramid[r][c].card);
                    
                    if (matches.length > 0) {
                        const sips = game.pyramid[r][c].sips;
                        const msg = matches.map(m => `📣 Match! ${m.player} hat eine ${m.card.name} und verteilt ${sips} Schluck(e)!`).join('\n');
                        alert(msg);
                    }
                    renderPyramid();
                });
            });

            document.getElementById('evalBtn').addEventListener('click', () => {
                const loser = game.determineLoser();
                alert(`Der Verlierer ist: ${loser.name}! Bereit machen zum Busfahren!`);
                startPhase5();
            });
        };
        renderPyramid();
    }

    // --- Phase 5: Busfahren ---
    function startPhase5() {
        game.setupBusfahrer();
        
        const renderBusfahrer = () => {
            main.innerHTML = `
                <div class="bf-card bf-text-center">
                    <h2>Busfahren: ${game.loser.name}</h2>
                    <div class="bf-bus-row">
                        ${game.busfahrerCards.map((c, i) => `
                            <div class="bf-card-wrap ${i === game.busfahrerIndex ? 'bf-active-card' : ''}">
                                ${c.revealed ? renderCard(c.card) : '<div class="bf-card-back"></div>'}
                            </div>
                        `).join('')}
                    </div>
                    <div class="bf-actions bf-mt">
                        ${game.busfahrerIndex === 0 
                            ? `<button id="revealFirstBtn" class="bf-btn bf-btn-primary">Erste Karte aufdecken</button>`
                            : `
                            <button class="bf-btn bf-btn-primary" data-guess="tiefer">Tiefer</button>
                            <button class="bf-btn bf-btn-dark" data-guess="gleich">Gleich</button>
                            <button class="bf-btn bf-btn-danger" data-guess="höher">Höher</button>
                        `}
                    </div>
                </div>
            `;

            if (game.busfahrerIndex === 0) {
                document.getElementById('revealFirstBtn')?.addEventListener('click', () => {
                    game.busfahrerCards[0].revealed = true;
                    renderBusfahrer();
                });
            } else {
                main.querySelectorAll('.bf-actions .bf-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const guess = e.target.getAttribute('data-guess');
                        const result = game.checkBusfahrerGuess(guess);
                        
                        if (result.won) {
                            alert("🎉 Gewonnen! Du darfst aus dem Bus aussteigen!");
                            renderSetup(); // Zurück zum Menü
                        } else if (!result.success) {
                            alert("❌ Falsch! 1 Schluck trinken und von vorne anfangen!");
                            renderBusfahrer();
                        } else {
                            renderBusfahrer();
                        }
                    });
                });
            }
        };
        renderBusfahrer();
    }

    // Helper für Kartendarstellung
    function renderCard(card) {
        return `<div class="bf-playing-card" style="color: ${card.color}; border-color: ${card.color}">
            <div class="bf-card-rank">${card.name}</div>
            <div class="bf-card-suit">${card.symbol}</div>
        </div>`;
    }

    renderSetup();
}