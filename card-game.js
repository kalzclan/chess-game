import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Sound Effects ---
const soundEffects = {
    cardPlay: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-playing-card-put-down-1129.mp3'),
    cardDraw: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-card-drawing-1925.mp3'),
    win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'),
    lose: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3'),
    notification: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-interface-hint-notification-911.mp3')
};

// Set volume for sounds
Object.values(soundEffects).forEach(sound => {
    sound.volume = 0.3;
});

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
        isSuitChangeBlocked: false // Add this new property

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

        updateGameUI();

    } catch (error) {
        console.error('Error loading game:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error loading game';
        setTimeout(() => window.location.href = '/', 3000);
    }
}

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
                    gameState.isSuitChangeBlocked = payload.new.is_suit_change_blocked || false;

                    if (payload.new.last_card) {
                        gameState.lastCard = safeParseJSON(payload.new.last_card);
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

                    updateGameUI();
                } catch (error) {
                    console.error('Error processing realtime update:', error);
                }
            }
        )
        .subscribe();

    return channel;
}

function canPlayCard(card) {
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
        // Can still play 8/J as regular cards without changing suit
        if (card.value === '8' || card.value === 'J') {
            // Check if this is a regular play (not changing suit)
            return card.suit === gameState.currentSuitToMatch || 
                   card.value === gameState.lastCard.value;
        }
        return card.suit === gameState.currentSuitToMatch;
    }

    // Handle 8 and J - can only change suit if not blocked
    if (card.value === '8' || card.value === 'J') {
        // Check if suit change is blocked
        if (gameState.isSuitChangeBlocked) {
            // Can only play as regular card matching suit or value
            return card.suit === gameState.currentSuit || 
                   card.value === gameState.lastCard.value;
        }
        return true; // Can always play to change suit if not blocked
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

async function playCard(cardIndex) {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            soundEffects.notification.play();
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
        soundEffects.cardPlay.play();
        
    } catch (error) {
        console.error('Error playing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error playing card';
    }
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

    // Use the last card played for game state
    const lastPlayedCard = cardsToPlay[cardsToPlay.length - 1];

    const updateData = {
        last_card: JSON.stringify(lastPlayedCard),
        current_suit: lastPlayedCard.suit,
        updated_at: new Date().toISOString(),
        must_play_suit: false,
        current_suit_to_match: '',
        has_drawn_this_turn: false,
        is_suit_change_blocked: false // Default to false unless changed
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
                    // Check if this is a suit change or regular play
                    const isChangingSuit = !gameState.mustPlaySuit || 
                                         (gameState.mustPlaySuit && 
                                          lastPlayedCard.suit !== gameState.currentSuitToMatch);
                    
                    if (isChangingSuit && !gameState.isSuitChangeBlocked) {
                        // This is a suit change
                        gameState.lastSuitChangeMethod = lastPlayedCard.value;
                        gameState.pendingAction = 'change_suit';
                        updateData.pending_action = 'change_suit';
                        updateData.current_player = users.phone;
                        updateData.last_suit_change_method = lastPlayedCard.value;
                        updateData.is_suit_change_blocked = true; // Block opponent from changing suit
                        delete updateData.current_suit;
                        showSuitSelector();
                    } else {
                        // This is a regular play of 8/J
                        updateData.current_player = opponentPhone;
                        updateData.must_play_suit = true;
                        updateData.current_suit_to_match = gameState.currentSuit;
                        updateData.is_suit_change_blocked = false; // Reset the block
                    }
                } else {
                    updateData.current_player = opponentPhone;
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
                        updateData.is_suit_change_blocked = true;
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
        // For normal cards, reset the suit change block
        updateData.current_player = opponentPhone;
        updateData.is_suit_change_blocked = false;
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
    }

    // Update game in database
    const { error } = await supabase
        .from('card_games')
        .update(updateData)
        .eq('code', gameState.gameCode);

    if (error) throw error;

    updateGameUI();
}
async function drawCard() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            soundEffects.notification.play();
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
        soundEffects.cardDraw.play();
        
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

async function passTurn() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            soundEffects.notification.play();
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
        soundEffects.notification.play();
        
    } catch (error) {
        console.error('Error passing turn:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error passing turn';
    }
}

// --- UI Rendering Functions ---
function renderCardHTML(card, {isPlayable = false} = {}) {
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

function updateGameUI() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = users.phone === gameState.currentPlayer;
    const isCreator = gameState.playerRole === 'creator';

    // Player info
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

    if (playerNameEl) playerNameEl.textContent = users.username || 'You';
    if (playerAvatarEl) {
        playerAvatarEl.style.backgroundColor = generateAvatarColor(users.username);
        playerAvatarEl.textContent = users.username ? users.username.charAt(0).toUpperCase() : 'Y';
    }
    
    // Game state
    if (currentSuitDisplay) {
        currentSuitDisplay.textContent = gameState.currentSuit 
            ? `${gameState.currentSuit.toUpperCase()}` 
            : 'Not set';
        currentSuitDisplay.className = `suit-${gameState.currentSuit}`;
    }
    
    if (opponentHandCountEl) {
        opponentHandCountEl.textContent = `${gameState.opponentHandCount} cards`;
    }
    
    // Action buttons
    if (drawCardBtn) {
        drawCardBtn.style.display = isMyTurn && !gameState.hasDrawnThisTurn ? 'block' : 'none';
    }
    
    if (passTurnBtn) {
        passTurnBtn.style.display = isMyTurn && gameState.hasDrawnThisTurn ? 'block' : 'none';
    }
    
    // Render game elements
    if (gameState.status !== 'waiting') {
        renderPlayerHand();
        renderDiscardPile();
    } else {
       if (playerHandEl) playerHandEl.innerHTML = '<div class="waiting-message"></div>';
        if (discardPileEl) discardPileEl.innerHTML = '';
    }
    
    // Game status
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
// --- Helper for suit SVGs (moved to top of file for global access) ---
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

// Then keep all the rest of your existing code below...
// --- Dialog Functions ---
async function showSevenCardDialog(initialCardIndex) {
    const initialCard = gameState.playerHand[initialCardIndex];
    
    const specialCards = gameState.playerHand.filter(
        (card, index) => (card.value === '8' || card.value === 'J') && index !== initialCardIndex && card.suit !== initialCard.suit
    );
    const sameSuitCards = gameState.playerHand.filter(
        (card, index) => card.suit === initialCard.suit && index !== initialCardIndex
    );
    
    if (specialCards.length === 0 && sameSuitCards.length === 0) {
        await processCardPlay([initialCard]);
        return;
    }
    
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
    
    const selectedIndices = new Set([initialCardIndex]);
    
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
    
    return new Promise((resolve) => {
         modal.querySelector('#play-selected-cards').addEventListener('click', async () => {
            const cardsToPlay = Array.from(selectedIndices).map(i => gameState.playerHand[i]);
            modal.remove();
            await processCardPlay(cardsToPlay);
            soundEffects.cardPlay.play();
            resolve();
        });
        
        modal.querySelector('#play-single-seven').addEventListener('click', async () => {
            modal.remove();
            await processCardPlay([initialCard]);
            soundEffects.cardPlay.play();
            resolve();
        });
    });
}

function showSuitSelector() {
    const modal = document.createElement('div');
    modal.className = 'modern-modal-overlay';
    modal.innerHTML = `
      <div class="modern-modal">
        <h2 class="modal-title">Pick a Suit</h2>
        <div class="modern-suit-options">
          ${SUITS.map(suit => `
            <button class="modern-suit-btn ${suit}" data-suit="${suit}" style="display:flex;align-items:center;gap:9px;">
              ${getSuitSVG(suit)}
              <span style="font-weight:600;">${suit[0].toUpperCase()+suit.slice(1)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    injectModernDialogCSS();

    modal.querySelectorAll('.modern-suit-btn').forEach(btn => {
        btn.onclick = async () => {
            const selectedSuit = btn.dataset.suit;
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
                soundEffects.notification.play();
            } catch (error) {
                console.error('Error selecting suit:', error);
            }
            modal.remove();
        };
    });
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
    
    // Play appropriate sound
    if (isWinner) {
        soundEffects.win.play();
    } else {
        soundEffects.lose.play();
    }
    
    const closeBtn = resultModal.querySelector('#result-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            resultModal.remove();
            window.location.href = 'home.html';
        });
    }
}

// --- Helper Functions ---
function injectModernDialogCSS() {
  if (document.getElementById('modern-dialog-css')) return;
  const style = document.createElement('style');
  style.id = 'modern-dialog-css';
  style.textContent = `
  .modern-modal-overlay {
    background: rgba(34, 36, 38, 0.46);
    position: fixed; z-index: 1999; left: 0; top: 0; width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    animation: fadein 0.12s;
  }
  .modern-modal {
    background: #fff; border-radius: 18px; min-width: 290px; max-width: 94vw;
    box-shadow: 0 10px 38px #0b2b1f0f, 0 4px 18px #0b2b1f28;
    padding: 32px 24px 18px 24px; position: relative; font-family: "Inter",sans-serif;
    text-align: center; animation: popup-in 0.17s;
  }
  .modal-title { font-size: 1.4em; color: #173e25; font-weight: 700; margin-bottom: 11px; }
  .modal-sub { color: #4e5b5c; font-size: 1em; margin-bottom: 10px; }
  .modern-card-chip-list { display: flex; flex-wrap: wrap; gap: 13px; justify-content: center; margin: 13px 0 15px; }
  .modern-card-chip-option { cursor: pointer; transition: transform .13s, box-shadow .13s; }
  .modern-card-chip-option.selected, .modern-card-chip-option:hover { box-shadow: 0 2px 13px #43a04733; transform: scale(1.07); }
  .modern-card-chip.hearts { border:1.5px solid #d32f2f; }
  .modern-card-chip.diamonds { border:1.5px solid #e57373; }
  .modern-card-chip.clubs { border:1.5px solid #388e3c; }
  .modern-card-chip.spades { border:1.5px solid #263238; }
  .modern-card-chip-title { vertical-align:middle; display:inline-block; }
  .modern-dialog-actions { display: flex; gap: 10px; margin-top: 13px; justify-content: center; }
  .modern-btn {
    border: none; outline: none; border-radius: 9px;
    padding: 9px 18px; font-size: 1em; font-weight: 600; background: #e0e0e0; color: #173e25;
    cursor: pointer; transition: background 0.13s, color 0.13s;
  }
  .modern-btn.primary { background: #43a047; color: #fff; }
  .modern-btn.primary:hover { background: #388e3c; }
  .modern-btn:hover { background: #c8c8c8; }
  .modern-suit-options { display:flex; flex-wrap:wrap; gap:14px; margin:18px 0 0 0; justify-content:center; }
  .modern-suit-btn {
    border-radius:10px; border:none; background:#e8f5e9; padding:13px 19px 13px 15px; font-size:1.15em;
    box-shadow:0 2px 6px #43a04722; cursor:pointer; transition:box-shadow .13s,background .13s;
    color:#173e25; outline: none; min-width: 96px; min-height: 51px; justify-content:center;
  }
  .modern-suit-btn.hearts { background:#ffeaea; color:#d32f2f; }
  .modern-suit-btn.diamonds { background:#e8f0fe; color:#1565c0; }
  .modern-suit-btn.clubs { background:#e8f5e9; color:#388e3c; }
  .modern-suit-btn.spades { background:#ececec; color:#263238; }
  .modern-suit-btn:hover { box-shadow:0 3px 18px #43a04722; background:#d0f5e6; }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popup-in { from { transform: scale(0.93); opacity: 0.7; } to { transform: scale(1); opacity:1; } }
  `;
  document.head.appendChild(style);
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

function hasCardsOfSuit(suit) {
    return gameState.playerHand.some(card => card.suit === suit);
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

// Inject card styles
const cardStyles = document.createElement('style');
cardStyles.textContent = `
.card {
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
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    transition: transform 0.13s, box-shadow 0.13s, filter 0.13s;
    user-select: none;
    overflow: visible;
}

.card.playable {
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(76,175,80,0.13), 0 1.5px 8px rgba(50,150,50,0.06);
}

.card.playable:active,
.card.playable:focus {
    filter: brightness(0.97) drop-shadow(0 0 6px #4caf5044);
    transform: scale(1.04);
    z-index: 20;
}

.card.hearts, .card.diamonds {
    color: #d32f2f;
}

.card.clubs, .card.spades {
    color: #263238;
}

.card-value {
    font-size: 15px;
    font-weight: bold;
    text-shadow: 0px 1px 0px white, 0px 1px 3px #d1bfa7;
}

.card-value.top {
    align-self: flex-start;
}

.card-value.bottom {
    align-self: flex-end;
    transform: rotate(180deg);
}

.player-hand-scroll {
    display: flex;
    overflow-x: auto;
    padding: 10px 0;
    width: 100%;
    scrollbar-width: thin;
}

.player-hand-cards {
    display: flex;
    gap: 8px;
    padding: 0 10px;
}

.discard-pile-count {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
}

@media (min-width: 400px) {
    .card {
        width: 72px;
        height: 110px;
    }
}

@media (max-width: 350px) {
    .card {
        width: 48px;
        height: 72px;
    }
}
`;
document.head.appendChild(cardStyles);
