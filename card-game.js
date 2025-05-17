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
// Add these utility functions before they are used in your code:

// Helper function to safely parse JSON
function safeParseJSON(json) {
    try {
        return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}

// Generate avatar color based on username
function generateAvatarColor(username) {
    if (!username) return '#6c757d';
    const colors = ['#ff6b6b', '#51cf66', '#fcc419', '#228be6', '#be4bdb'];
    const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
}

// Draw card function
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
            if (deck.length === 0) {
                let discardPile = safeParseJSON(gameData.discard_pile) || [];
                const lastCard = safeParseJSON(gameData.last_card);
                
                if (lastCard) {
                    discardPile = discardPile.filter(card => 
                        !(card.suit === lastCard.suit && card.value === lastCard.value));
                }
                
                deck = shuffleArray(discardPile);
                gameState.discardPile = lastCard ? [lastCard] : [];
                
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
        updateGameUI();
        
    } catch (error) {
        console.error('Error drawing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error drawing card';
    }
}

// Shuffle array function
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Display message function
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

// Setup event listeners
function setupEventListeners() {
    if (drawCardBtn) drawCardBtn.addEventListener('click', drawCard);
    if (passTurnBtn) passTurnBtn.addEventListener('click', passTurn);
    if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'home.html');
}

// Pass turn function
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
// The rest of your existing code can stay the same...
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
    lastSuitChangeMethod: null,
    canChangeSuit: true,
    betDeducted: false,
    transactionsRecorded: false
};

// --- Transaction Handling ---
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

        // 2. Create transaction record
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
                game_id: gameState.gameCode,
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
        return true;

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

// --- Bet Handling ---
async function handleBetDeduction() {
    if (gameState.betDeducted) return;

    try {
        const phone = localStorage.getItem('phone');
        const { data: gameData } = await supabase
            .from('card_games')
            .select('bet, creator_phone, opponent_phone')
            .eq('code', gameState.gameCode)
            .single();

        if (!gameData) {
            console.warn("Game data not found for bet deduction.");
            return;
        }

        gameState.betAmount = gameData.bet;

        // Only deduct if both players have joined
        if (gameData.creator_phone && gameData.opponent_phone) {
            // Deduct from both players
            await deductFromPlayer(gameData.creator_phone);
            await deductFromPlayer(gameData.opponent_phone);
            
            gameState.betDeducted = true;
            showNotification(`Bets of ${gameState.betAmount} ETB deducted from both players`, 'info');
        }
    } catch (error) {
        console.error('Error handling bet deduction:', error);
        displayMessage(gameStatusEl, 'Error deducting bet. Please try again.', 'error');
    }
}

async function deductFromPlayer(phone) {
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('phone', phone)
        .single();

    if (userError) throw userError;

    if (userData && userData.balance >= gameState.betAmount) {
        const newBalance = userData.balance - gameState.betAmount;
        
        // Update balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('phone', phone);

        if (updateError) throw updateError;

        // Record transaction
        await recordTransaction({
            player_phone: phone,
            transaction_type: 'bet',
            amount: -gameState.betAmount,
            description: `Bet for card game ${gameState.gameCode}`,
            status: 'completed'
        });
    } else {
        throw new Error('Insufficient balance');
    }
}

// --- Game Win Handling ---
async function handleGameWin(winningPlayerPhone) {
    if (gameState.transactionsRecorded) return;

    try {
        // Calculate winnings (180% of bet amount)
        const winnings = Math.floor(gameState.betAmount * 1.8);
        
        // Update winner's balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: supabase.rpc('increment', { 
                phone: winningPlayerPhone, 
                amount: winnings 
            })}) 
            .eq('phone', winningPlayerPhone);

        if (updateError) throw updateError;

        // Record winning transaction
        await recordTransaction({
            player_phone: winningPlayerPhone,
            transaction_type: 'win',
            amount: winnings,
            description: `Won card game ${gameState.gameCode}`,
            status: 'completed'
        });

        // Update house balance (20% cut)
        await updateHouseBalance(gameState.betAmount * 0.2);

        gameState.transactionsRecorded = true;
        showNotification(`Winner received ${winnings} ETB!`, 'success');

    } catch (error) {
        console.error('Error handling game win:', error);
        showNotification('Error processing winnings', 'error');
    }
}

// --- House Balance Management ---
async function updateHouseBalance(amount) {
    try {
        const { data: house, error } = await supabase
            .from('house_balance')
            .select('balance')
            .eq('id', 1)
            .single();
  
        if (error) throw error;
  
        const newBalance = (house?.balance || 0) + amount;
  
        const { error: updateError } = await supabase
            .from('house_balance')
            .update({ balance: newBalance })
            .eq('id', 1);
  
        if (updateError) throw updateError;
  
        return newBalance;
    } catch (error) {
        console.error('House balance update error:', error);
        throw error;
    }
}

// --- Game Functions ---
function canPlayCard(card) {
    if (!gameState.lastCard) return true;

    if (gameState.pendingAction === 'draw_two') {
        return card.value === '2' && 
               (card.suit === gameState.currentSuit || 
                card.value === gameState.lastCard.value);
    }

    if (gameState.mustPlaySuit && gameState.currentSuitToMatch) {
        if (card.value === '8' || card.value === 'J') {
            gameState.canChangeSuit = (gameState.lastSuitChangeMethod !== card.value);
            return true;
        }
        return card.suit === gameState.currentSuitToMatch;
    }

    if (card.value === '8' || card.value === 'J') {
        gameState.canChangeSuit = (gameState.lastSuitChangeMethod !== card.value);
        return true;
    }

    if (card.value === '2') {
        return card.suit === gameState.currentSuit || 
               gameState.lastCard.value === '2';
    }

    if (card.value === '7') {
        if (card.suit === gameState.currentSuit || card.value === gameState.lastCard.value) {
            return true;
        }
        const hasEightOrJack = gameState.playerHand.some(c =>
            (c.value === '8' || c.value === 'J') && c !== card
        );
        return hasEightOrJack;
    }

    if (card.value === 'A') {
        if (card.suit === 'spades') return true;
        return card.suit === gameState.currentSuit ||
               card.value === gameState.lastCard.value;
    }

    return card.suit === gameState.currentSuit ||
           card.value === gameState.lastCard.value;
}

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

    const lastPlayedCard = cardsToPlay[cardsToPlay.length - 1];
    const updateData = {
        last_card: JSON.stringify(lastPlayedCard),
        current_suit: lastPlayedCard.suit,
        updated_at: new Date().toISOString(),
        must_play_suit: false,
        current_suit_to_match: '',
        has_drawn_this_turn: false
    };

    const cardsToDiscard = cardsToPlay.slice(0, -1);
    if (cardsToDiscard.length > 0) {
        updateData.discard_pile = JSON.stringify([
            ...gameState.discardPile,
            ...cardsToDiscard
        ]);
    }

    if (lastPlayedCard.value in SPECIAL_CARDS) {
        const action = SPECIAL_CARDS[lastPlayedCard.value];

        switch (action) {
            case 'change_suit':
                if (lastPlayedCard.value === '8' || lastPlayedCard.value === 'J') {
                    if (gameState.lastSuitChangeMethod !== lastPlayedCard.value) {
                        gameState.lastSuitChangeMethod = lastPlayedCard.value;
                        gameState.pendingAction = 'change_suit';
                        updateData.pending_action = 'change_suit';
                        updateData.current_player = users.phone;
                        updateData.last_suit_change_method = lastPlayedCard.value;
                        delete updateData.current_suit;
                        showSuitSelector();
                    } else {
                        updateData.current_player = opponentPhone;
                        delete updateData.current_suit;
                    }
                }
                break;
            case 'skip_turn':
                updateData.current_player = users.phone;
                break;
            case 'draw_two':
                let drawCount = 2;
                if (gameState.pendingAction === 'draw_two') {
                    drawCount = (gameState.pendingActionData || 2) + 2;
                }
                gameState.pendingAction = 'draw_two';
                updateData.pending_action = 'draw_two';
                updateData.pending_action_data = drawCount;
                updateData.current_player = opponentPhone;
                break;
            case 'spade_ace_only':
                if (lastPlayedCard.suit === 'spades' && lastPlayedCard.value === 'A') {
                    gameState.pendingAction = 'draw_two';
                    updateData.pending_action = 'draw_two';
                    updateData.pending_action_data = 5;
                    updateData.current_player = opponentPhone;
                } else {
                    updateData.current_player = opponentPhone;
                }
                break;
            case 'play_multiple':
                const playingWithSpecial = cardsToPlay.some(card =>
                    card.value === '8' || card.value === 'J'
                );
                if (playingWithSpecial) {
                    const specialCard = cardsToPlay.find(card =>
                        (card.value === '8' || card.value === 'J') &&
                        gameState.lastSuitChangeMethod !== card.value
                    );
                    if (specialCard) {
                        gameState.lastSuitChangeMethod = specialCard.value;
                        gameState.pendingAction = 'change_suit';
                        updateData.pending_action = 'change_suit';
                        updateData.current_player = users.phone;
                        updateData.last_suit_change_method = specialCard.value;
                        showSuitSelector();
                    } else {
                        updateData.current_player = opponentPhone;
                    }
                } else {
                    if (cardsToPlay.length === 1 && lastPlayedCard.value === '7') {
                        updateData.current_player = users.phone;
                    } else {
                        updateData.current_player = opponentPhone;
                    }
                }
                break;
        }
    } else {
        updateData.current_player = opponentPhone;
        gameState.lastSuitChangeMethod = null;
        updateData.last_suit_change_method = null;
    }

    if (isCreator) {
        updateData.creator_hand = JSON.stringify(gameState.playerHand);
    } else {
        updateData.opponent_hand = JSON.stringify(gameState.playerHand);
    }

    if (gameState.playerHand.length === 0) {
        updateData.status = 'finished';
        updateData.winner = users.phone;
        gameState.status = 'finished';

        await handleGameWin(users.phone);
        showGameResult(true, Math.floor(gameState.betAmount * 1.8));
    }

    const { error } = await supabase
        .from('card_games')
        .update(updateData)
        .eq('code', gameState.gameCode);

    if (error) throw error;

    updateGameUI();
}

// ... [Previous utility functions like hasCardsOfSuit, playCard, drawCard, showSevenCardDialog remain unchanged]

function updateGameUI() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = users.phone === gameState.currentPlayer;
    
    if (playerNameEl) playerNameEl.textContent = users.username || 'You';
    if (opponentNameEl) opponentNameEl.textContent = gameState.opponent.username || 'Waiting...';
    
    if (playerAvatarEl) {
        playerAvatarEl.style.backgroundColor = generateAvatarColor(users.username);
        playerAvatarEl.textContent = users.username ? users.username.charAt(0).toUpperCase() : 'Y';
    }
    
    if (opponentAvatarEl) {
        opponentAvatarEl.style.backgroundColor = generateAvatarColor(gameState.opponent.username);
        opponentAvatarEl.textContent = gameState.opponent.username ? 
            gameState.opponent.username.charAt(0).toUpperCase() : 'O';
    }
    
    if (currentSuitDisplay) {
        currentSuitDisplay.textContent = gameState.currentSuit 
            ? `${gameState.currentSuit.toUpperCase()}` 
            : 'Not set';
        currentSuitDisplay.className = `suit-${gameState.currentSuit}`;
    }
    
    if (opponentHandCountEl) {
        opponentHandCountEl.textContent = `${gameState.opponentHandCount} cards`;
    }
    
    if (drawCardBtn) {
        drawCardBtn.style.display = isMyTurn && !gameState.hasDrawnThisTurn ? 'block' : 'none';
    }
    
    if (passTurnBtn) {
        passTurnBtn.style.display = isMyTurn && gameState.hasDrawnThisTurn ? 'block' : 'none';
    }
    
    renderDiscardPile();
    renderPlayerHand();
    
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

// ... [Previous functions like passTurn, showSuitSelector, setupEventListeners, generateAvatarColor remain unchanged]

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

// ... [Previous functions like renderDiscardPile, safeParseJSON, displayMessage, shuffleArray remain unchanged]

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
                        await handleBetDeduction();
                    }
                    
                    if (payload.new.status === 'finished') {
                        const isWinner = payload.new.winner === users.phone;
                        const amount = Math.floor(gameState.betAmount * 1.8);
                        await handleGameWin(payload.new.winner);
                        showGameResult(isWinner, amount);
                    }
                    
                    updateGameUI();
                } catch (error) {
                    console.error('Error processing realtime update:', error);
                }
            }
        )
        .subscribe();
        
    return channel;
}

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
        
        gameState.status = gameData.status;
        gameState.currentPlayer = gameData.current_player;
        gameState.currentSuit = gameData.current_suit;
        gameState.lastCard = gameData.last_card ? safeParseJSON(gameData.last_card) : null;
        gameState.betAmount = gameData.bet;
        gameState.mustPlaySuit = gameData.must_play_suit || false;
        gameState.currentSuitToMatch = gameData.current_suit_to_match || '';
        gameState.hasDrawnThisTurn = gameData.has_drawn_this_turn || false;
        gameState.discardPile = gameData.discard_pile ? safeParseJSON(gameData.discard_pile) : [];
        
        if (gameState.playerRole === 'creator') {
            gameState.playerHand = safeParseJSON(gameData.creator_hand) || [];
            gameState.opponentHandCount = safeParseJSON(gameData.opponent_hand)?.length || 0;
        } else {
            gameState.playerHand = safeParseJSON(gameData.opponent_hand) || [];
            gameState.opponentHandCount = safeParseJSON(gameData.creator_hand)?.length || 0;
        }
        
        gameState.creator = {
            username: gameData.creator_username,
            phone: gameData.creator_phone
        };
        
        if (gameData.opponent_phone) {
            gameState.opponent = {
                username: gameData.opponent_username,
                phone: gameData.opponent_phone
            };
            await handleBetDeduction();
        }
        
        if (gameData.pending_action) {
            gameState.pendingAction = gameData.pending_action;
            gameState.pendingActionData = gameData.pending_action_data;
        }
        gameState.lastSuitChangeMethod = gameData.last_suit_change_method;

        if (gameData.status === 'finished') {
            const isWinner = gameData.winner === users.phone;
            await handleGameWin(gameData.winner);
            showGameResult(isWinner, Math.floor(gameState.betAmount * 1.8));
        }
        
        updateGameUI();
        
    } catch (error) {
        console.error('Error loading game:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error loading game';
        setTimeout(() => window.location.href = '/', 3000);
    }
}

// --- Initialize Game ---
document.addEventListener('DOMContentLoaded', async () => {
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

    const missingElements = Object.entries(requiredElements)
        .filter(([name, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements.join(', '));
        if (gameStatusEl) gameStatusEl.textContent = 'Game setup error - missing elements';
    }

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
