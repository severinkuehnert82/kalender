// js/busfahrer/game.js
import { Deck } from './deck.js';

export class Game {
    constructor() {
        this.players = [];
        this.deck = null;
        this.pyramid = [];
        this.busfahrerCards = [];
        this.busfahrerIndex = 0;
        this.loser = null;
    }

    initDeck(numDecks) {
        this.deck = new Deck(numDecks);
    }

    addPlayer(name) {
        if (name && !this.players.find(p => p.name === name)) {
            this.players.push({ name, hand: [] });
            return true;
        }
        return false;
    }

    removePlayer(name) {
        this.players = this.players.filter(p => p.name !== name);
    }

    dealCardToPlayer(playerIndex) {
        const card = this.deck.draw();
        this.players[playerIndex].hand.push(card);
        return card;
    }

    checkRound1(card, guess) {
        return card.color === guess; // 'red' or 'black'
    }

    checkRound2(card, prevCard, guess) {
        if (guess === 'gleich') return card.value === prevCard.value;
        if (guess === 'drüber') return card.value > prevCard.value;
        return card.value < prevCard.value; // drunter
    }

    checkRound3(card, card1, card2, guess) {
        const min = Math.min(card1.value, card2.value);
        const max = Math.max(card1.value, card2.value);
        if (guess === 'gleich') return card.value === min || card.value === max;
        if (guess === 'innerhalb') return card.value > min && card.value < max;
        return card.value < min || card.value > max; // außerhalb
    }

    buildPyramid() {
        this.pyramid = [];
        for (let row = 1; row <= 4; row++) {
            let rowCards = [];
            for (let i = 0; i < row; i++) {
                rowCards.push({ card: this.deck.draw(), revealed: false, sips: row });
            }
            this.pyramid.push(rowCards);
        }
    }

    checkPyramidMatch(pyramidCard) {
        let matches = [];
        this.players.forEach(player => {
            player.hand = player.hand.filter(handCard => {
                if (handCard.value === pyramidCard.value) {
                    matches.push({ player: player.name, card: handCard });
                    return false; // Karte ablegen
                }
                return true;
            });
        });
        return matches;
    }

    determineLoser() {
        let maxCards = -1;
        this.players.forEach(p => {
            if (p.hand.length > maxCards) maxCards = p.hand.length;
        });
        
        let potentialLosers = this.players.filter(p => p.hand.length === maxCards);
        
        if (potentialLosers.length > 1) {
            let maxSum = -1;
            potentialLosers.forEach(p => {
                const sum = p.hand.reduce((acc, curr) => acc + curr.value, 0);
                p.tempSum = sum;
                if (sum > maxSum) maxSum = sum;
            });
            potentialLosers = potentialLosers.filter(p => p.tempSum === maxSum);
        }

        if (potentialLosers.length > 1) {
            const randomIndex = Math.floor(Math.random() * potentialLosers.length);
            this.loser = potentialLosers[randomIndex];
        } else {
            this.loser = potentialLosers[0];
        }
        return this.loser;
    }

    setupBusfahrer() {
        this.deck = new Deck(1); // Mischen für Finale
        this.busfahrerCards = Array.from({length: 5}, () => ({ card: this.deck.draw(), revealed: false }));
        this.busfahrerIndex = 0;
    }

    checkBusfahrerGuess(guess) {
        const currentCard = this.busfahrerCards[this.busfahrerIndex].card;
        const prevCard = this.busfahrerIndex === 0 ? null : this.busfahrerCards[this.busfahrerIndex - 1].card;
        
        this.busfahrerCards[this.busfahrerIndex].revealed = true;

        let isCorrect = true;
        if (prevCard) {
            if (guess === 'höher') isCorrect = currentCard.value > prevCard.value;
            else if (guess === 'tiefer') isCorrect = currentCard.value < prevCard.value;
            else if (guess === 'gleich') isCorrect = currentCard.value === prevCard.value;
        }

        if (isCorrect) {
            this.busfahrerIndex++;
            return { success: true, won: this.busfahrerIndex === 5 };
        } else {
            // Falsch: Ersetze aufgedeckte Karten durch neue
            for (let i = 0; i <= this.busfahrerIndex; i++) {
                this.busfahrerCards[i] = { card: this.deck.draw(), revealed: false };
            }
            this.busfahrerIndex = 0;
            return { success: false, won: false };
        }
    }
}