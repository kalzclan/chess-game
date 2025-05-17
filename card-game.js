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
    '8': 'change_suit',  // Keeps original ability
    'J': 'change_suit',  // Keeps original ability
    '5': 'skip_turn',
    '7': 'play_multiple',  // Changed from 'play_same_suit' to allow any suit with 7
    '2': 'draw_two',
    'A': 'spade_ace_only'  // Changed to only work with Ace of Spades
};



// ...[keep your imports, setup, and all other code above unchanged]

// --- Helper for suit SVGs (returns SVG as string, for inline use) ---
function getSuitSVG(suit) {
    switch (suit) {
        case 'hearts':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="#d32f2f"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        case 'diamonds':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="#d32f2f"><path d="M19 12l-7-10-7 10 7 10 7-10z"/></svg>`;
        case 'clubs':
            return `<svg width="22" height="22" viewBox="0 0 200 200" fill="#263238"><circle cx="100" cy="60" r="35"/><circle cx="60" cy="130" r="35"/><circle cx="140" cy="130" r="35"/><path d="M100 100 L100 170 C100 185 85 185 85 170 L85 100 Z"/></svg>`;
        case 'spades':
            return `<svg width="22" height="22" viewBox="0 0 200 200" fill="#263238"><path d="M100 20 L160 120 L40 120 Z"/><path d="M100 110 L100 180 C100 195 85 195 85 180 L85 110 Z"/><circle cx="100" cy="115" r="20"/></svg>`;
        default:
            return '';
    }
}

// --- Realistic Card HTML (player hand & discard pile) ---

// --- Updated renderPlayerHand (realistic cards) ---

// --- Realistic Card HTML (matches index.html style for player hand) ---
function renderCardHTML(card, {isPlayable = false} = {}) {
    // SVG suits
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

    // Card color class
    const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';

    return `
    <div class="card ${card.suit} ${isPlayable ? 'playable' : ''}" style="position:relative;">
        <div class="card-value top">${card.value}</div>
        <div class="card-suit" style="align-self:center;">${getSuitSVG(card.suit)}</div>
        <div class="card-value bottom">${card.value}</div>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:6px;background:linear-gradient(135deg,rgba(255,255,255,0.14) 0%,transparent 80%);z-index:2;pointer-events:none;"></div>
    </div>
    `;
}

// --- Update renderPlayerHand to use the above realistic card ---
function renderPlayerHand() {
    if (!playerHandEl) return;
    
    // Clear the container
    playerHandEl.innerHTML = '';
    
    // Create a scrollable wrapper
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'player-hand-scroll';
    
    // Create an inner container for the cards
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
    
    // Add the cards container to the scroll wrapper
    scrollWrapper.appendChild(cardsContainer);
    // Add the scroll wrapper to the player hand element
    playerHandEl.appendChild(scrollWrapper);
}


// --- Updated renderDiscardPile (realistic cards) ---
function renderDiscardPile() {
    if (!discardPileEl) return;

    discardPileEl.innerHTML = '';
    const pileContainer = document.createElement('div');
    pileContainer.className = 'discard-pile-container';

    // Gather cards (discard pile + last card)
    const allCards = [];
    if (gameState.discardPile && gameState.discardPile.length > 0) {
        for (let i = 0; i < gameState.discardPile.length; i++) {
            allCards.push(gameState.discardPile[i]);
        }
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
        wrapper.innerHTML = renderCardHTML(card, {
            isTop,
            isStacked: !isTop,
            isPlayable: false
        });
        const cardEl = wrapper.firstElementChild;
        cardEl.style.zIndex = z;
        cardEl.style.position = 'absolute';
        cardEl.style.left = `calc(50% + ${xOffset}px)`;
        cardEl.style.top = `calc(50% + ${yOffset}px)`;
        cardEl.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
        pileContainer.appendChild(cardEl);
    });

    // Count badge if many cards
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

// --- (Optional/Advanced) If you have a draw deck UI, render its cards with forDeck: true ---
// Example usage: wrapper.innerHTML = renderCardHTML(null, {forDeck:true});


// --- CSS for realistic cards (add this to your <style> or inject with JS) ---
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
}
.card-realistic.playable {
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(76,175,80,0.13), 0 1.5px 8px rgba(50,150,50,0.06);
}
.card-realistic.playable:active,
.card-realistic.playable:focus {
    filter: brightness(0.97) drop-shadow(0 0 6px #4caf5044);
    transform: scale(1.04);
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
}
.card-realistic .card-corner {
    width: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.card-realistic .card-corner-top {
    align-items: flex-start;
    margin-top: 1px;
    margin-left: 1px;
}
.card-realistic .card-corner-bottom {
    align-items: flex-end;
    margin-bottom: 1px;
    margin-right: 2px;
    transform: rotate(180deg);
}
.card-realistic .card-center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    margin-top: 1px;
    margin-bottom: 1px;
}
.card-realistic.hearts, .card-realistic.diamonds {
    color: #d32f2f;
}
.card-realistic.clubs, .card-realistic.spades {
    color: #263238;
}
.card-realistic .card-value {
    font-size: 15px;
    font-weight: bold;
    text-shadow: 0px 1px 0px white, 0px 1px 3px #d1bfa7;
    margin-bottom: 1px;
}
.card-realistic .card-suit-svg svg {
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

/* Realistic card back for draw pile */
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
    content: '';
    display: block;
    width: 38px;
    height: 38px;
    background: url("data:image/svg+xml,%3Csvg width='32' height='32' fill='white' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='24' height='24' rx='5' fill='white' fill-opacity='0.17'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    opacity: 0.2;
    margin: auto;
}
@media (min-width: 400px) {
    .card-realistic,
    .card-back-realistic {
        width: 72px;
        height: 110px;
    }
}
@media (max-width: 350px) {
    .card-realistic,
    .card-back-realistic {
        width: 48px;
        height: 72px;
    }
}
`;

const injectRealism = document.createElement('style');
injectRealism.textContent = realismCSS;
document.head.appendChild(injectRealism);

// ...[rest of your code unchanged]







// --- CSS for Dialogs ---
const style = document.createElement('style');
style.textContent = `
/* Card Selection Modal */
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
    max-width: 500px;
    color: white;
}

.card-selection-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 20px 0;
    justify-content: center;
}

.card-option {
    width: 60px;
    height: 90px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5px;
    cursor: pointer;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
}

.card-option.selected {
    transform: translateY(-10px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.card-option.hearts, .card-option.diamonds {
    background-color: white;
    color: red;
}

.card-option.clubs, .card-option.spades {
    background-color: white;
    color: black;
}

.selection-actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.selection-actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
}

.selection-actions button:first-child {
    background-color: #27ae60;
    color: white;
}

.selection-actions button:last-child {
    background-color: #e74c3c;
    color: white;
}

/* Suit Selector Modal */
.suit-selector-modal {
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

.suit-selector {
    background-color: #2c3e50;
    padding: 20px;
    border-radius: 10px;
    width: 90%;
    max-width: 400px;
    color: white;
    text-align: center;
}

.suit-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    justify-content: center;
}

.suit-option {
    padding: 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    min-width: 80px;
    color: white;
}

.suit-option.hearts {
    background-color: #e74c3c;
}

.suit-option.diamonds {
    background-color: #3498db;
}

.suit-option.clubs {
    background-color: #2ecc71;
}

.suit-option.spades {
    background-color: #9b59b6;
}

/* Game Result Modal */
.game-result-modal {
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

.result-content {
    background-color: #2c3e50;
    padding: 30px;
    border-radius: 10px;
    width: 90%;
    max-width: 400px;
    color: white;
    text-align: center;
}

.result-content h2 {
    color: #f1c40f;
    margin-bottom: 20px;
}

#result-close-btn {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
    font-weight: bold;
}
`;
document.head.appendChild(style);


// Modify the canPlayCard function to implement the new rules


// --- Game State ---
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
    lastSuitChangeMethod: null ,// 'J' or '8' or null
    canChangeSuit: true // Whether the current card can be used to change suit
};

// --- Initialize Game ---
document.addEventListener('DOMContentLoaded', async () => {
    // Verify required DOM elements
    const requiredElements = {
        backBtn,
        gameCodeDisplay,
        currentSuitDisplay,
        playerHandEl,
        opponentHandCountEl,
        discardPileEl,
        gameStatusEl,
        playerNameEl,
        opponentNameEl,
        playerAvatarEl,
        opponentAvatarEl,
        drawCardBtn,
        passTurnBtn
    };

    // Check for missing elements
    const missingElements = Object.entries(requiredElements)
        .filter(([name, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements.join(', '));
        if (gameStatusEl) gameStatusEl.textContent = 'Game setup error - missing elements';
    }

    // Get game code from URL
    const params = new URLSearchParams(window.location.search);
    gameState.gameCode = params.get('code');
    
    if (!gameState.gameCode) {
        console.error('No game code provided in URL');
        window.location.href = '/';
        return;
    }
    
    if (gameCodeDisplay) gameCodeDisplay.textContent = gameState.gameCode;
    
    try {
        await loadGameData();
        setupEventListeners();
        setupRealtimeUpdates();
    } catch (error) {
        console.error('Game initialization failed:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Game initialization failed';
    }
    
    if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'home.html');
});

// --- Game Functions ---
// --- Add this code to handle bet deduction for creator when opponent joins ---

// 1. Deduct the creator's bet ONLY when opponent joins the game (not at room creation).
// 2. Prevent multiple deductions by marking "bet_deducted" in the DB.

// First, update your Supabase game table to have a boolean column `bet_deducted` (default: false).
// Assume this field exists. If not, you should add it in your Supabase dashboard.
// --- Add/update these functions and relevant calls in your code ---

// 1. Transaction recording utility (winner only!)
// Call this function only for the winner when the game ends, and for both players when the bet is deducted.

async function recordTransaction(transactionData) {
    try {
        // 1. First handle the user balance update
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', transactionData.player_phone)
            .single();

        if (userError) throw userError;

        const balance_before = userData?.balance || 0;
        const balance_after = balance_before + transactionData.amount;

        // 2. Attempt to create transaction record
        const { error } = await supabase
            .from('player_transactions')
            .insert({
                player_phone: transactionData.player_phone,
                transaction_type: transactionData.transaction_type,
                amount: transactionData.amount,
                balance_before,
                balance_after,
                description: transactionData.description,
                status: transactionData.status,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        // 3. Update user balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: balance_after })
            .eq('phone', transactionData.player_phone);

        if (updateError) throw updateError;

        console.log('Transaction recorded successfully:', transactionData);

    } catch (error) {
        console.error('Failed to record transaction:', error);
        // Fallback: Store transaction data in local storage if Supabase fails
        try {
            const failedTransactions = JSON.parse(localStorage.getItem('failedTransactions') || '[]');
            failedTransactions.push({
                ...transactionData,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('failedTransactions', JSON.stringify(failedTransactions));
            console.warn('Transaction stored locally for later recovery');
        } catch (localStorageError) {
            console.error('Failed to store transaction locally:', localStorageError);
        }
        throw error;
    }
}

// 2. Update bet deduction logic: only the creator records the transaction for both players at bet time.

// ... all your other code above ...

async function handleOpponentJoined(gameData) {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isCreator = users.phone === gameData.creator_phone;

    // Only the creator's client should EVER do this.
    if (isCreator && gameData.opponent_phone) {
        // Try to atomically set bet_deducted. Only the first will succeed.
        const { data: updatedGames, error: betFlagError } = await supabase
            .from('card_games')
            .update({ bet_deducted: true })
            .eq('code', gameData.code)
            .eq('bet_deducted', false)
            .select();

        // If no rows updated (i.e., updatedGames is empty array), another client already did it.
        if (betFlagError) {
            // Only treat as error if it's NOT "no rows found" (which is expected if already set)
            if (betFlagError.code !== 'PGRST116') {
                console.error('Failed to set bet_deducted flag:', betFlagError);
            }
            return;
        }
        if (!updatedGames || updatedGames.length === 0) {
            // Flag was already set, nothing to do!
            return;
        }

        // Fetch balances for BOTH players
        const { data: creatorData, error: creatorError } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', gameData.creator_phone)
            .single();

        const { data: opponentData, error: opponentError } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', gameData.opponent_phone)
            .single();

        if (creatorError || !creatorData || opponentError || !opponentData) {
            console.error('Failed to fetch balances for deduction');
            return;
        }
        if (creatorData.balance < gameData.bet || opponentData.balance < gameData.bet) {
            alert('One or both players do not have enough balance for the bet.');
            return;
        }

        // Deduct for both
        
            supabase.from('users').update({ balance: creatorData.balance -( gameData.bet/2) }).eq('phone', gameData.creator_phone);
            supabase.from('users').update({ balance: opponentData.balance - ( gameData.bet/2) }).eq('phone', gameData.opponent_phone);
        

        // Record transactions for both
        await recordTransaction({
            player_phone: gameData.creator_phone,
            transaction_type: 'bet',
            amount: -gameData.bet,
            description: `Bet placed for game ${gameData.code}`,
            status: 'success'
        });
        await recordTransaction({
            player_phone: gameData.opponent_phone,
            transaction_type: 'bet',
            amount: -gameData.bet,
            description: `Bet placed for game ${gameData.code}`,
            status: 'success'
        });
    }
}


// --- Call this after loading game data in loadGameData ---
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
        gameState.betAmount = gameData.bet;
        gameState.mustPlaySuit = gameData.must_play_suit || false;
        gameState.currentSuitToMatch = gameData.current_suit_to_match || '';
        gameState.hasDrawnThisTurn = gameData.has_drawn_this_turn || false;
        gameState.discardPile = gameData.discard_pile ? safeParseJSON(gameData.discard_pile) : [];

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
        gameState.lastSuitChangeMethod = gameData.last_suit_change_method;

        // ---- ADD THIS: Handle bet deduction if opponent joined ----
        await handleOpponentJoined(gameData);

        updateGameUI();

    } catch (error) {
        console.error('Error loading game:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error loading game';
        setTimeout(() => window.location.href = '/', 3000);
    }
}

// --- Also, in setupRealtimeUpdates, listen for opponent joining and re-run handleOpponentJoined() ---
function setupRealtimeUpdates() {
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
                    gameState.status = payload.new.status;
                    gameState.currentPlayer = payload.new.current_player;
                    gameState.currentSuit = payload.new.current_suit;
                    gameState.hasDrawnThisTurn = payload.new.has_drawn_this_turn || false;
                    gameState.lastSuitChangeMethod = payload.new.last_suit_change_method;

                    if (payload.new.last_card) {
                        try {
                            gameState.lastCard = typeof payload.new.last_card === 'string' ?
                                JSON.parse(payload.new.last_card) :
                                payload.new.last_card;
                        } catch (e) {
                            console.error('Error parsing last_card:', e);
                            gameState.lastCard = null;
                        }
                    } else {
                        gameState.lastCard = null;
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
                        const amount = Math.floor(gameState.betAmount * 1.8);
                        showGameResult(isWinner, amount);
                    }

                    // ---- ADD THIS: Check if opponent just joined and handle bet deduction ----
                    await handleOpponentJoined(payload.new);

                    updateGameUI();
                } catch (error) {
                    console.error('Error processing realtime update:', error);
                }
            }
        )
        .subscribe();

    return channel;
}


// --- Game Functions ---
// ... (all your imports and setup above remain unchanged)

// --- Game Functions ---
function canPlayCard(card) {
    // If no last card played, any card can be played
    if (!gameState.lastCard) return true;

    // If there's a pending draw action, only 2s can be played
    if (gameState.pendingAction === 'draw_two') {
        return card.value === '2' && 
               (card.suit === gameState.currentSuit || 
                card.value === gameState.lastCard.value);
    }

    // --- FIXED SECTION: 8/J after 8/J suit change ---
    // If must play specific suit due to previous 8 or J,
    // allow dropping any 8 or J (regardless of suit) even if it doesn't match the suit,
    // but don't allow it to change suit again if lastSuitChangeMethod is the same card value.
    if (gameState.mustPlaySuit && gameState.currentSuitToMatch) {
        if (card.value === '8' || card.value === 'J') {
            // Always allow to drop 8 or J, even if suit doesn't match, but not allowed to change suit again if same as lastSuitChangeMethod
            gameState.canChangeSuit = (gameState.lastSuitChangeMethod !== card.value);
            return true;
        }
        // Otherwise, must match the required suit
        return card.suit === gameState.currentSuitToMatch;
    }

    // Handle 8 and J - can always be played, but track if they can change suit
    if (card.value === '8' || card.value === 'J') {
        gameState.canChangeSuit = (gameState.lastSuitChangeMethod !== card.value);
        return true;
    }


    // Handle 2 cards - can only be played on same suit or another 2
    if (card.value === '2') {
        return card.suit === gameState.currentSuit || 
               gameState.lastCard.value === '2';
    }

    // Handle 7 card - can be played with any 8 or J regardless of suit
    if (card.value === '7') {
        if (card.suit === gameState.currentSuit || card.value === gameState.lastCard.value) {
            return true;
        }
        const hasEightOrJack = gameState.playerHand.some(c =>
            (c.value === '8' || c.value === 'J') && c !== card
        );
        return hasEightOrJack;
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
}

// ... (rest of your code remains unchanged)

// Update the processCardPlay function to handle the new Ace behavior
// ... (existing code above unchanged)

// Update the processCardPlay function to make 7 alone act as skip card
async function processCardPlay(cardsToPlay) {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isCreator = gameState.playerRole === 'creator';
    const opponentPhone = isCreator ? gameState.opponent.phone : gameState.creator.phone;

    // Remove cards from hand
    cardsToPlay.forEach(cardToRemove => {
        const index = gameState.playerHand.findIndex(
            c => c.suit === cardToRemove.suit && c.value === cardToRemove.value
        );
        if (index !== -1) {
            gameState.playerHand.splice(index, 1);
        }
    });

    // Use the last card played for game state
    const lastPlayedCard = cardsToPlay[cardsToPlay.length - 1];

    const updateData = {
        last_card: JSON.stringify(lastPlayedCard),
        current_suit: lastPlayedCard.suit,
        updated_at: new Date().toISOString(),
        must_play_suit: false,
        current_suit_to_match: '',
        has_drawn_this_turn: false
    };

    // Add played cards to discard pile (except last card)
    const cardsToDiscard = cardsToPlay.slice(0, -1);
    if (cardsToDiscard.length > 0) {
        updateData.discard_pile = JSON.stringify([
            ...gameState.discardPile,
            ...cardsToDiscard
        ]);
    }

    // Handle special cards
    if (lastPlayedCard.value in SPECIAL_CARDS) {
        const action = SPECIAL_CARDS[lastPlayedCard.value];

        switch (action) {
case 'change_suit':
    if (lastPlayedCard.value === '8' || lastPlayedCard.value === 'J') {
        if (gameState.lastSuitChangeMethod !== lastPlayedCard.value) {
            // Allow changing suit
            gameState.lastSuitChangeMethod = lastPlayedCard.value;
            gameState.pendingAction = 'change_suit';
            updateData.pending_action = 'change_suit';
            updateData.current_player = users.phone;
            updateData.last_suit_change_method = lastPlayedCard.value;
            // DO NOT set current_suit here
            delete updateData.current_suit;
            showSuitSelector();
        } else {
            // Just drop the card, don't change suit or trigger suit selector
            updateData.current_player = opponentPhone;
            // DO NOT change updateData.current_suit
            // Also don't update last_suit_change_method
            delete updateData.current_suit;
        }
    }
    break;
            case 'skip_turn':
                updateData.current_player = users.phone;
                break;

            case 'draw_two':
                // Handle draw two stacking
                let drawCount = 2;
                if (gameState.pendingAction === 'draw_two') {
                    // If already in a draw two sequence, add to the count
                    drawCount = (gameState.pendingActionData || 2) + 2;
                } else {
                    // Start new draw two sequence
                    drawCount = 2;
                }

                gameState.pendingAction = 'draw_two';
                updateData.pending_action = 'draw_two';
                updateData.pending_action_data = drawCount;
                updateData.current_player = opponentPhone;
                break;

            case 'spade_ace_only':
                // Only trigger if it's Ace of Spades
                if (lastPlayedCard.suit === 'spades' && lastPlayedCard.value === 'A') {
                    gameState.pendingAction = 'draw_two';
                    updateData.pending_action = 'draw_two';
                    updateData.pending_action_data = 5; // Make opponent draw 5
                    updateData.current_player = opponentPhone;
                } else {
                    // Normal Ace behavior - just pass turn
                    updateData.current_player = opponentPhone;
                }
                break;

            case 'play_multiple':
                // For 7 cards - check if playing with 8 or J
                const playingWithSpecial = cardsToPlay.some(card =>
                    card.value === '8' || card.value === 'J'
                );

                if (playingWithSpecial) {
                    // Check if any of the special cards can change suit
                    const specialCard = cardsToPlay.find(card =>
                        (card.value === '8' || card.value === 'J') &&
                        gameState.lastSuitChangeMethod !== card.value
                    );

                    if (specialCard) {
                        // If playing 7 with valid 8 or J, allow suit change
                        gameState.lastSuitChangeMethod = specialCard.value;
                        gameState.pendingAction = 'change_suit';
                        updateData.pending_action = 'change_suit';
                        updateData.current_player = users.phone;
                        updateData.last_suit_change_method = specialCard.value;
                        showSuitSelector();
                    } else {
                        // No special cards can change suit, just pass turn
                        updateData.current_player = opponentPhone;
                    }
                } else {
                    // ---- FEATURE: 7 played ALONE acts as skip card ----
                    if (
                        cardsToPlay.length === 1 && 
                        lastPlayedCard.value === '7'
                    ) {
                        updateData.current_player = users.phone; // Skip opponent, play again!
                    } else {
                        // Normal 7 behavior - pass turn
                        updateData.current_player = opponentPhone;
                    }
                }
                break;
        }
    } else {
        updateData.current_player = opponentPhone;
        // For non-special cards, reset the lastSuitChangeMethod
        gameState.lastSuitChangeMethod = null;
        updateData.last_suit_change_method = null;
    }

    // Update hands in database
    if (isCreator) {
        updateData.creator_hand = JSON.stringify(gameState.playerHand);
    } else {
        updateData.opponent_hand = JSON.stringify(gameState.playerHand);
    }

    // Check for win condition
    if (gameState.playerHand.length === 0) {
        updateData.status = 'finished';
        updateData.winner = users.phone;
        gameState.status = 'finished';

        const winnings = Math.floor(gameState.betAmount * 1.8);
        const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', users.phone)
            .single();

        if (userData) {
            const newBalance = userData.balance + winnings;
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('phone', users.phone);
        }


if (gameState.playerHand.length === 0) {
    updateData.status = 'finished';
    updateData.winner = users.phone;
    gameState.status = 'finished';

    const winnings = Math.floor(gameState.betAmount * 1.8);

    // 1. Update winner balance
    const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('phone', users.phone)
        .single();

    if (userData) {
        const newBalance = userData.balance + winnings;
        await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('phone', users.phone);
    }

    // 2. Update loser balance (no change, but for transaction record)
    const loserPhone = gameState.playerRole === 'creator' ? gameState.opponent.phone : gameState.creator.phone;

    // 3. Record "result" transaction for WINNER
    await recordTransaction({
        player_phone: users.phone,
        transaction_type: 'result',
        amount: winnings,
        description: `Won game ${gameState.gameCode}`,
        status: 'success'
    });

    // 4. Record "result" transaction for LOSER (amount 0, just to record loss)
    await recordTransaction({
        player_phone: loserPhone,
        transaction_type: 'result',
        amount: -gameState.betAmount,
        description: `Lost game ${gameState.gameCode}`,
        status: 'success'
    });

    showGameResult(true, winnings);
}





        
    }

    // Update game in database
    const { error } = await supabase
        .from('card_games')
        .update(updateData)
        .eq('code', gameState.gameCode);

    if (error) throw error;

    updateGameUI();
}

// ... (rest of your code unchanged)
function hasCardsOfSuit(suit) {
    return gameState.playerHand.some(card => card.suit === suit);
}



async function playCard(cardIndex) {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            return;
        }

        const card = gameState.playerHand[cardIndex];
        if (!card) throw new Error('Invalid card index');
        
        // Handle 7 card - show selection dialog
        if (card.value === '7') {
            await showSevenCardDialog(cardIndex);
            return;
        }
        
        // For other cards, proceed normally
        await processCardPlay([card]);
        
    } catch (error) {
        console.error('Error playing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error playing card';
    }
}



async function drawCard() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            return;
        }

        // Determine how many cards to draw
        let drawCount = 1;
        if (gameState.pendingAction === 'draw_two') {
            drawCount = gameState.pendingActionData || 2;
            // Clear the pending action after drawing
            gameState.pendingAction = null;
            gameState.pendingActionData = null;
        }

        const isCreator = gameState.playerRole === 'creator';
        
        // Get current game state
        const { data: gameData, error: fetchError } = await supabase
            .from('card_games')
            .select('deck, discard_pile, last_card')
            .eq('code', gameState.gameCode)
            .single();
            
        if (fetchError) throw fetchError;
        
        let deck = safeParseJSON(gameData.deck) || [];
        const cardsToAdd = [];
        
        // Draw the required number of cards
        for (let i = 0; i < drawCount; i++) {
            // If deck is empty, reshuffle discard pile (except last card)
             
    // If deck is empty, reshuffle discard pile (except last card)
    if (deck.length === 0) {
        let discardPile = safeParseJSON(gameData.discard_pile) || [];
        const lastCard = safeParseJSON(gameData.last_card);
        
        // Remove last card from discard pile (so it stays in play)
        if (lastCard) {
            discardPile = discardPile.filter(card => 
                !(card.suit === lastCard.suit && card.value === lastCard.value));
        }
        
        // Reshuffle the remaining cards
        deck = shuffleArray(discardPile);
        
        // Update game state
        gameState.discardPile = lastCard ? [lastCard] : [];
        
        // Update deck and clear discard pile (except last card)
        const { error: updateDeckError } = await supabase
            .from('card_games')
            .update({
                deck: JSON.stringify(deck),
                discard_pile: JSON.stringify(gameState.discardPile),
                updated_at: new Date().toISOString()
            })
            .eq('code', gameState.gameCode);
            
        if (updateDeckError) throw updateDeckError;
    }
            // Draw card if available
            if (deck.length > 0) {
                cardsToAdd.push(deck.pop());
            }
        }
        
        // Add drawn cards to hand
        gameState.playerHand = [...gameState.playerHand, ...cardsToAdd];
        
        // Update database
        const updateData = {
            deck: JSON.stringify(deck),
            updated_at: new Date().toISOString(),
            has_drawn_this_turn: true,
            pending_action: null,
            pending_action_data: null
        };
        
        if (isCreator) {
            updateData.creator_hand = JSON.stringify(gameState.playerHand);
        } else {
            updateData.opponent_hand = JSON.stringify(gameState.playerHand);
        }
        
        const { error } = await supabase
            .from('card_games')
            .update(updateData)
            .eq('code', gameState.gameCode);
            
        if (error) throw error;
        
        gameState.hasDrawnThisTurn = true;
        gameState.pendingAction = null;
        gameState.pendingActionData = null;
        updateGameUI();
        
    } catch (error) {
        console.error('Error drawing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error drawing card';
    }
}



// Update the showSevenCardDialog function to handle the new 7 card behavior
async function showSevenCardDialog(initialCardIndex) {
    const initialCard = gameState.playerHand[initialCardIndex];
    
    // Find all 8s and Js in hand (regardless of suit) that can be played with this 7
    const specialCards = gameState.playerHand.filter(
        (card, index) => (card.value === '8' || card.value === 'J') && index !== initialCardIndex&&card.suit !== initialCard.suit
    );
    const sameSuitCards = gameState.playerHand.filter(
        (card, index) => card.suit === initialCard.suit && index !== initialCardIndex
    );
    // If no special cards to play with, treat as normal card
    if (specialCards.length === 0&&sameSuitCards.length === 0) {
        await processCardPlay([initialCard]);
        return;
    }
    
    // Create selection modal
    const modal = document.createElement('div');
    modal.className = 'card-selection-modal';
    modal.innerHTML = `
        <div class="selection-content">
            <h3>Select cards to play with ${initialCard.value} of ${initialCard.suit}</h3>
            <div class="card-selection-options">
                ${specialCards.map((card, i) => `
                    <div class="card-option ${card.suit}" data-index="${gameState.playerHand.findIndex(c => 
                        c.suit === card.suit && c.value === card.value)}">
                        <div class="card-value">${card.value}</div>
                        <div class="card-suit"></div>
                    </div>
                `).join('')}
                                ${sameSuitCards.map((card, i) => `
                    <div class="card-option ${card.suit}" data-index="${gameState.playerHand.findIndex(c => 
                        c.suit === card.suit && c.value === card.value)}">
                        <div class="card-value">${card.value}</div>
                        <div class="card-suit"></div>
                    </div>
                `).join('')}
            </div>
            <div class="selection-actions">
                <button id="play-selected-cards">Play Selected</button>
                <button id="play-single-seven">Play Just This 7</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Track selected cards
    const selectedIndices = new Set([initialCardIndex]);
    
    // Add selection handlers
    modal.querySelectorAll('.card-option').forEach(option => {
        option.addEventListener('click', () => {
            const index = parseInt(option.dataset.index);
            if (selectedIndices.has(index)) {
                option.classList.remove('selected');
                selectedIndices.delete(index);
            } else {
                option.classList.add('selected');
                selectedIndices.add(index);
            }
        });
    });
    
    // Add action handlers
    return new Promise((resolve) => {
        modal.querySelector('#play-selected-cards').addEventListener('click', async () => {
            const cardsToPlay = Array.from(selectedIndices).map(i => gameState.playerHand[i]);
            modal.remove();
            await processCardPlay(cardsToPlay);
            resolve();
        });
        
        modal.querySelector('#play-single-seven').addEventListener('click', async () => {
            modal.remove();
            await processCardPlay([initialCard]);
            resolve();
        });
    });
}
function updateGameUI() {
        const users = JSON.parse(localStorage.getItem('user')) || {};

            const isMyTurn = users.phone === gameState.currentPlayer;
    const isCreator = gameState.playerRole === 'creator';

    // Top section: Always show the other player (opponent for creator, creator for opponent)
    if (opponentNameEl) {
        if (isCreator) {
            opponentNameEl.textContent = gameState.opponent.username || 'Waiting...';
        } else {
            opponentNameEl.textContent = gameState.creator.username || 'Waiting...';
        }
    }
    if (opponentAvatarEl) {
        const name = isCreator ? gameState.opponent.username : gameState.creator.username;
        opponentAvatarEl.style.backgroundColor = generateAvatarColor(name);
        opponentAvatarEl.textContent = name ? name.charAt(0).toUpperCase() : 'O';
    }

    // Bottom section: Always show myself
    if (playerNameEl) playerNameEl.textContent = users.username || 'You';
    if (playerAvatarEl) {
        playerAvatarEl.style.backgroundColor = generateAvatarColor(users.username);
        playerAvatarEl.textContent = users.username ? users.username.charAt(0).toUpperCase() : 'Y';
    }
    
    // Update game state display
    if (currentSuitDisplay) {
        currentSuitDisplay.textContent = gameState.currentSuit 
            ? `${gameState.currentSuit.toUpperCase()}` 
            : 'Not set';
        currentSuitDisplay.className = `suit-${gameState.currentSuit}`;
    }
    
    if (opponentHandCountEl) {
        opponentHandCountEl.textContent = `${gameState.opponentHandCount} cards`;
    }
    
    // Show/hide action buttons based on game state
    if (drawCardBtn) {
        drawCardBtn.style.display = isMyTurn && !gameState.hasDrawnThisTurn ? 'block' : 'none';
    }
    
    if (passTurnBtn) {
        // Only show pass button if player has drawn this turn
        passTurnBtn.style.display = isMyTurn && gameState.hasDrawnThisTurn ? 'block' : 'none';
        
        // Exception: Also show if forced to pass due to suit mismatch

        if (isMyTurn && gameState.mustPlaySuit && !hasCardsOfSuit(gameState.currentSuitToMatch)) {
           // passTurnBtn.style.display = 'block';
        }
    }
    
    // Render game elements
    if (gameState.status !== 'waiting') {
        renderPlayerHand();
        renderDiscardPile();
    } else {
       if (playerHandEl) playerHandEl.innerHTML = '<div class="waiting-message"></div>';
        if (discardPileEl) discardPileEl.innerHTML = '';
    }
    
    // Update game status
    if (gameStatusEl) {
        if (gameState.status === 'waiting') {
            gameStatusEl.textContent = 'Waiting for opponent...';
        } else {


            
            let statusText = isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
            
            if (isMyTurn && gameState.pendingAction === 'draw_two') {
                const drawCount = gameState.pendingActionData || 2;
                statusText = `You must draw ${drawCount} cards or play a 2`;
            }
            
            gameStatusEl.textContent = statusText;
            gameStatusEl.className = isMyTurn ? 'status-your-turn' : 'status-opponent-turn';
        }
    }
}

async function passTurn() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            return;
        }

        const isCreator = gameState.playerRole === 'creator';
        const opponentPhone = isCreator ? gameState.opponent.phone : gameState.creator.phone;
        
        const updateData = {
            current_player: opponentPhone,
            updated_at: new Date().toISOString(),
            must_play_suit: false,
            current_suit_to_match: '',
            has_drawn_this_turn: false
        };
        
        const { error } = await supabase
            .from('card_games')
            .update(updateData)
            .eq('code', gameState.gameCode);
            
        if (error) throw error;
        
        gameState.mustPlaySuit = false;
        gameState.currentSuitToMatch = '';
        gameState.hasDrawnThisTurn = false;
        updateGameUI();
        
    } catch (error) {
        console.error('Error passing turn:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error passing turn';
    }
}

function showSuitSelector() {
    const modal = document.createElement('div');
    modal.className = 'suit-selector-modal';
    modal.innerHTML = `
        <div class="suit-selector">
            <h3>Choose a suit:</h3>
            <div class="suit-options">
                ${SUITS.map(suit => `
                    <button class="suit-option ${suit}" data-suit="${suit}">
                        ${suit.toUpperCase()}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after selection
    modal.querySelectorAll('.suit-option').forEach(button => {
        button.addEventListener('click', async () => {
            const selectedSuit = button.dataset.suit;
            
            try {
                const users = JSON.parse(localStorage.getItem('user')) || {};
                if (!users.phone) throw new Error('User not logged in');
                
                const isCreator = gameState.playerRole === 'creator';
                const opponentPhone = isCreator ? gameState.opponent.phone : gameState.creator.phone;
                
                const { error } = await supabase
                    .from('card_games')
                    .update({
                        current_suit: selectedSuit,
                        current_player: opponentPhone,
                        pending_action: null,
                        pending_action_data: null,
                        updated_at: new Date().toISOString(),
                        must_play_suit: true,
                        current_suit_to_match: selectedSuit,
                        has_drawn_this_turn: false
                    })
                    .eq('code', gameState.gameCode);
                    
                if (error) throw error;
                
                modal.remove();
                
            } catch (error) {
                console.error('Error selecting suit:', error);
                modal.remove();
            }
        });
    });
}

function setupEventListeners() {
    if (drawCardBtn) drawCardBtn.addEventListener('click', drawCard);
    if (passTurnBtn) passTurnBtn.addEventListener('click', passTurn);
}

function generateAvatarColor(username) {
    if (!username) return '#6c757d';
    const colors = ['#ff6b6b', '#51cf66', '#fcc419', '#228be6', '#be4bdb'];
    const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
}

function handlePendingAction() {
    if (!gameStatusEl) return;
    
    if (gameState.pendingAction === 'draw_two') {
        const drawCount = gameState.pendingActionData || 2;
        gameStatusEl.textContent = `You must play a 2 or draw ${drawCount} cards`;
    } else if (gameState.pendingAction === 'change_suit') {
        showSuitSelector();
    }
}

function showGameResult(isWinner, amount) {
    const resultModal = document.createElement('div');
    resultModal.className = 'game-result-modal';
    resultModal.innerHTML = `
        <div class="result-content">
            <h2>${isWinner ? 'You Won!' : 'You Lost'}</h2>
            <p>${isWinner ? `You won ${amount} ETB!` : 'Better luck next time'}</p>
            <button id="result-close-btn">Close</button>
        </div>
    `;
    
    document.body.appendChild(resultModal);
    
    const closeBtn = resultModal.querySelector('#result-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            resultModal.remove();
            window.location.href = 'home.html';
        });
    }
}




function safeParseJSON(json) {
    try {
        return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}

function displayMessage(element, message, type = 'info') {
    if (!element) return;
    
    element.textContent = message;
    element.className = `status-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 3000);
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
