import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Enhanced Supabase Setup with Error Handling ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Enhanced Sound Manager ---
class SoundManager {
    constructor() {
        this.soundEnabled = true;
        this.volume = 0.7;
        this.audioContext = null;
        this.sounds = {};
        this.initAudio();
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.generateSounds();
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }

    async generateSounds() {
        this.sounds = {
            cardPlay: this.createCardSound(800, 0.15),
            cardDraw: this.createCardSound(300, 0.2),
            suitChange: this.createSpecialSound(),
            win: this.createWinSound(),
            loss: this.createLossSound(),
            error: this.createErrorSound()
        };
    }

    createCardSound(frequency, duration) {
        return async () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + duration);
                oscillator.type = 'square';
                
                filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
                filter.Q.setValueAtTime(1, this.audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Error playing card sound:', error);
            }
        };
    }

    createSpecialSound() {
        return async () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Magical chime sound for suit changes
                const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                
                frequencies.forEach((freq, index) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    const startTime = this.audioContext.currentTime + (index * 0.1);
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, startTime + 0.05);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.4);
                });
            } catch (error) {
                console.warn('Error playing suit change sound:', error);
            }
        };
    }

    createWinSound() {
        return async () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Victory fanfare
                const melody = [
                    { freq: 523.25, time: 0 },    // C5
                    { freq: 659.25, time: 0.2 },  // E5
                    { freq: 783.99, time: 0.4 },  // G5
                    { freq: 1046.50, time: 0.6 }, // C6
                    { freq: 1318.51, time: 0.8 }  // E6
                ];
                
                melody.forEach(({ freq, time }) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'triangle';
                    
                    const startTime = this.audioContext.currentTime + time;
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.05);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.3);
                });
            } catch (error) {
                console.warn('Error playing win sound:', error);
            }
        };
    }

    createLossSound() {
        return async () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Descending sad sound
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 1);
                oscillator.type = 'triangle';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 1);
            } catch (error) {
                console.warn('Error playing loss sound:', error);
            }
        };
    }

    createErrorSound() {
        return async () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Error buzz sound
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
                oscillator.type = 'sawtooth';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            } catch (error) {
                console.warn('Error playing error sound:', error);
            }
        };
    }

    async play(soundName) {
        const soundFunction = this.sounds[soundName];
        if (soundFunction) {
            try {
                await soundFunction();
            } catch (error) {
                console.warn(`Failed to play ${soundName}:`, error);
            }
        }
    }

    toggleMute() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
}

// --- Enhanced Animation Manager ---
class AnimationManager {
    static playCardAnimation(cardElement) {
        return new Promise((resolve) => {
            if (!cardElement) {
                resolve();
                return;
            }

            cardElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            cardElement.style.transform = 'scale(1.1) translateY(-20px) rotateZ(5deg)';
            cardElement.style.zIndex = '1000';

            setTimeout(() => {
                cardElement.style.transform = 'scale(0.8) translateY(-40px) rotateZ(15deg)';
                cardElement.style.opacity = '0.7';
            }, 150);

            setTimeout(() => {
                cardElement.style.transform = 'scale(0) translateY(-60px) rotateZ(30deg)';
                cardElement.style.opacity = '0';
                resolve();
            }, 300);
        });
    }

    static drawCardAnimation(cardElement) {
        return new Promise((resolve) => {
            if (!cardElement) {
                resolve();
                return;
            }

            cardElement.style.transform = 'scale(0) translateX(-100px)';
            cardElement.style.opacity = '0';
            cardElement.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.4s ease-out';

            setTimeout(() => {
                cardElement.style.transform = 'scale(1) translateX(0)';
                cardElement.style.opacity = '1';
                resolve();
            }, 50);
        });
    }

    static createParticleExplosion(element, options = {}) {
        const { color = '#FFD700', count = 15, duration = 1000 } = options;
        
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.backgroundColor = color;
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10000';
            
            document.body.appendChild(particle);

            const angle = (i / count) * Math.PI * 2;
            const velocity = 50 + Math.random() * 100;
            const deltaX = Math.cos(angle) * velocity;
            const deltaY = Math.sin(angle) * velocity;

            particle.animate([
                { 
                    transform: 'translate(0, 0) scale(1)', 
                    opacity: 1 
                },
                { 
                    transform: `translate(${deltaX}px, ${deltaY}px) scale(0)`, 
                    opacity: 0 
                }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
                particle.remove();
            };
        }
    }

    static createFloatingText(element, text, options = {}) {
        const { color = '#10b981', duration = 1000, fontSize = '16px' } = options;
        
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const textElement = document.createElement('div');
        textElement.textContent = text;
        textElement.style.position = 'fixed';
        textElement.style.left = (rect.left + rect.width / 2) + 'px';
        textElement.style.top = rect.top + 'px';
        textElement.style.color = color;
        textElement.style.fontSize = fontSize;
        textElement.style.fontWeight = 'bold';
        textElement.style.pointerEvents = 'none';
        textElement.style.zIndex = '10000';
        textElement.style.transform = 'translateX(-50%)';
        
        document.body.appendChild(textElement);

        textElement.animate([
            { 
                transform: 'translateX(-50%) translateY(0) scale(1)', 
                opacity: 1 
            },
            { 
                transform: 'translateX(-50%) translateY(-50px) scale(1.2)', 
                opacity: 0 
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => {
            textElement.remove();
        };
    }

    static createSpecialCardEffect(cardElement, effectType) {
        if (!cardElement) return;

        switch (effectType) {
            case 'suitChange':
                this.createParticleExplosion(cardElement, { color: '#8B5CF6', count: 20 });
                break;
            case 'drawTwo':
                this.createParticleExplosion(cardElement, { color: '#EF4444', count: 10 });
                break;
            case 'playMultiple':
                this.createParticleExplosion(cardElement, { color: '#F59E0B', count: 15 });
                break;
        }
    }

    static createConfetti() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-10px';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.backgroundColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 5)];
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '10000';
                
                document.body.appendChild(confetti);

                confetti.animate([
                    { 
                        transform: 'translateY(0) rotate(0deg)', 
                        opacity: 1 
                    },
                    { 
                        transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, 
                        opacity: 0 
                    }
                ], {
                    duration: 3000 + Math.random() * 2000,
                    easing: 'linear'
                }).onfinish = () => {
                    confetti.remove();
                };
            }, i * 100);
        }
    }

    static pulseElement(element, duration = 2000) {
        if (!element) return;

        const animation = element.animate([
            { transform: 'scale(1)', filter: 'brightness(1)' },
            { transform: 'scale(1.05)', filter: 'brightness(1.2)' },
            { transform: 'scale(1)', filter: 'brightness(1)' }
        ], {
            duration: 200,
            iterations: duration / 200
        });

        return animation;
    }
}

// Initialize sound manager
const soundManager = new SoundManager();

// --- Enhanced Game Constants ---
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

// --- Enhanced Game State with Error Handling ---
let gameState = {
    gameCode: '',
    playerRole: '',
    status: 'waiting',
    currentPlayer: '',
    currentSuit: '',
    lastCard: null,
    playerHand: [],
    opponentHandCount: 0,
    creator: {},
    opponent: {},
    pendingAction: null,
    pendingActionData: null,
    betAmount: 0,
    mustPlaySuit: false,
    currentSuitToMatch: '',
    hasDrawnThisTurn: false,
    discardPile: [],
    lastSuitChangePlayer: null,
    lastSuitChangeMethod: null,
    canChangeSuit: true,
    connectionStatus: 'connecting',
    errorCount: 0,
    lastErrorTime: 0,
    retryAttempts: 0
};

// --- Enhanced Error Handling ---
class ErrorHandler {
    static handleError(error, context) {
        console.error(`Game error in ${context}:`, error);
        
        gameState.errorCount++;
        gameState.lastErrorTime = Date.now();
        
        // Play error sound
        soundManager.play('error');
        
        // Determine error type and response
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            this.handleNetworkError(error, context);
        } else if (error.message?.includes('supabase') || error.message?.includes('database')) {
            this.handleDatabaseError(error, context);
        } else {
            this.handleGameLogicError(error, context);
        }
        
        // Auto-retry for recoverable errors
        if (this.shouldRetry(error) && gameState.retryAttempts < 3) {
            this.scheduleRetry(context);
        }
    }
    
    static handleNetworkError(error, context) {
        gameState.connectionStatus = 'disconnected';
        this.showError('Network connection lost. Attempting to reconnect...', 'warning');
    }
    
    static handleDatabaseError(error, context) {
        this.showError('Database connection issue. Please try again.', 'error');
    }
    
    static handleGameLogicError(error, context) {
        this.showError('Game error occurred. Please refresh if issues persist.', 'error');
    }
    
    static shouldRetry(error) {
        const retryableErrors = ['network', 'timeout', 'connection', 'supabase'];
        return retryableErrors.some(type => error.message?.toLowerCase().includes(type));
    }
    
    static scheduleRetry(context) {
        gameState.retryAttempts++;
        const delay = Math.min(1000 * Math.pow(2, gameState.retryAttempts - 1), 10000);
        
        setTimeout(() => {
            console.log(`Retrying ${context} (attempt ${gameState.retryAttempts})`);
            if (context.includes('load')) {
                loadGameData();
            } else if (context.includes('realtime')) {
                setupRealtimeUpdates();
            }
        }, delay);
    }
    
    static showError(message, type = 'error') {
        const statusEl = document.getElementById('game-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `text-${type === 'error' ? 'red' : 'yellow'}-600 font-medium`;
            
            // Clear error after 5 seconds
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.textContent = '';
                    statusEl.className = '';
                }
            }, 5000);
        }
    }
    
    static clearErrors() {
        gameState.errorCount = 0;
        gameState.retryAttempts = 0;
        gameState.connectionStatus = 'connected';
    }
}

// --- Enhanced Game Functions ---

async function loadGameData() {
    try {
        const { data: gameData, error } = await supabase
            .from('card_games')
            .select('*')
            .eq('code', gameState.gameCode)
            .single();

        if (error) throw error;
        if (!gameData) throw new Error('Game not found');

        const users = JSON.parse(localStorage.getItem('user')) || {};
        gameState.playerRole = gameData.creator_phone === users.phone ? 'creator' : 'opponent';

        // Update game state
        gameState.status = gameData.status;
        gameState.currentPlayer = gameData.current_player;
        gameState.currentSuit = gameData.current_suit;
        gameState.lastCard = gameData.last_card ? safeParseJSON(gameData.last_card) : null;
        gameState.betAmount = gameData.bet || 0;
        gameState.mustPlaySuit = gameData.must_play_suit || false;
        gameState.currentSuitToMatch = gameData.current_suit_to_match || '';
        gameState.hasDrawnThisTurn = gameData.has_drawn_this_turn || false;
        gameState.discardPile = gameData.discard_pile ? safeParseJSON(gameData.discard_pile) : [];
        gameState.lastSuitChangePlayer = gameData.last_suit_change_player;
        gameState.lastSuitChangeMethod = gameData.last_suit_change_method;

        // Set player hands
        if (gameState.playerRole === 'creator') {
            gameState.playerHand = safeParseJSON(gameData.creator_hand) || [];
            gameState.opponentHandCount = safeParseJSON(gameData.opponent_hand)?.length || 0;
        } else {
            gameState.playerHand = safeParseJSON(gameData.opponent_hand) || [];
            gameState.opponentHandCount = safeParseJSON(gameData.creator_hand)?.length || 0;
        }

        // Set player info
        gameState.creator = {
            username: gameData.creator_username,
            phone: gameData.creator_phone
        };

        if (gameData.opponent_phone) {
            gameState.opponent = {
                username: gameData.opponent_username,
                phone: gameData.opponent_phone
            };
        }

        // Check for pending actions
        if (gameData.pending_action) {
            gameState.pendingAction = gameData.pending_action;
            gameState.pendingActionData = gameData.pending_action_data;
        }

        ErrorHandler.clearErrors();
        updateGameUI();

    } catch (error) {
        ErrorHandler.handleError(error, 'loadGameData');
        setTimeout(() => window.location.href = '/', 3000);
    }
}

function setupEventListeners() {
    const backBtn = document.getElementById('back-btn');
    const drawCardBtn = document.getElementById('draw-card-btn');
    const passTurnBtn = document.getElementById('pass-turn-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => window.location.href = '/');
    }

    if (drawCardBtn) {
        drawCardBtn.addEventListener('click', drawCard);
    }

    if (passTurnBtn) {
        passTurnBtn.addEventListener('click', passTurn);
    }
}

function getSuitSVG(suit) {
    const suitSymbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };
    
    const color = suit === 'hearts' || suit === 'diamonds' ? '#ef4444' : '#1f2937';
    
    return `<span style="color: ${color}; font-size: 16px; font-weight: bold;">${suitSymbols[suit]}</span>`;
}

function renderPlayerHand() {
    const playerHandEl = document.getElementById('player-hand');
    if (!playerHandEl) return;

    if (gameState.playerHand.length === 0) {
        playerHandEl.innerHTML = '<div class="text-center text-gray-500">No cards in hand</div>';
        return;
    }

    const handHTML = gameState.playerHand.map((card, index) => {
        const isPlayable = canPlayCard(card);
        return `
            <div class="card ${isPlayable ? 'playable' : 'not-playable'}" 
                 data-card-index="${index}"
                 onclick="${isPlayable ? `playCard(${index})` : ''}">
                <div class="card-content">
                    <div class="card-corner-top">
                        <span class="card-value">${card.value}</span>
                        ${getSuitSVG(card.suit)}
                    </div>
                    <div class="card-center">
                        ${getSuitSVG(card.suit)}
                    </div>
                    <div class="card-corner-bottom">
                        <span class="card-value">${card.value}</span>
                        ${getSuitSVG(card.suit)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    playerHandEl.innerHTML = handHTML;
}

function renderDiscardPile() {
    const discardPileEl = document.getElementById('discard-pile');
    if (!discardPileEl) return;

    if (!gameState.lastCard) {
        discardPileEl.innerHTML = '<div class="empty-pile">No cards played</div>';
        return;
    }

    const card = gameState.lastCard;
    discardPileEl.innerHTML = `
        <div class="card">
            <div class="card-content">
                <div class="card-corner-top">
                    <span class="card-value">${card.value}</span>
                    ${getSuitSVG(card.suit)}
                </div>
                <div class="card-center">
                    ${getSuitSVG(card.suit)}
                </div>
                <div class="card-corner-bottom">
                    <span class="card-value">${card.value}</span>
                    ${getSuitSVG(card.suit)}
                </div>
            </div>
        </div>
    `;
}

function generateRandomCard() {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const value = VALUES[Math.floor(Math.random() * VALUES.length)];
    return { suit, value };
}

function safeParseJSON(json) {
    try {
        return json ? JSON.parse(json) : null;
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return null;
    }
}

function showGameResult(isWinner, amount) {
    const resultHTML = `
        <div class="game-result-overlay">
            <div class="game-result-modal">
                <h2>${isWinner ? 'Congratulations!' : 'Game Over'}</h2>
                <p>${isWinner ? `You won $${amount}!` : 'Better luck next time!'}</p>
                <button onclick="window.location.href='/'" class="result-button">
                    Return to Home
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', resultHTML);
}

// Enhanced suit change logic - Rule: If opponent changes suit with 8/J, you cannot immediately change it back with same card type
function canPlayCard(card) {
    try {
        // If no last card played, any card can be played
        if (!gameState.lastCard) return true;

        // If there's a pending draw action, only 2s can be played
        if (gameState.pendingAction === 'draw_two') {
            return card.value === '2' && 
                   (card.suit === gameState.currentSuit || 
                    card.value === gameState.lastCard.value);
        }

        // If must play specific suit due to previous 8 or J
        if (gameState.mustPlaySuit && gameState.currentSuitToMatch) {
            // 8s and Jacks can be played but cannot change suit if opponent just changed it with same type
            if (card.value === '8' || card.value === 'J') {
                // Check if opponent just changed suit with same card type
                const users = JSON.parse(localStorage.getItem('user')) || {};
                const canChangeSuit = !gameState.lastSuitChangePlayer || 
                                     gameState.lastSuitChangePlayer === users.phone ||
                                     gameState.lastSuitChangeMethod !== card.value;
                
                gameState.canChangeSuit = canChangeSuit;
                return true; // Can always play 8/J, but may not be able to change suit
            }
            return card.suit === gameState.currentSuitToMatch;
        }

        // Handle 8 and J - can always be played for suit change
        if (card.value === '8' || card.value === 'J') {
            const users = JSON.parse(localStorage.getItem('user')) || {};
            gameState.canChangeSuit = !gameState.lastSuitChangePlayer || 
                                     gameState.lastSuitChangePlayer === users.phone ||
                                     gameState.lastSuitChangeMethod !== card.value;
            return true;
        }

        // Handle 2 cards - can only be played on same suit or another 2
        if (card.value === '2') {
            return card.suit === gameState.currentSuit || 
                   gameState.lastCard.value === '2';
        }

        // Handle 7 card - special multi-card play rules
        if (card.value === '7') {
            return card.suit === gameState.currentSuit || 
                   card.value === gameState.lastCard.value;
        }

        // Handle Ace - only Ace of Spades is special
        if (card.value === 'A') {
            if (card.suit === 'spades') return true;
            return card.suit === gameState.currentSuit ||
                   card.value === gameState.lastCard.value;
        }

        // Normal play rules - must match suit or value
        return card.suit === gameState.currentSuit ||
               card.value === gameState.lastCard.value;
    } catch (error) {
        ErrorHandler.handleError(error, 'canPlayCard');
        return false;
    }
}

async function playCard(cardIndex) {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            ErrorHandler.showError("It's not your turn!", 'warning');
            await soundManager.play('error');
            return;
        }

        const card = gameState.playerHand[cardIndex];
        if (!canPlayCard(card)) {
            ErrorHandler.showError('This card cannot be played!', 'warning');
            await soundManager.play('error');
            return;
        }

        // Play card sound first
        await soundManager.play('cardPlay');

        // Handle special card effects with enhanced logic
        let suitChangeRequired = false;
        if (card.value === '8' || card.value === 'J') {
            if (gameState.canChangeSuit) {
                suitChangeRequired = true;
                await soundManager.play('suitChange');
            } else {
                // Playing 8/J without changing suit - must follow current suit requirement
                if (!gameState.mustPlaySuit || card.suit === gameState.currentSuitToMatch) {
                    // Valid play without suit change
                } else {
                    ErrorHandler.showError('Cannot change suit - opponent just changed it with the same card type!', 'warning');
                    await soundManager.play('error');
                    return;
                }
            }
        }

        // Remove card from hand with animation
        const cardElement = document.querySelector(`[data-card-index="${cardIndex}"]`);
        if (cardElement) {
            await AnimationManager.playCardAnimation(cardElement);
        }

        // Update local state
        gameState.playerHand.splice(cardIndex, 1);
        gameState.discardPile.push(card);
        gameState.lastCard = card;

        // Handle suit change
        if (suitChangeRequired && gameState.canChangeSuit) {
            await showSuitSelector(card);
            return;
        }

        // Update game on server with enhanced error handling
        const updates = {
            current_suit: gameState.mustPlaySuit ? gameState.currentSuitToMatch : card.suit,
            last_card: card,
            discard_pile: gameState.discardPile,
            must_play_suit: false,
            current_suit_to_match: '',
            last_suit_change_player: null,
            last_suit_change_method: null
        };

        // Handle special card effects
        if (card.value === '2') {
            updates.pending_action = 'draw_two';
            updates.pending_action_data = JSON.stringify({ drawCount: 2 });
        } else if (card.value === '5') {
            // Skip turn - keep current player the same
        } else {
            // Normal turn progression
            const allPlayers = [gameState.creator.phone];
            if (gameState.opponent.phone) {
                allPlayers.push(gameState.opponent.phone);
            }
            const currentIndex = allPlayers.indexOf(users.phone);
            const nextPlayer = allPlayers[(currentIndex + 1) % allPlayers.length];
            updates.current_player = nextPlayer;
        }

        // Update player hand
        const handUpdate = gameState.playerRole === 'creator' 
            ? { creator_hand: JSON.stringify(gameState.playerHand) }
            : { opponent_hand: JSON.stringify(gameState.playerHand) };

        await updateGameWithRetry(updates);
        await updatePlayerHandWithRetry(handUpdate);

        // Check for win condition
        if (gameState.playerHand.length === 0) {
            await soundManager.play('win');
            AnimationManager.createConfetti();
            setTimeout(() => {
                showGameResult(true, Math.floor(gameState.betAmount * 1.8));
            }, 1000);
        }

        // Clear any existing errors on successful action
        ErrorHandler.clearErrors();
        updateGameUI();
        
    } catch (error) {
        ErrorHandler.handleError(error, 'playCard');
    }
}

async function updateGameWithRetry(updates, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { error } = await supabase
                .from('card_games')
                .update(updates)
                .eq('code', gameState.gameCode);

            if (error) throw error;
            return; // Success
        } catch (error) {
            if (i === retries - 1) throw error; // Last attempt failed
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
}

async function updatePlayerHandWithRetry(handUpdate, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { error } = await supabase
                .from('card_games')
                .update(handUpdate)
                .eq('code', gameState.gameCode);

            if (error) throw error;
            return; // Success
        } catch (error) {
            if (i === retries - 1) throw error; // Last attempt failed
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

async function drawCard() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (gameState.currentPlayer !== users.phone) {
            ErrorHandler.showError("It's not your turn!", 'warning');
            await soundManager.play('error');
            return;
        }

        if (gameState.hasDrawnThisTurn) {
            ErrorHandler.showError('You can only draw one card per turn!', 'warning');
            await soundManager.play('error');
            return;
        }

        await soundManager.play('cardDraw');

        // Generate new card (in real implementation, this would come from server)
        const newCard = generateRandomCard();
        gameState.playerHand.push(newCard);
        gameState.hasDrawnThisTurn = true;

        // Animate new card
        setTimeout(() => {
            const newCardElement = document.querySelector(`[data-card-index="${gameState.playerHand.length - 1}"]`);
            if (newCardElement) {
                AnimationManager.drawCardAnimation(newCardElement);
            }
        }, 100);

        // Update server
        const handUpdate = gameState.playerRole === 'creator' 
            ? { creator_hand: JSON.stringify(gameState.playerHand) }
            : { opponent_hand: JSON.stringify(gameState.playerHand) };

        await updatePlayerHandWithRetry(handUpdate);
        
        // Pass turn after drawing
        await passTurn();
        
        ErrorHandler.clearErrors();
        updateGameUI();
        
    } catch (error) {
        ErrorHandler.handleError(error, 'drawCard');
    }
}

async function passTurn() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (gameState.currentPlayer !== users.phone) {
            ErrorHandler.showError("It's not your turn!", 'warning');
            await soundManager.play('error');
            return;
        }

        const allPlayers = [gameState.creator.phone];
        if (gameState.opponent.phone) {
            allPlayers.push(gameState.opponent.phone);
        }
        
        const currentIndex = allPlayers.indexOf(users.phone);
        const nextPlayer = allPlayers[(currentIndex + 1) % allPlayers.length];

        const updates = {
            current_player: nextPlayer,
            has_drawn_this_turn: false
        };

        await updateGameWithRetry(updates);
        gameState.hasDrawnThisTurn = false;
        
        ErrorHandler.clearErrors();
        updateGameUI();
        
    } catch (error) {
        ErrorHandler.handleError(error, 'passTurn');
    }
}

// Enhanced suit selector with improved 8/J logic
async function showSuitSelector(playedCard) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-center">Choose New Suit</h3>
                <p class="text-sm text-gray-600 mb-4 text-center">
                    You played ${playedCard.value} of ${playedCard.suit}. Select the new suit:
                </p>
                <div class="grid grid-cols-2 gap-4">
                    ${SUITS.map(suit => `
                        <button class="suit-btn p-4 border-2 rounded-lg hover:bg-gray-50 flex flex-col items-center" data-suit="${suit}">
                            <span class="text-3xl mb-2">${getSuitSVG(suit)}</span>
                            <span class="capitalize font-medium">${suit}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', async (e) => {
            const suitBtn = e.target.closest('.suit-btn');
            if (suitBtn) {
                const selectedSuit = suitBtn.dataset.suit;
                
                await soundManager.play('suitChange');
                
                // Update game state with new suit
                const users = JSON.parse(localStorage.getItem('user')) || {};
                const allPlayers = [gameState.creator.phone];
                if (gameState.opponent.phone) {
                    allPlayers.push(gameState.opponent.phone);
                }
                const currentIndex = allPlayers.indexOf(users.phone);
                const nextPlayer = allPlayers[(currentIndex + 1) % allPlayers.length];

                const updates = {
                    current_suit: selectedSuit,
                    must_play_suit: true,
                    current_suit_to_match: selectedSuit,
                    last_suit_change_player: users.phone,
                    last_suit_change_method: playedCard.value,
                    current_player: nextPlayer
                };

                // Update player hand
                const handUpdate = gameState.playerRole === 'creator' 
                    ? { creator_hand: JSON.stringify(gameState.playerHand) }
                    : { opponent_hand: JSON.stringify(gameState.playerHand) };

                try {
                    await updateGameWithRetry(updates);
                    await updatePlayerHandWithRetry(handUpdate);
                    
                    gameState.currentSuit = selectedSuit;
                    gameState.mustPlaySuit = true;
                    gameState.currentSuitToMatch = selectedSuit;
                    gameState.lastSuitChangePlayer = users.phone;
                    gameState.lastSuitChangeMethod = playedCard.value;
                    
                    ErrorHandler.clearErrors();
                    updateGameUI();
                } catch (error) {
                    ErrorHandler.handleError(error, 'suitChange');
                }

                document.body.removeChild(modal);
                resolve();
            }
        });
    });
}

// Enhanced real-time updates with faster polling and better error handling
function setupRealtimeUpdates() {
    try {
        const channel = supabase
            .channel(`card_game_${gameState.gameCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'card_games',
                    filter: `code=eq.${gameState.gameCode}`
                },
                async (payload) => {
                    try {
                        // Process real-time updates faster
                        const oldStatus = gameState.status;
                        const oldCurrentPlayer = gameState.currentPlayer;
                        
                        gameState.status = payload.new.status;
                        gameState.currentPlayer = payload.new.current_player;
                        gameState.currentSuit = payload.new.current_suit;
                        gameState.hasDrawnThisTurn = payload.new.has_drawn_this_turn || false;
                        gameState.lastSuitChangePlayer = payload.new.last_suit_change_player;
                        gameState.lastSuitChangeMethod = payload.new.last_suit_change_method;

                        if (payload.new.last_card) {
                            gameState.lastCard = safeParseJSON(payload.new.last_card);
                        }

                        gameState.pendingAction = payload.new.pending_action;
                        gameState.pendingActionData = payload.new.pending_action_data;
                        gameState.mustPlaySuit = payload.new.must_play_suit || false;
                        gameState.currentSuitToMatch = payload.new.current_suit_to_match || '';
                        gameState.discardPile = payload.new.discard_pile ? safeParseJSON(payload.new.discard_pile) : [];

                        const users = JSON.parse(localStorage.getItem('user')) || {};
                        const isCreator = gameState.playerRole === 'creator';

                        if (isCreator) {
                            gameState.playerHand = safeParseJSON(payload.new.creator_hand) || [];
                            gameState.opponentHandCount = safeParseJSON(payload.new.opponent_hand)?.length || 0;
                        } else {
                            gameState.playerHand = safeParseJSON(payload.new.opponent_hand) || [];
                            gameState.opponentHandCount = safeParseJSON(payload.new.creator_hand)?.length || 0;
                        }

                        // Handle turn changes with sound effects
                        if (oldCurrentPlayer !== gameState.currentPlayer) {
                            if (gameState.currentPlayer === users.phone) {
                                // Your turn
                                AnimationManager.createFloatingText(
                                    document.getElementById('game-status'), 
                                    'Your Turn!', 
                                    { color: '#10b981', fontSize: '20px' }
                                );
                            }
                        }

                        if (payload.new.opponent_phone && !gameState.opponent.phone) {
                            gameState.opponent = {
                                username: payload.new.opponent_username,
                                phone: payload.new.opponent_phone
                            };

                            if (gameState.status === 'waiting') {
                                gameState.status = 'ongoing';
                            }
                        }

                        if (payload.new.status === 'finished') {
                            const isWinner = payload.new.winner === users.phone;
                            if (isWinner) {
                                await soundManager.play('win');
                                AnimationManager.createConfetti();
                            } else {
                                await soundManager.play('loss');
                            }
                            
                            setTimeout(() => {
                                const amount = Math.floor(gameState.betAmount * 1.8);
                                showGameResult(isWinner, amount);
                            }, 1000);
                        }

                        // Clear connection errors on successful update
                        ErrorHandler.clearErrors();
                        gameState.connectionStatus = 'connected';
                        
                        updateGameUI();
                    } catch (error) {
                        ErrorHandler.handleError(error, 'realtime-update');
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    gameState.connectionStatus = 'connected';
                    ErrorHandler.clearErrors();
                } else if (status === 'CHANNEL_ERROR') {
                    gameState.connectionStatus = 'disconnected';
                    ErrorHandler.handleError(new Error('Real-time connection lost'), 'realtime-connection');
                }
            });

        return channel;
    } catch (error) {
        ErrorHandler.handleError(error, 'realtime-setup');
    }
}

// Enhanced UI update function
function updateGameUI() {
    try {
        // Update connection status indicator
        const connectionEl = document.getElementById('connection-status');
        if (connectionEl) {
            connectionEl.textContent = gameState.connectionStatus;
            connectionEl.className = `connection-${gameState.connectionStatus}`;
        }

        // Update current suit display
        const suitDisplay = document.getElementById('current-suit');
        if (suitDisplay) {
            suitDisplay.innerHTML = getSuitSVG(gameState.currentSuit);
        }

        // Update player hand
        renderPlayerHand();
        
        // Update discard pile
        renderDiscardPile();
        
        // Update game status
        const statusEl = document.getElementById('game-status');
        if (statusEl && !gameState.error) {
            const users = JSON.parse(localStorage.getItem('user')) || {};
            if (gameState.currentPlayer === users.phone) {
                statusEl.textContent = 'Your turn!';
                statusEl.className = 'text-green-600 font-bold';
            } else {
                statusEl.textContent = 'Opponent\'s turn';
                statusEl.className = 'text-blue-600';
            }
        }

        // Update special game state indicators
        const specialStateEl = document.getElementById('special-state');
        if (specialStateEl) {
            if (gameState.mustPlaySuit && gameState.currentSuitToMatch) {
                specialStateEl.innerHTML = `Must play ${getSuitSVG(gameState.currentSuitToMatch)} cards or 8/J`;
                specialStateEl.className = 'text-yellow-600 font-medium';
            } else if (gameState.pendingAction === 'draw_two') {
                specialStateEl.textContent = 'Must play a 2 or draw cards!';
                specialStateEl.className = 'text-red-600 font-medium';
            } else {
                specialStateEl.textContent = '';
                specialStateEl.className = '';
            }
        }

        // Update opponent hand count
        const opponentCountEl = document.getElementById('opponent-hand-count');
        if (opponentCountEl) {
            opponentCountEl.textContent = gameState.opponentHandCount;
        }

        // Update draw pile count
        const drawPileEl = document.getElementById('draw-pile-count');
        if (drawPileEl) {
            drawPileEl.textContent = gameState.discardPile.length || 52;
        }

    } catch (error) {
        ErrorHandler.handleError(error, 'updateUI');
    }
}

// Initialize enhanced game
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const params = new URLSearchParams(window.location.search);
        gameState.gameCode = params.get('code');
        
        if (!gameState.gameCode) {
            window.location.href = '/';
            return;
        }
        
        await loadGameData();
        setupEventListeners();
        setupRealtimeUpdates();
        
        // Start periodic UI updates for better responsiveness
        setInterval(updateGameUI, 500);
        
    } catch (error) {
        ErrorHandler.handleError(error, 'initialization');
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        soundManager,
        AnimationManager,
        ErrorHandler,
        canPlayCard,
        gameState
    };
}
