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

// --- Game State ---
let gameState = {
    gameCode: '',
    players: [],
    currentPlayer: '',
    deck: [],
    discardPile: [],
    lastCard: null,
    currentSuit: '',
    playerHand: [],
    opponentHand: [],
    gameStatus: 'waiting',
    canPlayMultiple: false, // Track if player can play multiple cards
    cardsPlayedThisTurn: 0, // Track cards played in current turn
    pendingDraws: 0, // Track pending card draws from 2s
    skipNextTurn: false // Track if next turn should be skipped
};

// --- Helper Functions ---
function getSuitSVG(suit) {
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

function renderCardHTML(card, {isPlayable = false} = {}) {
    if (!card) {
        // Return card back for deck
        return `
        <div class="card-back-realistic">
            <div class="card-back-inner"></div>
        </div>
        `;
    }

    const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';

    return `
    <div class="card card-realistic ${card.suit} ${colorClass} ${isPlayable ? 'playable' : ''}" data-suit="${card.suit}" data-value="${card.value}">
        <div class="card-gloss"></div>
        <div class="card-inner">
            <div class="card-corner card-corner-top">
                <div class="card-value">${card.value}</div>
                <div class="card-suit-svg">${getSuitSVG(card.suit)}</div>
            </div>
            <div class="card-center">
                <div class="card-suit-svg" style="transform: scale(1.5);">${getSuitSVG(card.suit)}</div>
            </div>
            <div class="card-corner card-corner-bottom">
                <div class="card-value">${card.value}</div>
                <div class="card-suit-svg">${getSuitSVG(card.suit)}</div>
            </div>
        </div>
    </div>
    `;
}

function canPlayCard(card) {
    if (!gameState.lastCard) return true;
    
    const users = JSON.parse(localStorage.getItem('user')) || {};
    if (gameState.currentPlayer !== users.phone) return false;

    // Handle Ace of Spades special rule
    if (card.value === 'A' && card.suit === 'spades') {
        return true; // Ace of Spades can always be played
    }
    
    // Regular matching rules
    const matchesSuit = card.suit === gameState.currentSuit;
    const matchesValue = card.value === gameState.lastCard.value;
    const isSpecialCard = SPECIAL_CARDS[card.value];
    
    return matchesSuit || matchesValue || isSpecialCard;
}

function renderPlayerHand() {
    if (!playerHandEl) return;
    
    playerHandEl.innerHTML = '';
    
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'player-hand-scroll';
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'player-hand-cards';
    
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = gameState.currentPlayer === users.phone;
    
    gameState.playerHand.forEach((card, index) => {
        const isPlayable = isMyTurn && canPlayCard(card);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderCardHTML(card, { isPlayable });
        const cardEl = wrapper.firstElementChild;
        
        if (isPlayable) {
            cardEl.addEventListener('click', () => playCard(index));
        }
        cardsContainer.appendChild(cardEl);
    });
    
    scrollWrapper.appendChild(cardsContainer);
    playerHandEl.appendChild(scrollWrapper);
}

function renderDiscardPile() {
    if (!discardPileEl) return;

    discardPileEl.innerHTML = '';
    const pileContainer = document.createElement('div');
    pileContainer.className = 'discard-pile-container';

    const allCards = [];
    if (gameState.discardPile && gameState.discardPile.length > 0) {
        allCards.push(...gameState.discardPile);
    }
    if (gameState.lastCard) allCards.push(gameState.lastCard);

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
        wrapper.innerHTML = renderCardHTML(card);
        const cardEl = wrapper.firstElementChild;
        
        if (!isTop) {
            cardEl.classList.add('stacked-card');
        } else {
            cardEl.classList.add('top-card');
        }
        
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

// --- Game Logic Functions ---
async function playCard(cardIndex) {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    if (gameState.currentPlayer !== users.phone) {
        showGameStatus("It's not your turn!");
        return;
    }

    const card = gameState.playerHand[cardIndex];
    if (!canPlayCard(card)) {
        showGameStatus("You can't play that card!");
        return;
    }

    try {
        // Remove card from hand
        gameState.playerHand.splice(cardIndex, 1);
        
        // Add to discard pile
        if (gameState.lastCard) {
            gameState.discardPile.push(gameState.lastCard);
        }
        gameState.lastCard = card;
        gameState.currentSuit = card.suit;
        gameState.cardsPlayedThisTurn++;

        // Handle special card effects
        let shouldEndTurn = true;
        let nextPlayer = getNextPlayer();

        switch (SPECIAL_CARDS[card.value]) {
            case 'change_suit':
                // For 8s and Jacks, let player choose suit
                if (card.value === '8' || card.value === 'J') {
                    const newSuit = await showSuitSelectionDialog();
                    if (newSuit) {
                        gameState.currentSuit = newSuit;
                    }
                }
                break;
                
            case 'skip_turn':
                // 5 skips the next player's turn
                gameState.skipNextTurn = true;
                break;
                
            case 'play_multiple':
                // 7 allows playing multiple cards
                gameState.canPlayMultiple = true;
                shouldEndTurn = false;
                showGameStatus("You can play another card or pass your turn!");
                break;
                
            case 'draw_two':
                // 2 makes next player draw 2 cards
                gameState.pendingDraws += 2;
                break;
                
            case 'spade_ace_only':
                // Ace of Spades special handling
                if (card.suit === 'spades') {
                    // Special effect for Ace of Spades
                    showGameStatus("Ace of Spades played!");
                }
                break;
        }

        // Check for win condition
        if (gameState.playerHand.length === 0) {
            gameState.gameStatus = 'finished';
            showGameStatus("You won!");
            await updateGameState();
            return;
        }

        // Handle turn progression
        if (shouldEndTurn && !gameState.canPlayMultiple) {
            await endTurn();
        } else {
            // Update game state but don't change turn
            await updateGameState();
            renderPlayerHand();
        }

    } catch (error) {
        console.error('Error playing card:', error);
        showGameStatus('Error playing card. Please try again.');
    }
}

async function endTurn() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    
    // Reset turn-specific flags
    gameState.canPlayMultiple = false;
    gameState.cardsPlayedThisTurn = 0;
    
    // Handle skip turn
    if (gameState.skipNextTurn) {
        gameState.skipNextTurn = false;
        // Skip is handled by staying on current player, then switching normally
    }
    
    // Switch to next player
    gameState.currentPlayer = getNextPlayer();
    
    // Handle pending draws for the new current player
    if (gameState.pendingDraws > 0 && gameState.currentPlayer !== users.phone) {
        // AI/opponent draws cards
        for (let i = 0; i < gameState.pendingDraws; i++) {
            if (gameState.deck.length === 0) {
                reshuffleDeck();
            }
            gameState.opponentHand.push(gameState.deck.pop());
        }
        gameState.pendingDraws = 0;
    }
    
    await updateGameState();
    renderGame();
}

function getNextPlayer() {
    const currentIndex = gameState.players.findIndex(p => p.phone === gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    return gameState.players[nextIndex].phone;
}

async function drawCard() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    if (gameState.currentPlayer !== users.phone) {
        showGameStatus("It's not your turn!");
        return;
    }

    try {
        // Handle pending draws first
        const cardsToDraw = gameState.pendingDraws > 0 ? gameState.pendingDraws : 1;
        
        for (let i = 0; i < cardsToDraw; i++) {
            if (gameState.deck.length === 0) {
                reshuffleDeck();
            }
            
            if (gameState.deck.length > 0) {
                const drawnCard = gameState.deck.pop();
                gameState.playerHand.push(drawnCard);
            }
        }
        
        gameState.pendingDraws = 0;
        
        // End turn after drawing
        await endTurn();
        
    } catch (error) {
        console.error('Error drawing card:', error);
        showGameStatus('Error drawing card. Please try again.');
    }
}

async function passTurn() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    if (gameState.currentPlayer !== users.phone) {
        showGameStatus("It's not your turn!");
        return;
    }

    if (gameState.pendingDraws > 0) {
        showGameStatus("You must draw cards first!");
        return;
    }

    try {
        await endTurn();
    } catch (error) {
        console.error('Error passing turn:', error);
        showGameStatus('Error passing turn. Please try again.');
    }
}

function showSuitSelectionDialog() {
    return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'card-selection-modal';
        
        const content = document.createElement('div');
        content.className = 'selection-content';
        content.innerHTML = `
            <h3>Choose a suit:</h3>
            <div class="suit-selection-options">
                <div class="suit-option" data-suit="hearts">
                    ${getSuitSVG('hearts')}
                    <span>Hearts</span>
                </div>
                <div class="suit-option" data-suit="diamonds">
                    ${getSuitSVG('diamonds')}
                    <span>Diamonds</span>
                </div>
                <div class="suit-option" data-suit="clubs">
                    ${getSuitSVG('clubs')}
                    <span>Clubs</span>
                </div>
                <div class="suit-option" data-suit="spades">
                    ${getSuitSVG('spades')}
                    <span>Spades</span>
                </div>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Handle suit selection
        content.addEventListener('click', (e) => {
            const suitOption = e.target.closest('.suit-option');
            if (suitOption) {
                const selectedSuit = suitOption.dataset.suit;
                document.body.removeChild(modal);
                resolve(selectedSuit);
            }
        });
    });
}

function reshuffleDeck() {
    if (gameState.discardPile.length === 0) return;
    
    // Move all but the last card from discard pile back to deck
    const cardsToShuffle = gameState.discardPile.splice(0, gameState.discardPile.length - 1);
    gameState.deck.push(...shuffleArray(cardsToShuffle));
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showGameStatus(message) {
    if (gameStatusEl) {
        gameStatusEl.textContent = message;
        // Auto-clear after 3 seconds
        setTimeout(() => {
            if (gameStatusEl.textContent === message) {
                updateGameStatusDisplay();
            }
        }, 3000);
    }
}

function updateGameStatusDisplay() {
    if (!gameStatusEl) return;
    
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = gameState.currentPlayer === users.phone;
    
    if (gameState.gameStatus === 'finished') {
        gameStatusEl.textContent = 'Game Over';
        return;
    }
    
    if (gameState.pendingDraws > 0 && isMyTurn) {
        gameStatusEl.textContent = `Draw ${gameState.pendingDraws} card(s)!`;
    } else if (gameState.canPlayMultiple && isMyTurn) {
        gameStatusEl.textContent = 'Play another card or pass turn';
    } else if (isMyTurn) {
        gameStatusEl.textContent = 'Your turn - Play a card or draw';
    } else {
        const currentPlayerName = gameState.players.find(p => p.phone === gameState.currentPlayer)?.name || 'Opponent';
        gameStatusEl.textContent = `${currentPlayerName}'s turn`;
    }
}

function renderGame() {
    renderPlayerHand();
    renderDiscardPile();
    updateGameStatusDisplay();
    
    // Update current suit display
    if (currentSuitDisplay && gameState.currentSuit) {
        currentSuitDisplay.innerHTML = `Current suit: ${getSuitSVG(gameState.currentSuit)}`;
    }
    
    // Update opponent hand count
    if (opponentHandCountEl) {
        const opponentCount = gameState.opponentHand ? gameState.opponentHand.length : 0;
        opponentHandCountEl.textContent = `Opponent: ${opponentCount} cards`;
    }
    
    // Update button states
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = gameState.currentPlayer === users.phone;
    
    if (drawCardBtn) {
        drawCardBtn.disabled = !isMyTurn || gameState.gameStatus === 'finished';
    }
    
    if (passTurnBtn) {
        passTurnBtn.disabled = !isMyTurn || gameState.gameStatus === 'finished' || gameState.pendingDraws > 0;
        passTurnBtn.style.display = gameState.canPlayMultiple && isMyTurn ? 'block' : 'none';
    }
}

async function updateGameState() {
    try {
        const { error } = await supabase
            .from('games')
            .update({
                game_state: gameState,
                updated_at: new Date().toISOString()
            })
            .eq('game_code', gameState.gameCode);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating game state:', error);
    }
}

// --- Event Listeners ---
if (drawCardBtn) {
    drawCardBtn.addEventListener('click', drawCard);
}

if (passTurnBtn) {
    passTurnBtn.addEventListener('click', passTurn);
}

if (backBtn) {
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// --- CSS Styles ---
const realismCSS = `
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

/* Suit Selection Modal */
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

const injectRealism = document.createElement('style');
injectRealism.textContent = realismCSS;
document.head.appendChild(injectRealism);

// --- Initialize Game ---
function initializeGame() {
    const urlParams = new URLSearchParams(window.location.search);
    gameState.gameCode = urlParams.get('code') || '';
    
    if (gameCodeDisplay) {
        gameCodeDisplay.textContent = gameState.gameCode;
    }
    
    // Load initial game state
    loadGameState();
    
    // Set up real-time subscription
    setupGameSubscription();
}

async function loadGameState() {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('game_code', gameState.gameCode)
            .single();

        if (error) throw error;
        
        if (data && data.game_state) {
            Object.assign(gameState, data.game_state);
            renderGame();
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
}

function setupGameSubscription() {
    supabase
        .channel('game-updates')
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'games',
                filter: `game_code=eq.${gameState.gameCode}`
            }, 
            (payload) => {
                if (payload.new && payload.new.game_state) {
                    Object.assign(gameState, payload.new.game_state);
                    renderGame();
                }
            }
        )
        .subscribe();
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);
