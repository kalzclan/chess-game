import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DOM Elements ---
const backBtn = document.getElementById('back-btn');
const gameCodeDisplay = document.getElementById('game-code-display');
const currentSuitDisplay = document.getElementById('current-suit');
const playerHandEl = document.getElementById('player-hand');
const opponentHandCountEl = document.getElementById('opponent-hand-count');
const discardPileEl = document.getElementById('discard-pile');
const gameStatusEl = document.getElementById('game-status');
const playerNameEl = document.getElementById('player-name');
const opponentNameEl = document.getElementById('opponent-name');
const playerAvatarEl = document.getElementById('player-avatar');
const opponentAvatarEl = document.getElementById('opponent-avatar');
const drawCardBtn = document.getElementById('draw-card-btn');
const passTurnBtn = document.getElementById('pass-turn-btn');

// --- Game Constants ---
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SPECIAL_CARDS = {
    '8': 'change_suit',
    'J': 'change_suit',
    '5': 'skip_turn',
    '7': 'play_multiple',
    '2': 'draw_two',
    'A': 'spade_ace_only'
};

// --- Sound Effects System ---
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        this.initializeSounds();
    }

    initializeSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
            return;
        }
        this.generateSounds();
    }

    generateSounds() {
        this.sounds = {
            cardPlay: this.createCardPlaySound(),
            cardDraw: this.createCardDrawSound(),
            cardShuffle: this.createShuffleSound(),
            turnChange: this.createTurnSound(),
            win: this.createWinSound(),
            lose: this.createLoseSound(),
            special: this.createSpecialSound(),
            hover: this.createHoverSound()
        };
    }

    createCardPlaySound() {
        return this.createToneSequence([
            { freq: 800, duration: 0.1, type: 'sine' },
            { freq: 600, duration: 0.1, type: 'sine' }
        ]);
    }

    createCardDrawSound() {
        return this.createToneSequence([
            { freq: 400, duration: 0.15, type: 'sawtooth' }
        ]);
    }

    createShuffleSound() {
        return this.createNoiseSequence(0.3);
    }

    createTurnSound() {
        return this.createToneSequence([
            { freq: 1000, duration: 0.1, type: 'triangle' },
            { freq: 1200, duration: 0.1, type: 'triangle' }
        ]);
    }

    createWinSound() {
        return this.createToneSequence([
            { freq: 523, duration: 0.2, type: 'sine' },
            { freq: 659, duration: 0.2, type: 'sine' },
            { freq: 784, duration: 0.3, type: 'sine' }
        ]);
    }

    createLoseSound() {
        return this.createToneSequence([
            { freq: 400, duration: 0.3, type: 'sawtooth' },
            { freq: 300, duration: 0.4, type: 'sawtooth' }
        ]);
    }

    createSpecialSound() {
        return this.createToneSequence([
            { freq: 1500, duration: 0.1, type: 'square' },
            { freq: 1800, duration: 0.1, type: 'square' },
            { freq: 2000, duration: 0.1, type: 'square' }
        ]);
    }

    createHoverSound() {
        return this.createToneSequence([
            { freq: 1200, duration: 0.05, type: 'sine' }
        ]);
    }

    createToneSequence(tones) {
        if (!this.audioContext) return null;
        
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        let currentTime = 0;
        tones.forEach(tone => {
            const startSample = Math.floor(currentTime * this.audioContext.sampleRate);
            const endSample = Math.floor((currentTime + tone.duration) * this.audioContext.sampleRate);
            
            for (let i = startSample; i < endSample && i < data.length; i++) {
                const t = (i - startSample) / this.audioContext.sampleRate;
                let value = 0;
                
                switch (tone.type) {
                    case 'sine':
                        value = Math.sin(2 * Math.PI * tone.freq * t);
                        break;
                    case 'square':
                        value = Math.sign(Math.sin(2 * Math.PI * tone.freq * t));
                        break;
                    case 'sawtooth':
                        value = 2 * (t * tone.freq % 1) - 1;
                        break;
                    case 'triangle':
                        value = 4 * Math.abs(t * tone.freq % 1 - 0.5) - 1;
                        break;
                }
                
                const envelope = Math.min(t / 0.01, (tone.duration - t) / 0.01, 1);
                data[i] += value * envelope * this.volume * 0.3;
            }
            currentTime += tone.duration;
        });
        
        return buffer;
    }

    createNoiseSequence(duration) {
        if (!this.audioContext) return null;
        
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * this.volume * 0.1;
        }
        
        return buffer;
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName] || !this.audioContext) return;
        
        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.sounds[soundName];
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            gainNode.gain.value = this.volume;
            
            source.start();
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    toggleMute() {
        this.enabled = !this.enabled;
    }
}

// --- Animation System ---
class AnimationManager {
    constructor() {
        this.activeAnimations = new Set();
    }

    bounce(element, intensity = 10, duration = 300) {
        if (!element) return;
        element.style.transition = `transform ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
        element.style.transform = `translateY(-${intensity}px)`;
        
        setTimeout(() => {
            element.style.transform = 'translateY(0)';
        }, duration / 2);
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
    }

    shake(element, intensity = 5, duration = 300) {
        if (!element) return;
        const keyframes = [
            { transform: 'translateX(0)' },
            { transform: `translateX(-${intensity}px)` },
            { transform: `translateX(${intensity}px)` },
            { transform: `translateX(-${intensity}px)` },
            { transform: 'translateX(0)' }
        ];
        
        element.animate(keyframes, {
            duration: duration,
            easing: 'ease-in-out'
        });
    }

    glow(element, color = '#4caf50', duration = 1000) {
        if (!element) return;
        element.style.transition = `box-shadow ${duration}ms ease-in-out`;
        element.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
        
        setTimeout(() => {
            element.style.boxShadow = '';
        }, duration);
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration + 100);
    }

    pulse(element, scale = 1.1, duration = 300) {
        if (!element) return;
        element.style.transition = `transform ${duration}ms ease-in-out`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, duration / 2);
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
    }

    slideCard(cardElement, fromElement, toElement, duration = 500) {
        return new Promise(resolve => {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            
            const startX = fromRect.left + fromRect.width / 2;
            const startY = fromRect.top + fromRect.height / 2;
            const endX = toRect.left + toRect.width / 2;
            const endY = toRect.top + toRect.height / 2;
            
            cardElement.style.position = 'fixed';
            cardElement.style.left = startX + 'px';
            cardElement.style.top = startY + 'px';
            cardElement.style.zIndex = '1000';
            cardElement.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            
            requestAnimationFrame(() => {
                cardElement.style.left = endX + 'px';
                cardElement.style.top = endY + 'px';
                cardElement.style.transform = 'scale(0.8) rotate(10deg)';
            });
            
            setTimeout(() => {
                cardElement.style.position = '';
                cardElement.style.left = '';
                cardElement.style.top = '';
                cardElement.style.transform = '';
                cardElement.style.zIndex = '';
                cardElement.style.transition = '';
                resolve();
            }, duration);
        });
    }
}

// Initialize managers
const soundManager = new SoundManager();
const animationManager = new AnimationManager();

// --- Game State Class (Updated for Database Schema) ---
class GameState {
    constructor() {
        this.reset();
        this.subscription = null;
    }

    reset() {
        this.id = null;
        this.code = '';
        this.creator_phone = '';
        this.creator_username = '';
        this.opponent_phone = '';
        this.opponent_username = '';
        this.status = 'waiting';
        this.is_private = false;
        this.deck = [];
        this.creator_hand = [];
        this.opponent_hand = [];
        this.discard_pile = [];
        this.current_player = '';
        this.game_type = '';
        this.current_suit = '';
        this.next_play_hearts = false;
        this.last_card = null;
        this.pending_action = '';
        this.pending_action_data = null;
        this.current_suit_to_match = '';
        this.must_play_suit = '';
        this.next_draws_this_turn = 0;
        this.last_suit_change_me = false;
        this.bet_deducted = false;
        
        // Local game state
        this.turnState = {
            canPlayMultiple: false,
            cardsPlayedThisTurn: 0,
            pendingDraws: 0,
            skipNextTurn: false,
            mustDrawCards: false
        };
    }

    get currentUser() {
        return JSON.parse(localStorage.getItem('user')) || {};
    }

    get isCreator() {
        return this.currentUser.phone === this.creator_phone;
    }

    get isMyTurn() {
        return this.current_player === this.currentUser.phone;
    }

    get myHand() {
        return this.isCreator ? this.creator_hand : this.opponent_hand;
    }

    get opponentHand() {
        return this.isCreator ? this.opponent_hand : this.creator_hand;
    }

    set myHand(cards) {
        if (this.isCreator) {
            this.creator_hand = cards;
        } else {
            this.opponent_hand = cards;
        }
    }

    get lastCard() {
        return this.last_card;
    }

    set lastCard(card) {
        this.last_card = card;
    }

    get gameCode() {
        return this.code;
    }

    createDeck() {
        this.deck = [];
        SUITS.forEach(suit => {
            VALUES.forEach(value => {
                this.deck.push({ suit, value });
            });
        });
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        this.creator_hand = [];
        this.opponent_hand = [];
        
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            this.creator_hand.push(this.deck.pop());
            this.opponent_hand.push(this.deck.pop());
        }
        
        // Set first card
        this.lastCard = this.deck.pop();
        this.current_suit = this.lastCard.suit;
        this.current_suit_to_match = this.lastCard.suit;
    }

    canPlayCard(card) {
        if (!this.lastCard || !this.isMyTurn) return false;
        
        // Ace of Spades can always be played
        if (card.value === 'A' && card.suit === 'spades') return true;
        
        // Check for must play suit restriction
        if (this.must_play_suit && card.suit !== this.must_play_suit) return false;
        
        // Regular matching rules
        return card.suit === this.current_suit_to_match || 
               card.value === this.lastCard.value || 
               SPECIAL_CARDS[card.value];
    }

    async playCard(cardIndex) {
        if (!this.isMyTurn) {
            this.showStatus("It's not your turn!");
            return false;
        }

        const card = this.myHand[cardIndex];
        if (!this.canPlayCard(card)) {
            this.showStatus("You can't play that card!");
            const cardElements = document.querySelectorAll('.player-hand-cards .card');
            if (cardElements[cardIndex]) {
                animationManager.shake(cardElements[cardIndex]);
            }
            return false;
        }

        try {
            soundManager.play('cardPlay');

            // Animate card play
            const cardElements = document.querySelectorAll('.player-hand-cards .card');
            if (cardElements[cardIndex]) {
                animationManager.glow(cardElements[cardIndex], '#4caf50');
            }

            // Remove card from hand
            const playedCard = this.myHand.splice(cardIndex, 1)[0];
            
            // Add to discard pile
            if (this.lastCard) {
                this.discard_pile.push(this.lastCard);
            }
            this.lastCard = playedCard;
            this.current_suit = playedCard.suit;
            this.current_suit_to_match = playedCard.suit;
            this.turnState.cardsPlayedThisTurn++;

            // Reset restrictions
            this.must_play_suit = '';
            this.next_play_hearts = false;

            // Handle special card effects
            await this.handleSpecialCard(playedCard);

            // Check for win condition
            if (this.myHand.length === 0) {
                this.status = 'finished';
                this.showStatus("You won!");
                soundManager.play('win');
                await this.updateGameState();
                return true;
            }

            // Update game state
            await this.updateGameState();
            this.renderGame();

            return true;
        } catch (error) {
            console.error('Error playing card:', error);
            this.showStatus('Error playing card. Please try again.');
            return false;
        }
    }

    async handleSpecialCard(card) {
        const special = SPECIAL_CARDS[card.value];
        
        switch (special) {
            case 'change_suit':
                soundManager.play('special');
                if (card.value === '8' || card.value === 'J') {
                    const newSuit = await this.showSuitSelectionDialog();
                    if (newSuit) {
                        this.current_suit = newSuit;
                        this.current_suit_to_match = newSuit;
                        this.last_suit_change_me = true;
                        this.showStatus(`Suit changed to ${newSuit}`);
                    }
                }
                break;
                
            case 'skip_turn':
                soundManager.play('special');
                this.turnState.skipNextTurn = true;
                this.showStatus("Next player's turn is skipped!");
                break;
                
            case 'play_multiple':
                soundManager.play('special');
                this.turnState.canPlayMultiple = true;
                this.showStatus("You can play another card or pass your turn!");
                return; // Don't end turn
                
            case 'draw_two':
                soundManager.play('special');
                this.turnState.pendingDraws += 2;
                this.next_draws_this_turn = this.turnState.pendingDraws;
                this.showStatus("Next player must draw 2 cards!");
                break;
                
            case 'spade_ace_only':
                if (card.suit === 'spades') {
                    soundManager.play('special');
                    this.showStatus("Ace of Spades played!");
                }
                break;
        }

        // End turn if not playing multiple
        if (!this.turnState.canPlayMultiple) {
            await this.endTurn();
        }
    }

    async endTurn() {
        soundManager.play('turnChange');

        // Handle skip turn
        if (this.turnState.skipNextTurn) {
            this.turnState.skipNextTurn = false;
            // Skip is handled by staying on current player, then switching normally
        }
        
        // Reset turn state
        this.turnState.canPlayMultiple = false;
        this.turnState.cardsPlayedThisTurn = 0;
        
        // Move to next player
        this.current_player = this.isCreator ? this.opponent_phone : this.creator_phone;
        
        // Handle pending draws
        if (this.turnState.pendingDraws > 0) {
            if (this.isMyTurn) {
                this.turnState.mustDrawCards = true;
                this.showStatus(`You must draw ${this.turnState.pendingDraws} cards!`);
            } else {
                // AI/opponent draws cards
                for (let i = 0; i < this.turnState.pendingDraws; i++) {
                    if (this.deck.length === 0) this.reshuffleDeck();
                    if (this.deck.length > 0) {
                        if (this.isCreator) {
                            this.opponent_hand.push(this.deck.pop());
                        } else {
                            this.creator_hand.push(this.deck.pop());
                        }
                    }
                }
                this.turnState.pendingDraws = 0;
                this.next_draws_this_turn = 0;
                this.turnState.mustDrawCards = false;
            }
        }
    }

    async drawCard() {
        if (!this.isMyTurn) {
            this.showStatus("It's not your turn!");
            return false;
        }

        try {
            soundManager.play('cardDraw');
            
            const cardsToDraw = this.turnState.pendingDraws > 0 ? this.turnState.pendingDraws : 1;
            
            for (let i = 0; i < cardsToDraw; i++) {
                if (this.deck.length === 0) {
                    this.reshuffleDeck();
                    soundManager.play('cardShuffle');
                }
                
                if (this.deck.length > 0) {
                    const drawnCard = this.deck.pop();
                    this.myHand.push(drawnCard);
                }
            }
            
            this.turnState.pendingDraws = 0;
            this.next_draws_this_turn = 0;
            this.turnState.mustDrawCards = false;
            
            // End turn after drawing (unless can play multiple)
            if (!this.turnState.canPlayMultiple) {
                await this.endTurn();
            }
            
            await this.updateGameState();
            this.renderGame();
            
            // Animate new cards
            setTimeout(() => {
                const cardElements = document.querySelectorAll('.player-hand-cards .card');
                const newCards = Array.from(cardElements).slice(-cardsToDraw);
                newCards.forEach(cardEl => {
                    if (cardEl) animationManager.bounce(cardEl);
                });
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Error drawing card:', error);
            this.showStatus('Error drawing card. Please try again.');
            return false;
        }
    }

    async passTurn() {
        if (!this.isMyTurn) {
            this.showStatus("It's not your turn!");
            return false;
        }

        if (this.turnState.mustDrawCards) {
            this.showStatus("You must draw cards first!");
            return false;
        }

        try {
            await this.endTurn();
            await this.updateGameState();
            this.renderGame();
            return true;
        } catch (error) {
            console.error('Error passing turn:', error);
            this.showStatus('Error passing turn. Please try again.');
            return false;
        }
    }

    reshuffleDeck() {
        if (this.discard_pile.length === 0) return;
        
        const cardsToShuffle = this.discard_pile.splice(0, this.discard_pile.length - 1);
        this.deck.push(...cardsToShuffle);
        this.shuffleDeck();
        this.showStatus("Deck reshuffled!");
    }

    showSuitSelectionDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'card-selection-modal';
            
            const content = document.createElement('div');
            content.className = 'selection-content';
            content.innerHTML = `
                <h3>Choose a suit:</h3>
                <div class="suit-selection-options">
                    ${SUITS.map(suit => `
                        <div class="suit-option" data-suit="${suit}">
                            ${this.getSuitSVG(suit)}
                            <span>${suit.charAt(0).toUpperCase() + suit.slice(1)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            // Add click handlers
            content.addEventListener('click', (e) => {
                const suitOption = e.target.closest('.suit-option');
                if (suitOption) {
                    const selectedSuit = suitOption.dataset.suit;
                    document.body.removeChild(modal);
                    resolve(selectedSuit);
                }
            });

            // Add hover effects
            content.querySelectorAll('.suit-option').forEach(option => {
                option.addEventListener('mouseenter', () => {
                    soundManager.play('hover');
                    animationManager.pulse(option);
                });
            });
        });
    }

    showStatus(message) {
        if (gameStatusEl) {
            gameStatusEl.textContent = message;
            animationManager.pulse(gameStatusEl);
            
            setTimeout(() => {
                if (gameStatusEl.textContent === message) {
                    this.updateGameStatusDisplay();
                }
            }, 3000);
        }
    }

    updateGameStatusDisplay() {
        if (!gameStatusEl) return;
        
        if (this.status === 'finished') {
            gameStatusEl.textContent = 'Game Over';
            return;
        }
        
        if (this.turnState.mustDrawCards && this.isMyTurn) {
            gameStatusEl.textContent = `Draw ${this.turnState.pendingDraws} card(s)!`;
        } else if (this.turnState.canPlayMultiple && this.isMyTurn) {
            gameStatusEl.textContent = 'Play another card or pass turn';
        } else if (this.isMyTurn) {
            gameStatusEl.textContent = 'Your turn - Play a card or draw';
        } else {
            const opponentName = this.isCreator ? this.opponent_username : this.creator_username;
            gameStatusEl.textContent = `${opponentName || 'Opponent'}'s turn`;
        }
    }

    getSuitSVG(suit) {
        switch (suit) {
            case 'hearts':
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="#d32f2f"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
            case 'diamonds':
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="#d32f2f"><path d="M19 12l-7-10-7 10 7 10 7-10z"/></svg>`;
            case 'clubs':
                return `<svg width="24" height="24" viewBox="0 0 200 200" fill="#263238"><circle cx="100" cy="60" r="35"/><circle cx="60" cy="130" r="35"/><circle cx="140" cy="130" r="35"/><path d="M100 100 L100 170 C100 185 85 185 85 170 L85 100 Z"/></svg>`;
            case 'spades':
                return `<svg width="24" height="24" viewBox="0 0 200 200" fill="#263238"><path d="M100 20 L160 120 L40 120 Z"/><path d="M100 110 L100 180 C100 195 85 195 85 180 L85 110 Z"/><circle cx="100" cy="115" r="20"/></svg>`;
            default:
                return '';
        }
    }

    renderCardHTML(card, options = {}) {
        const { isPlayable = false, isStacked = false, isTop = false } = options;
        
        if (!card) {
            return `
            <div class="card-back-realistic">
                <div class="card-back-inner"></div>
            </div>
            `;
        }

        const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
        const classes = ['card', 'card-realistic', card.suit, colorClass];
        
        if (isPlayable) classes.push('playable');
        if (isStacked) classes.push('stacked-card');
        if (isTop) classes.push('top-card');

        return `
        <div class="${classes.join(' ')}" data-suit="${card.suit}" data-value="${card.value}">
            <div class="card-gloss"></div>
            <div class="card-inner">
                <div class="card-corner card-corner-top">
                    <div class="card-value">${card.value}</div>
                    <div class="card-suit-svg">${this.getSuitSVG(card.suit)}</div>
                </div>
                <div class="card-center">
                    <div class="card-suit-svg" style="transform: scale(1.5);">${this.getSuitSVG(card.suit)}</div>
                </div>
                <div class="card-corner card-corner-bottom">
                    <div class="card-value">${card.value}</div>
                    <div class="card-suit-svg">${this.getSuitSVG(card.suit)}</div>
                </div>
            </div>
        </div>
        `;
    }

    renderPlayerHand() {
        if (!playerHandEl) return;
        
        playerHandEl.innerHTML = '';
        
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'player-hand-scroll';
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'player-hand-cards';
        
        this.myHand.forEach((card, index) => {
            const isPlayable = this.isMyTurn && this.canPlayCard(card);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.renderCardHTML(card, { isPlayable });
            const cardEl = wrapper.firstElementChild;
            
            if (isPlayable) {
                cardEl.addEventListener('click', () => this.playCard(index));
                cardEl.addEventListener('mouseenter', () => {
                    soundManager.play('hover');
                    animationManager.bounce(cardEl, 5, 200);
                });
            }
            
            cardsContainer.appendChild(cardEl);
        });
        
        scrollWrapper.appendChild(cardsContainer);
        playerHandEl.appendChild(scrollWrapper);
    }

    renderDiscardPile() {
        if (!discardPileEl) return;

        discardPileEl.innerHTML = '';
        const pileContainer = document.createElement('div');
        pileContainer.className = 'discard-pile-container';

        const allCards = [...this.discard_pile];
        if (this.lastCard) allCards.push(this.lastCard);

        const cardsToShow = 7;
        const startIdx = Math.max(0, allCards.length - cardsToShow);
        const recentCards = allCards.slice(startIdx);

        recentCards.forEach((card, idx) => {
            const isTop = idx === recentCards.length - 1;
            const z = 100 + idx;
            const rot = isTop ? 0 : (Math.random() * 10 - 5);
            const xOffset = isTop ? 0 : (Math.random() * 20 - 10);
            const yOffset = isTop ? 0 : (Math.random() * 10 - 5);

            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.renderCardHTML(card, { isStacked: !isTop, isTop });
            const cardEl = wrapper.firstElementChild;
            
            cardEl.style.zIndex = z;
            cardEl.style.position = 'absolute';
            cardEl.style.left = `calc(50% + ${xOffset}px)`;
            cardEl.style.top = `calc(50% + ${yOffset}px)`;
            cardEl.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
            pileContainer.appendChild(cardEl);
        });

        const totalCards = allCards.length;
        if (totalCards > cardsToShow) {
            const remainingCount = totalCards - cardsToShow;
            const countEl = document.createElement('div');
            countEl.className = 'discard-pile-count';
            countEl.textContent = `+${remainingCount} more`;
            pileContainer.appendChild(countEl);
        }
        
        pileContainer.style.position = "relative";
        pileContainer.style.width = "140px";
        pileContainer.style.height = "120px";
        pileContainer.style.margin = "0 auto";
        discardPileEl.appendChild(pileContainer);
    }

    renderGame() {
        this.renderPlayerHand();
        this.renderDiscardPile();
        this.updateGameStatusDisplay();
        
        // Update current suit display
        if (currentSuitDisplay && this.current_suit) {
            currentSuitDisplay.innerHTML = `Current suit: ${this.getSuitSVG(this.current_suit)}`;
        }
        
        // Update opponent hand count
        if (opponentHandCountEl) {
            const opponentCount = this.opponentHand ? this.opponentHand.length : 0;
            opponentHandCountEl.textContent = `Opponent: ${opponentCount} cards`;
        }
        
        // Update player info
        if (playerNameEl) {
            playerNameEl.textContent = this.currentUser.username || 'You';
        }
        
        if (opponentNameEl) {
            const opponentName = this.isCreator ? this.opponent_username : this.creator_username;
            opponentNameEl.textContent = opponentName || 'Opponent';
        }
        
        // Update button states
        if (drawCardBtn) {
            drawCardBtn.disabled = !this.isMyTurn || this.status === 'finished';
        }
        
        if (passTurnBtn) {
            const shouldShow = this.turnState.canPlayMultiple && this.isMyTurn;
            passTurnBtn.style.display = shouldShow ? 'block' : 'none';
            passTurnBtn.disabled = !this.isMyTurn || this.status === 'finished' || this.turnState.mustDrawCards;
        }
    }

    // Database operations using correct field names
    async updateGameState() {
        try {
            const updateData = {
                status: this.status,
                deck: this.deck,
                creator_hand: this.creator_hand,
                opponent_hand: this.opponent_hand,
                discard_pile: this.discard_pile,
                current_player: this.current_player,
                current_suit: this.current_suit,
                next_play_hearts: this.next_play_hearts,
                last_card: this.last_card,
                pending_action: this.pending_action,
                pending_action_data: this.pending_action_data,
                current_suit_to_match: this.current_suit_to_match,
                must_play_suit: this.must_play_suit,
                next_draws_this_turn: this.next_draws_this_turn,
                last_suit_change_me: this.last_suit_change_me,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('card_games')
                .update(updateData)
                .eq('code', this.code);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }

    async loadGameState() {
        try {
            const { data, error } = await supabase
                .from('card_games')
                .select('*')
                .eq('code', this.code)
                .single();

            if (error) throw error;
            
            if (data) {
                // Map database fields to local state
                Object.assign(this, data);
                this.renderGame();
            }
        } catch (error) {
            console.error('Error loading game state:', error);
        }
    }

    setupGameSubscription() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = supabase
            .channel('game-updates')
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'card_games',
                    filter: `code=eq.${this.code}`
                }, 
                (payload) => {
                    if (payload.new) {
                        // Update local state with database changes
                        Object.assign(this, payload.new);
                        this.renderGame();
                    }
                }
            )
            .subscribe();
    }
}

// Global game state instance
const gameState = new GameState();

// --- Event Listeners ---
if (drawCardBtn) {
    drawCardBtn.addEventListener('click', () => gameState.drawCard());
}

if (passTurnBtn) {
    passTurnBtn.addEventListener('click', () => gameState.passTurn());
}

if (backBtn) {
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// --- Initialize Game ---
function initializeGame() {
    const urlParams = new URLSearchParams(window.location.search);
    gameState.code = urlParams.get('code') || '';
    
    if (gameCodeDisplay) {
        gameCodeDisplay.textContent = gameState.code;
    }
    
    // Load initial game state
    gameState.loadGameState();
    
    // Set up real-time subscription
    gameState.setupGameSubscription();
}

// --- CSS Styles ---
const gameCSS = `
.card-realistic {
    --card-width: 64px;
    --card-height: 96px;
    width: var(--card-width);
    height: var(--card-height);
    background: linear-gradient(130deg,#fff8f0 85%,#f5e9d8 100%);
    border-radius: 11px;
    margin: 4px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.07);
    position: relative;
    border: 1.5px solid #ececec;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.13s, box-shadow 0.13s, filter 0.13s;
    user-select: none;
    overflow: visible;
    cursor: pointer;
}

.card-realistic.playable {
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(76,175,80,0.13), 0 1.5px 8px rgba(50,150,50,0.06);
    transform: translateY(-2px);
}

.card-realistic.playable:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 25px rgba(76,175,80,0.2), 0 2px 10px rgba(50,150,50,0.1);
}

.card-realistic.playable:active {
    filter: brightness(0.97) drop-shadow(0 0 6px #4caf5044);
    transform: translateY(-2px) scale(1.04);
    z-index: 20;
}

.card-realistic .card-gloss {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 11px;
    background: linear-gradient(120deg,rgba(255,255,255,0.18) 18%,transparent 58%);
    z-index: 2;
    pointer-events: none;
}

.card-realistic .card-inner {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6px;
}

.card-realistic .card-corner {
    width: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.card-realistic .card-corner-top {
    align-items: flex-start;
}

.card-realistic .card-corner-bottom {
    align-items: flex-end;
    transform: rotate(180deg);
}

.card-realistic .card-center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
}

.card-realistic.hearts, .card-realistic.diamonds {
    color: #d32f2f;
}

.card-realistic.clubs, .card-realistic.spades {
    color: #263238;
}

.card-realistic .card-value {
    font-size: 12px;
    font-weight: bold;
    text-shadow: 0px 1px 0px white, 0px 1px 3px #d1bfa7;
    line-height: 1;
}

.card-realistic .card-suit-svg svg {
    width: 16px;
    height: 16px;
    display: block;
}

.card-realistic.stacked-card {
    opacity: 0.8;
    filter: blur(0.3px) brightness(0.96);
}

.card-realistic.top-card {
    box-shadow: 0 7px 18px rgba(0,0,0,0.17), 0 1.5px 6px rgba(0,0,0,0.09);
    filter: none;
}

.card-back-realistic {
    width: 64px;
    height: 96px;
    background: repeating-linear-gradient(135deg, #1b5e20, #1b5e20 13px, #17481d 13px, #17481d 26px);
    border-radius: 11px;
    margin: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
    position: relative;
    border: 2px solid #265c2c;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.card-back-realistic .card-back-inner {
    width: 38px;
    height: 38px;
    background: url("data:image/svg+xml,%3Csvg width='32' height='32' fill='white' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='24' height='24' rx='5' fill='white' fill-opacity='0.17'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    opacity: 0.2;
}

.player-hand-scroll {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 10px 0;
}

.player-hand-cards {
    display: flex;
    gap: 8px;
    padding: 0 10px;
    min-width: max-content;
}

.discard-pile-container {
    position: relative;
    width: 140px;
    height: 120px;
    margin: 0 auto;
}

.discard-pile-count {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
}

.card-selection-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.selection-content {
    background-color: #2c3e50;
    padding: 20px;
    border-radius: 10px;
    width: 90%;
    max-width: 400px;
    color: white;
    text-align: center;
}

.suit-selection-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 20px 0;
}

.suit-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.suit-option:hover {
    background: rgba(255,255,255,0.2);
    transform: scale(1.05);
}

.suit-option svg {
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
}

.suit-option span {
    font-weight: bold;
    font-size: 14px;
}

@media (min-width: 400px) {
    .card-realistic,
    .card-back-realistic {
        --card-width: 72px;
        --card-height: 110px;
        width: var(--card-width);
        height: var(--card-height);
    }
}

@media (max-width: 350px) {
    .card-realistic,
    .card-back-realistic {
        --card-width: 48px;
        --card-height: 72px;
        width: var(--card-width);
        height: var(--card-height);
    }
    
    .card-realistic .card-value {
        font-size: 10px;
    }
    
    .card-realistic .card-suit-svg svg {
        width: 12px;
        height: 12px;
    }
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = gameCSS;
document.head.appendChild(styleElement);

// Start the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);

// Cleanup subscription on page unload
window.addEventListener('beforeunload', () => {
    if (gameState.subscription) {
        gameState.subscription.unsubscribe();
    }
});
