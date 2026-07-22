const SUITS = [
    { name: 'Herz', symbol: '♥️', color: 'red' },
    { name: 'Schelle', symbol: '🔔', color: 'red' },
    { name: 'Eichel', symbol: '🌰', color: 'black' },
    { name: 'Blatt', symbol: '🍃', color: 'black' }
];

const RANKS = [
    { name: '6', value: 6 },
    { name: '7', value: 7 },
    { name: '8', value: 8 },
    { name: '9', value: 9 },
    { name: '10', value: 10 },
    { name: 'U', value: 11 },
    { name: 'O', value: 12 },
    { name: 'K', value: 13 },
    { name: 'A', value: 14 }
];

export class Deck {
    constructor(numDecks = 1) {
        this.cards = [];
        this.numDecks = numDecks;
        this.buildDeck();
        this.shuffle();
    }

    buildDeck() {
        this.cards = [];
        for (let i = 0; i < this.numDecks; i++) {
            for (let suit of SUITS) {
                for (let rank of RANKS) {
                    this.cards.push({ ...suit, ...rank, id: crypto.randomUUID() });
                }
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.buildDeck(); 
            this.shuffle();
            alert("Deck war leer und wurde neu gemischt!");
        }
        return this.cards.pop();
    }
}