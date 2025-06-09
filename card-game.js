import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

const soundEffects = {
    cardPlay: new Audio('cardplay.mp3'),
    cardDraw: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-card-slide-fast-2186.mp3'),
    win: new Audio('win.mp3'),
    lose: new Audio('fail.mp3'),
    notification: new Audio('nottification.mp3'),
    opponentPlay: new Audio('cardplay.mp3'),
    specialCard: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magical-sparkle-win-1936.mp3'),
    cardFlip: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-card-flip-2003.mp3'),
    cardShuffle: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-cards-shuffle-2185.mp3')
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
const opponentHandEl = document.getElementById('opponent-hand');
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
    opponentHand: [], // Add this to track opponent cards
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
    isSuitChangeBlocked: false,
    winRecorded: false,
    lastCardChangeTimestamp: null,
    animationQueue: [] // Add animation queue
};

// --- Initialize Game ---
document.addEventListener('DOMContentLoaded', async () => {
    // Verify required DOM elements
    const requiredElements = {
        backBtn,
        gameCodeDisplay,
        currentSuitDisplay,
        playerHandEl,
        opponentHandEl,
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

async function loadGameData() {
    try {
        const { data: gameData, error } = await supabase
            .from('card_games')
            .select('*')
            .eq('code', gameState.gameCode)
            .single();

        if (error) throw error;
        if (!gameData) {
            displayMessage(gameStatusEl, 'Game not found or already ended.', 'error');
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        const users = JSON.parse(localStorage.getItem('user')) || {};
        gameState.playerRole = gameData.creator_phone === users.phone ? 'creator' : 'opponent';

        // Store previous last card before updating
        const previousLastCard = gameState.lastCard;
        const previousTimestamp = gameState.lastCardChangeTimestamp;

        // Update game state from database
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
        gameState.isSuitChangeBlocked = gameData.is_suit_change_blocked || false;
        gameState.lastCardChangeTimestamp = gameData.updated_at;

        // Set player hands
        if (gameState.playerRole === 'creator') {
            gameState.playerHand = safeParseJSON(gameData.creator_hand) || [];
            gameState.opponentHand = safeParseJSON(gameData.opponent_hand) || [];
            gameState.opponentHandCount = gameState.opponentHand.length;
        } else {
            gameState.playerHand = safeParseJSON(gameData.opponent_hand) || [];
            gameState.opponentHand = safeParseJSON(gameData.creator_hand) || [];
            gameState.opponentHandCount = gameState.opponentHand.length;
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

        // Check if this is an opponent's card play
        if (gameState.lastCard && 
            previousLastCard && 
            JSON.stringify(previousLastCard) !== JSON.stringify(gameState.lastCard) &&
            previousTimestamp !== gameState.lastCardChangeTimestamp) {
            
            const wasOpponentTurn = gameData.current_player !== users.phone;
            
            if (wasOpponentTurn) {
                // Play appropriate sound for opponent's move
                if (gameState.lastCard.value === 'A' && gameState.lastCard.suit === 'spades') {
                    soundEffects.specialCard.play();
                } else if (gameState.lastCard.value in SPECIAL_CARDS) {
                    soundEffects.specialCard.play();
                } else {
                    soundEffects.opponentPlay.play();
                }
            }
        }

        // Check for pending actions
        if (gameData.pending_action) {
            gameState.pendingAction = gameData.pending_action;
            gameState.pendingActionData = gameData.pending_action_data;
        }

        // Handle bet deduction if game is ongoing and opponent exists
        if (gameData.opponent_phone && gameData.status === 'ongoing' && !gameState.betDeducted) {
            try {
                await recordTransaction({
                    player_phone: users.phone,
                    transaction_type: 'bet',
                    amount: -gameData.bet,
                    description: `Bet for card game ${gameState.gameCode}`,
                    status: 'completed'
                });
                
                const betDeductionKey = `betDeducted_${gameState.gameCode}`;
                localStorage.setItem(betDeductionKey, 'true');
                gameState.betDeducted = true;
                
                showNotification(`Bet of ${gameData.bet} ETB deducted`, 'info');
            } catch (error) {
                console.error('Error deducting bet:', error);
                displayMessage(gameStatusEl, 'Error deducting bet. Please refresh.', 'error');
            }
        }

        // Handle game results if game is finished
        if (gameData.status === 'finished') {
            const isWinner = gameData.winner === users.phone;
            const amount = Math.floor(gameData.bet * 1.8);
            
            if (!document.querySelector('.game-result-modal.active')) {
                showGameResult(isWinner, amount);
            }
            
            if (isWinner && !gameState.winRecorded) {
                await recordTransaction({
                    player_phone: users.phone,
                    transaction_type: 'win',
                    amount: amount,
                    description: `Won card game ${gameState.gameCode}`,
                    status: 'completed'
                });
                gameState.winRecorded = true;
            }
        }

        updateGameUI();

    } catch (error) {
        console.error('Error loading game:', error);
        displayMessage(gameStatusEl, 'Error loading game data', 'error');
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
                    const users = JSON.parse(localStorage.getItem('user')) || {};
                    const previousLastCard = gameState.lastCard;
                    const previousTimestamp = gameState.lastCardChangeTimestamp;
                    const previousOpponentHandCount = gameState.opponentHandCount;
                    
                    // Check if opponent just joined and we need to deduct bet
                    if (payload.new.opponent_phone && 
                        payload.new.status === 'ongoing' && 
                        !gameState.opponent.phone &&
                        !gameState.betDeducted) {
                        
                        await recordTransaction({
                            player_phone: users.phone,
                            transaction_type: 'bet',
                            amount: -payload.new.bet,
                            description: `Bet for card game ${gameState.gameCode}`,
                            status: 'completed'
                        });
                        
                        gameState.betDeducted = true;
                    }

                    // Update game state
                    gameState.status = payload.new.status;
                    gameState.currentPlayer = payload.new.current_player;
                    gameState.currentSuit = payload.new.current_suit;
                    gameState.hasDrawnThisTurn = payload.new.has_drawn_this_turn || false;
                    gameState.lastSuitChangeMethod = payload.new.last_suit_change_method;
                    gameState.isSuitChangeBlocked = payload.new.is_suit_change_blocked || false;
                    gameState.lastCardChangeTimestamp = payload.new.updated_at;

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

                    const isCreator = gameState.playerRole === 'creator';

                    if (isCreator) {
                        gameState.playerHand = safeParseJSON(payload.new.creator_hand) || [];
                        gameState.opponentHand = safeParseJSON(payload.new.opponent_hand) || [];
                        gameState.opponentHandCount = gameState.opponentHand.length;
                    } else {
                        gameState.playerHand = safeParseJSON(payload.new.opponent_hand) || [];
                        gameState.opponentHand = safeParseJSON(payload.new.creator_hand) || [];
                        gameState.opponentHandCount = gameState.opponentHand.length;
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

                    // Check for opponent card play
                    if (payload.new.last_card && 
                        previousTimestamp !== payload.new.updated_at &&
                        (
                            !previousLastCard || 
                            JSON.stringify(previousLastCard) !== payload.new.last_card
                        )) {
                        
                        const newCard = safeParseJSON(payload.new.last_card);
                        const isOpponentPlay = payload.new.current_player === users.phone;
                        
                        if (isOpponentPlay && newCard) {
                            console.log('Opponent played:', newCard);
                            
                            // Animate opponent card play
                            animateOpponentCardPlay(newCard);
                            
                            // Play appropriate sound for opponent's move
                            if (newCard.value === 'A' && newCard.suit === 'spades') {
                                soundEffects.specialCard.play();
                            } else if (newCard.value in SPECIAL_CARDS) {
                                soundEffects.specialCard.play();
                            } else {
                                soundEffects.opponentPlay.play();
                            }
                        }
                    }

                    // Check if opponent drew cards
                    if (gameState.opponentHandCount > previousOpponentHandCount) {
                        const cardsDrawn = gameState.opponentHandCount - previousOpponentHandCount;
                        animateOpponentCardDraw(cardsDrawn);
                        soundEffects.cardDraw.play();
                    }

                    if (payload.new.status === 'finished') {
                        const isWinner = payload.new.winner === users.phone;
                        const amount = Math.floor(gameState.betAmount * 1.8);
                        
                        if (isWinner) {
                            await recordTransaction({
                                player_phone: users.phone,
                                transaction_type: 'win',
                                amount: amount,
                                description: `Won card game ${gameState.gameCode}`,
                                status: 'completed'
                            });
                        }
                        
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

    // Handle 8 and J - can always be played regardless of suit when blocked
    if (card.value === '8' || card.value === 'J') {
        if (gameState.isSuitChangeBlocked) {
            return true;
        }
        return true;
    }

    // If must play specific suit due to previous 8 or J
    if (gameState.mustPlaySuit && gameState.currentSuitToMatch) {
        if (card.value === '8' || card.value === 'J') {
            return card.suit === gameState.currentSuitToMatch || 
                   card.value === gameState.lastCard.value;
        }
        return card.suit === gameState.currentSuitToMatch;
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

    // Handle Ace of Spades special rule
    if (card.value === 'A' && card.suit === 'spades') {
        return gameState.lastCard.suit === 'spades' || 
               gameState.lastCard.value === 'A';
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
        
        // Animate card play
        animateCardPlay(cardIndex);
        
        // Handle 7 card - show selection dialog
        if (card.value === '7') {
            if(card.suit === gameState.currentSuit ){
                await showSevenCardDialog(cardIndex);
            } else {
                const initialCard = gameState.playerHand[cardIndex];
                await processCardPlay([initialCard]);
            }
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
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
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
            is_suit_change_blocked: false
        };

        // Add played cards to discard pile (except last card)
        const cardsToDiscard = cardsToPlay.slice(0, -1);
        if (cardsToDiscard.length > 0) {
            updateData.discard_pile = JSON.stringify([
                ...gameState.discardPile,
                ...cardsToDiscard
            ]);
        }

        // Play special card sound if applicable
        if (lastPlayedCard.value in SPECIAL_CARDS) {
            soundEffects.specialCard.play();
        }

        // Handle special cards and combinations
        if (cardsToPlay.length > 1 && cardsToPlay.some(c => c.value === '7')) {
            const specialCards = cardsToPlay.filter(c => 
                (c.value === '8' || c.value === 'J') && c !== lastPlayedCard
            );

            if (specialCards.length > 0) {
                const specialCard = specialCards[0];
                gameState.lastSuitChangeMethod = specialCard.value;
                gameState.pendingAction = 'change_suit';
                updateData.pending_action = 'change_suit';
                updateData.current_player = users.phone;
                updateData.last_suit_change_method = specialCard.value;
                updateData.is_suit_change_blocked = true;
                delete updateData.current_suit;
                showSuitSelector();
            } else if (lastPlayedCard.value === '7') {
                updateData.current_player = users.phone;
            } else {
                updateData.current_player = opponentPhone;
            }
        } 
        else if (lastPlayedCard.value in SPECIAL_CARDS) {
            const action = SPECIAL_CARDS[lastPlayedCard.value];

            switch (action) {
                case 'change_suit':
                    if (lastPlayedCard.value === '8' || lastPlayedCard.value === 'J') {
                        const isChangingSuit = !gameState.mustPlaySuit || 
                                            (gameState.mustPlaySuit && 
                                             lastPlayedCard.suit !== gameState.currentSuitToMatch);
                        
                        if (isChangingSuit && !gameState.isSuitChangeBlocked) {
                            gameState.lastSuitChangeMethod = lastPlayedCard.value;
                            gameState.pendingAction = 'change_suit';
                            updateData.pending_action = 'change_suit';
                            updateData.current_player = users.phone;
                            updateData.last_suit_change_method = lastPlayedCard.value;
                            updateData.is_suit_change_blocked = true;
                            delete updateData.current_suit;
                            showSuitSelector();
                        } else {
                            updateData.current_player = opponentPhone;
                            updateData.current_suit = gameState.currentSuit;
                            updateData.is_suit_change_blocked = false;
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
            }
        } else {
            updateData.current_player = opponentPhone;
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
            showGameResult(true, winnings);
        }

        // Update game in database
        const { error } = await supabase
            .from('card_games')
            .update(updateData)
            .eq('code', gameState.gameCode);

        if (error) throw error;

        updateGameUI();
    } catch (error) {
        console.error('Error processing card play:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error playing card';
    }
}

let isDrawing = false;

async function drawCard() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            soundEffects.notification.play();
            return;
        }

        if (isDrawing) {
            displayMessage(gameStatusEl, "Already drawing cards...", 'info');
            return;
        }

        isDrawing = true;
        if (drawCardBtn) {
            drawCardBtn.disabled = true;
            drawCardBtn.textContent = 'Drawing...';
            drawCardBtn.style.cursor = 'wait';
        }

        let drawCount = 1;
        if (gameState.pendingAction === 'draw_two') {
            drawCount = gameState.pendingActionData || 2;
            gameState.pendingAction = null;
            gameState.pendingActionData = null;
        }

        const isCreator = gameState.playerRole === 'creator';
        
        const { data: gameData, error: fetchError } = await supabase
            .from('card_games')
            .select('deck, discard_pile, last_card')
            .eq('code', gameState.gameCode)
            .single();
            
        if (fetchError) throw fetchError;
        
        let deck = safeParseJSON(gameData.deck) || [];
        const cardsToAdd = [];
        
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
                
                soundEffects.cardShuffle.play();
            }
            
            if (deck.length > 0) {
                cardsToAdd.push(deck.pop());
            }
        }
        
        // Animate drawing cards
        animateCardDraw(cardsToAdd);
        
        gameState.playerHand = [...gameState.playerHand, ...cardsToAdd];
        soundEffects.cardDraw.play();
        
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
        
    } catch (error) {
        console.error('Error drawing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error drawing card';
    } finally {
        isDrawing = false;
        if (drawCardBtn) {
            drawCardBtn.disabled = false;
            drawCardBtn.textContent = 'Draw Card';
            drawCardBtn.style.cursor = 'pointer';
        }
        updateGameUI();
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

// --- Enhanced UI Rendering Functions ---
function renderCardHTML(card, {isPlayable = false, isOpponent = false, isBack = false} = {}) {
    if (isBack) {
        return `
        <div class="card-back">
            <div class="card-back-pattern"></div>
        </div>
        `;
    }

    function getSuitSVG(suit) {
        switch (suit) {
            case 'hearts':
                return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>`;
            case 'diamonds':
                return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 12l-7-10-7 10 7 10 7-10z"/>
                </svg>`;
            case 'clubs':
                return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9C22.1 9 23 9.9 23 11C23 12.1 22.1 13 21 13C19.9 13 19 12.1 19 11C19 9.9 19.9 9 21 9M3 9C4.1 9 5 9.9 5 11C5 12.1 4.1 13 3 13C1.9 13 1 12.1 1 11C1 9.9 1.9 9 3 9M15.5 6.5C16.6 6.5 17.5 7.4 17.5 8.5C17.5 9.6 16.6 10.5 15.5 10.5C14.4 10.5 13.5 9.6 13.5 8.5C13.5 7.4 14.4 6.5 15.5 6.5M8.5 6.5C9.6 6.5 10.5 7.4 10.5 8.5C10.5 9.6 9.6 10.5 8.5 10.5C7.4 10.5 6.5 9.6 6.5 8.5C6.5 7.4 7.4 6.5 8.5 6.5M12 13.5L10.5 15L12 16.5L13.5 15L12 13.5Z"/>
                </svg>`;
            case 'spades':
                return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L13.09 8.26L22 9L17.5 13.74L18.18 22.5L12 19.77L5.82 22.5L6.5 13.74L2 9L10.91 8.26L12 2M12 15.4L16.15 18.18L15.5 14.82L18.5 12.32L15.23 12.1L12 8.1L8.77 12.1L5.5 12.32L8.5 14.82L7.85 18.18L12 15.4Z"/>
                </svg>`;
            default:
                return '';
        }
    }

    return `
    <div class="card ${card.suit} ${isPlayable ? 'playable' : ''} ${isOpponent ? 'opponent-card' : ''}" 
         data-suit="${card.suit}" data-value="${card.value}">
        <div class="card-value top">${card.value}</div>
        <div class="card-suit">${getSuitSVG(card.suit)}</div>
        <div class="card-value bottom">${card.value}</div>
    </div>
    `;
}

function renderPlayerHand() {
    if (!playerHandEl) return;
    
    playerHandEl.innerHTML = '';
    
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = gameState.currentPlayer === users.phone;
    
    gameState.playerHand.forEach((card, index) => {
        const isPlayable = isMyTurn && canPlayCard(card);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderCardHTML(card, { isPlayable });
        const cardEl = wrapper.firstElementChild;
        
        // Add dealing animation for new cards
        cardEl.classList.add('dealing');
        
        if (isPlayable) {
            cardEl.addEventListener('click', () => playCard(index));
        }
        playerHandEl.appendChild(cardEl);
    });
}

function renderOpponentHand() {
    if (!opponentHandEl) return;
    
    opponentHandEl.innerHTML = '';
    
    // Show opponent cards as card backs with some revealed if game allows
    for (let i = 0; i < gameState.opponentHandCount; i++) {
        const wrapper = document.createElement('div');
        
        // In a real game, you might want to show actual cards in certain situations
        // For now, we'll show card backs
        wrapper.innerHTML = renderCardHTML(null, { isBack: true, isOpponent: true });
        const cardEl = wrapper.firstElementChild;
        
        // Add slight rotation and offset for visual appeal
        const rotation = (Math.random() - 0.5) * 10;
        const offsetX = (Math.random() - 0.5) * 20;
        cardEl.style.transform = `rotate(${rotation}deg) translateX(${offsetX}px)`;
        cardEl.style.zIndex = i;
        
        opponentHandEl.appendChild(cardEl);
    }
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

    const cardsToShow = 5;
    const startIdx = Math.max(0, allCards.length - cardsToShow);
    const recentCards = allCards.slice(startIdx);

    recentCards.forEach((card, idx) => {
        const isTop = idx === recentCards.length - 1;
        const z = 100 + idx;
        const rot = isTop ? 0 : (Math.random() * 15 - 7.5);
        const xOffset = isTop ? 0 : (Math.random() * 30 - 15);
        const yOffset = isTop ? 0 : (Math.random() * 15 - 7.5);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderCardHTML(card, { isPlayable: false });
        const cardEl = wrapper.firstElementChild;
        
        cardEl.style.zIndex = z;
        cardEl.style.position = 'absolute';
        cardEl.style.left = `calc(50% + ${xOffset}px)`;
        cardEl.style.top = `calc(50% + ${yOffset}px)`;
        cardEl.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
        
        if (isTop) {
            cardEl.classList.add('floating');
        }
        
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
    pileContainer.style.width = "160px";
    pileContainer.style.height = "140px";
    pileContainer.style.margin = "0 auto";
    discardPileEl.appendChild(pileContainer);
}

// --- Animation Functions ---
function animateCardPlay(cardIndex) {
    const cardEl = playerHandEl.children[cardIndex];
    if (cardEl) {
        cardEl.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        cardEl.style.transform = 'translateY(-100px) scale(1.2) rotate(10deg)';
        cardEl.style.opacity = '0.8';
        
        setTimeout(() => {
            cardEl.style.transform = 'translateY(-200px) scale(0.8) rotate(20deg)';
            cardEl.style.opacity = '0';
        }, 300);
    }
}

function animateCardDraw(cards) {
    cards.forEach((card, index) => {
        setTimeout(() => {
            // Create temporary card element for animation
            const tempCard = document.createElement('div');
            tempCard.innerHTML = renderCardHTML(card);
            const cardEl = tempCard.firstElementChild;
            
            cardEl.style.position = 'fixed';
            cardEl.style.top = '50%';
            cardEl.style.left = '50%';
            cardEl.style.transform = 'translate(-50%, -50%) scale(0.5)';
            cardEl.style.zIndex = '1000';
            cardEl.style.opacity = '0';
            
            document.body.appendChild(cardEl);
            
            // Animate to player hand
            setTimeout(() => {
                cardEl.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                cardEl.style.transform = 'translate(-50%, 100px) scale(1)';
                cardEl.style.opacity = '1';
                
                setTimeout(() => {
                    cardEl.remove();
                }, 800);
            }, 100);
        }, index * 200);
    });
}

function animateOpponentCardPlay(card) {
    // Find a card back in opponent hand to animate
    const opponentCards = opponentHandEl.children;
    if (opponentCards.length > 0) {
        const cardToAnimate = opponentCards[Math.floor(Math.random() * opponentCards.length)];
        
        // Create a copy of the played card for animation
        const tempCard = document.createElement('div');
        tempCard.innerHTML = renderCardHTML(card);
        const cardEl = tempCard.firstElementChild;
        
        const rect = cardToAnimate.getBoundingClientRect();
        cardEl.style.position = 'fixed';
        cardEl.style.top = rect.top + 'px';
        cardEl.style.left = rect.left + 'px';
        cardEl.style.width = rect.width + 'px';
        cardEl.style.height = rect.height + 'px';
        cardEl.style.zIndex = '1000';
        cardEl.classList.add('flipping');
        
        document.body.appendChild(cardEl);
        
        // Animate to discard pile
        setTimeout(() => {
            const discardRect = discardPileEl.getBoundingClientRect();
            cardEl.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            cardEl.style.top = discardRect.top + discardRect.height/2 + 'px';
            cardEl.style.left = discardRect.left + discardRect.width/2 + 'px';
            cardEl.style.transform = 'translate(-50%, -50%) rotate(15deg)';
            
            setTimeout(() => {
                cardEl.remove();
            }, 800);
        }, 300);
        
        // Remove the card back with animation
        cardToAnimate.style.transition = 'all 0.3s ease';
        cardToAnimate.style.transform = 'scale(0)';
        cardToAnimate.style.opacity = '0';
        
        setTimeout(() => {
            if (cardToAnimate.parentNode) {
                cardToAnimate.remove();
            }
        }, 300);
    }
}

function animateOpponentCardDraw(count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            // Create card back for animation
            const tempCard = document.createElement('div');
            tempCard.innerHTML = renderCardHTML(null, { isBack: true });
            const cardEl = tempCard.firstElementChild;
            
            cardEl.style.position = 'fixed';
            cardEl.style.top = '50%';
            cardEl.style.left = '50%';
            cardEl.style.transform = 'translate(-50%, -50%) scale(0.5)';
            cardEl.style.zIndex = '1000';
            cardEl.style.opacity = '0';
            
            document.body.appendChild(cardEl);
            
            // Animate to opponent hand
            setTimeout(() => {
                const opponentRect = opponentHandEl.getBoundingClientRect();
                cardEl.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                cardEl.style.top = opponentRect.top + 'px';
                cardEl.style.left = opponentRect.left + opponentRect.width/2 + 'px';
                cardEl.style.transform = 'translate(-50%, -50%) scale(1)';
                cardEl.style.opacity = '1';
                
                setTimeout(() => {
                    cardEl.remove();
                }, 800);
            }, 100);
        }, i * 200);
    }
}

function updateGameUI() {
    const users = JSON.parse(localStorage.getItem('user')) || {};
    const isMyTurn = users.phone === gameState.currentPlayer;
    const isCreator = gameState.playerRole === 'creator';

    // Block all gameplay if game is finished
    if (gameState.status === 'finished') {
        if (playerHandEl) {
            const cards = playerHandEl.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.pointerEvents = 'none';
                card.style.opacity = '0.7';
                card.classList.remove('playable');
            });
        }
        
        if (drawCardBtn) {
            drawCardBtn.style.display = 'none';
        }
        
        if (passTurnBtn) {
            passTurnBtn.style.display = 'none';
        }
        
        if (gameStatusEl) {
            gameStatusEl.textContent = 'Game Over';
            gameStatusEl.className = 'status-game-over';
        }
        
        return;
    }

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
        opponentAvatarEl.style.background = generateAvatarGradient(name);
        opponentAvatarEl.textContent = name ? name.charAt(0).toUpperCase() : 'O';
    }

    if (playerNameEl) playerNameEl.textContent = users.username || 'You';
    if (playerAvatarEl) {
        playerAvatarEl.style.background = generateAvatarGradient(users.username);
        playerAvatarEl.textContent = users.username ? users.username.charAt(0).toUpperCase() : 'Y';
    }
    
    // Game state
    if (currentSuitDisplay) {
        const suitName = gameState.currentSuit ? gameState.currentSuit.charAt(0).toUpperCase() + gameState.currentSuit.slice(1) : 'Not set';
        currentSuitDisplay.textContent = suitName;
        currentSuitDisplay.className = `suit-${gameState.currentSuit}`;
    }
    
    if (opponentHandCountEl) {
        opponentHandCountEl.textContent = gameState.opponentHandCount;
    }
    
    // Action buttons
    if (drawCardBtn) {
        drawCardBtn.style.display = isMyTurn && !gameState.hasDrawnThisTurn ? 'block' : 'none';
        drawCardBtn.disabled = !isMyTurn || gameState.hasDrawnThisTurn || isDrawing;
        drawCardBtn.style.pointerEvents = isMyTurn && !gameState.hasDrawnThisTurn && !isDrawing ? 'auto' : 'none';
        drawCardBtn.style.opacity = isMyTurn && !gameState.hasDrawnThisTurn && !isDrawing ? '1' : '0.5';
        drawCardBtn.textContent = isDrawing ? 'Drawing...' : 'Draw Card';
        drawCardBtn.style.cursor = isDrawing ? 'wait' : 'pointer';
    }
    
    if (passTurnBtn) {
        passTurnBtn.style.display = isMyTurn && gameState.hasDrawnThisTurn ? 'block' : 'none';
        passTurnBtn.disabled = !isMyTurn || !gameState.hasDrawnThisTurn;
        passTurnBtn.style.pointerEvents = isMyTurn && gameState.hasDrawnThisTurn ? 'auto' : 'none';
        passTurnBtn.style.opacity = isMyTurn && gameState.hasDrawnThisTurn ? '1' : '0.5';
    }
    
    // Render game elements
    if (gameState.status !== 'waiting') {
        renderPlayerHand();
        renderOpponentHand();
        renderDiscardPile();
    } else {
        if (playerHandEl) playerHandEl.innerHTML = '';
        if (opponentHandEl) opponentHandEl.innerHTML = '<div class="waiting-message">Waiting for opponent to join...</div>';
        if (discardPileEl) discardPileEl.innerHTML = '';
    }
    
    // Game status
    if (gameStatusEl) {
        if (gameState.status === 'waiting') {
            gameStatusEl.textContent = 'Waiting for opponent...';
            gameStatusEl.className = 'status-waiting';
        } else {
            let statusText = isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
            
            if (isMyTurn && gameState.pendingAction === 'draw_two') {
                const drawCount = gameState.pendingActionData || 2;
                statusText = `Draw ${drawCount} cards or play a 2`;
            }
            
            if (gameState.mustPlaySuit && isMyTurn) {
                statusText += ` (Must play ${gameState.currentSuitToMatch})`;
            }
            
            gameStatusEl.textContent = statusText;
            gameStatusEl.className = isMyTurn ? 'status-your-turn' : 'status-opponent-turn';
        }
    }
}

// --- Dialog Functions ---
async function showSevenCardDialog(initialCardIndex) {
    const initialCard = gameState.playerHand[initialCardIndex];
    
    const playableCards = gameState.playerHand.filter((card, index) => {
        if (index === initialCardIndex) return false;
        return card.suit === initialCard.suit;
    });

    if (playableCards.length === 0) {
        await processCardPlay([initialCard]);
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modern-modal-overlay';
    modal.innerHTML = `
        <div class="modern-modal" style="max-width: 90vw;">
            <h3 class="modal-title">Select cards to play with ${initialCard.value} of ${initialCard.suit}</h3>
            <p class="modal-sub">Click cards to select/deselect them</p>
            
            <div class="modern-card-chip-list">
                ${playableCards.map((card, i) => {
                    const originalIndex = gameState.playerHand.findIndex(c => 
                        c.suit === card.suit && c.value === card.value);
                    return `
                        <div class="modern-card-chip ${card.suit} ${card.value}" 
                             data-index="${originalIndex}">
                            <div class="modern-card-chip-title">
                                ${card.value} ${getSuitSVG(card.suit)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="modern-dialog-actions">
                <button id="play-single-seven" class="modern-btn">
                    Play Just This 7
                </button>
                <button id="play-selected-cards" class="modern-btn primary">
                    Play Selected (${initialCard.value} of ${initialCard.suit})
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const selectedIndices = new Set();
    const cardChips = modal.querySelectorAll('.modern-card-chip');
    
    const initialCardEl = playerHandEl.children[initialCardIndex];
    if (initialCardEl) {
        initialCardEl.classList.add('highlighted-card');
    }
    
    cardChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const index = parseInt(chip.dataset.index);
            
            if (selectedIndices.has(index)) {
                chip.classList.remove('selected');
                selectedIndices.delete(index);
            } else {
                chip.classList.add('selected');
                selectedIndices.add(index);
            }
            
            const totalSelected = selectedIndices.size + 1;
            modal.querySelector('#play-selected-cards').textContent = 
                `Play Selected (${totalSelected} cards)`;
        });
    });
    
    return new Promise((resolve) => {
        modal.querySelector('#play-selected-cards').addEventListener('click', async () => {
            if (initialCardEl) initialCardEl.classList.remove('highlighted-card');
            
            const cardsToPlay = [initialCard, ...Array.from(selectedIndices)
                .map(i => gameState.playerHand[i])];
            
            modal.remove();
            await processCardPlay(cardsToPlay);
            soundEffects.cardPlay.play();
            resolve();
        });
        
        modal.querySelector('#play-single-seven').addEventListener('click', async () => {
            if (initialCardEl) initialCardEl.classList.remove('highlighted-card');
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
            <button class="modern-suit-btn ${suit}" data-suit="${suit}">
              ${getSuitSVG(suit)}
              <span>${suit.charAt(0).toUpperCase() + suit.slice(1)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

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

// --- Helper Functions ---
function getSuitSVG(suit) {
    switch (suit) {
        case 'hearts':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>`;
        case 'diamonds':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12l-7-10-7 10 7 10 7-10z"/>
            </svg>`;
        case 'clubs':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9C22.1 9 23 9.9 23 11C23 12.1 22.1 13 21 13C19.9 13 19 12.1 19 11C19 9.9 19.9 9 21 9M3 9C4.1 9 5 9.9 5 11C5 12.1 4.1 13 3 13C1.9 13 1 12.1 1 11C1 9.9 1.9 9 3 9M15.5 6.5C16.6 6.5 17.5 7.4 17.5 8.5C17.5 9.6 16.6 10.5 15.5 10.5C14.4 10.5 13.5 9.6 13.5 8.5C13.5 7.4 14.4 6.5 15.5 6.5M8.5 6.5C9.6 6.5 10.5 7.4 10.5 8.5C10.5 9.6 9.6 10.5 8.5 10.5C7.4 10.5 6.5 9.6 6.5 8.5C6.5 7.4 7.4 6.5 8.5 6.5M12 13.5L10.5 15L12 16.5L13.5 15L12 13.5Z"/>
            </svg>`;
        case 'spades':
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 8.26L22 9L17.5 13.74L18.18 22.5L12 19.77L5.82 22.5L6.5 13.74L2 9L10.91 8.26L12 2M12 15.4L16.15 18.18L15.5 14.82L18.5 12.32L15.23 12.1L12 8.1L8.77 12.1L5.5 12.32L8.5 14.82L7.85 18.18L12 15.4Z"/>
            </svg>`;
        default:
            return '';
    }
}

function setupEventListeners() {
    if (drawCardBtn) drawCardBtn.addEventListener('click', drawCard);
    if (passTurnBtn) passTurnBtn.addEventListener('click', passTurn);
}

function generateAvatarGradient(username) {
    if (!username) return 'linear-gradient(135deg, #6c757d, #495057)';
    const gradients = [
        'linear-gradient(135deg, #ff6b6b, #ee5a52)',
        'linear-gradient(135deg, #51cf66, #40c057)', 
        'linear-gradient(135deg, #fcc419, #fab005)',
        'linear-gradient(135deg, #228be6, #1c7ed6)',
        'linear-gradient(135deg, #be4bdb, #ae3ec9)',
        'linear-gradient(135deg, #fd7e14, #e8590c)',
        'linear-gradient(135deg, #20c997, #12b886)'
    ];
    const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return gradients[hash % gradients.length];
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

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

async function recordTransaction(transactionData) {
    try {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', transactionData.player_phone)
            .single();

        if (userError) throw userError;

        const balance_before = userData?.balance || 0;
        const balance_after = balance_before + transactionData.amount;

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

        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: balance_after })
            .eq('phone', transactionData.player_phone);

        if (updateError) throw updateError;

        console.log('Transaction recorded successfully:', transactionData);

    } catch (error) {
        console.error('Failed to record transaction:', error);
        
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

function showGameResult(isWinner, amount) {
    gameState.status = 'finished';
    
    if (playerHandEl) {
        const cards = playerHandEl.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.pointerEvents = 'none';
            card.style.opacity = '0.7';
        });
    }
    
    if (drawCardBtn) {
        drawCardBtn.style.display = 'none';
    }
    if (passTurnBtn) {
        passTurnBtn.style.display = 'none';
    }
    
    const resultModal = document.createElement('div');
    resultModal.className = `game-result-modal ${isWinner ? 'win' : 'lose'}`;
    resultModal.innerHTML = `
        <div class="result-content">
            <h2>${isWinner ? '🎉 Victory! 🎉' : '💔 Game Over'}</h2>
            <p>${isWinner ? `Congratulations! You won ${amount} ETB!` : 'Better luck next time!'}</p>
            <div class="transaction-details">
                <p><strong>Game Code:</strong> ${gameState.gameCode}</p>
                <p><strong>Your Bet:</strong> ${gameState.betAmount} ETB</p>
                ${isWinner ? `<p><strong>Winnings:</strong> ${amount} ETB</p>` : ''}
                <p><strong>Result:</strong> ${isWinner ? 'WIN' : 'LOSS'}</p>
            </div>
            <button id="result-close-btn">Return to Home</button>
        </div>
    `;
    
    document.body.appendChild(resultModal);
    
    if (isWinner) {
        createConfettiEffect();
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
    
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            e.stopPropagation();
        }
    });
}

function createConfettiEffect() {
    const colors = ['#ff6b6b', '#51cf66', '#fcc419', '#228be6', '#be4bdb', '#fd7e14', '#20c997'];
    const container = document.body;
    
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${Math.random() * 8 + 6}px`;
        confetti.style.height = `${Math.random() * 8 + 6}px`;
        confetti.style.animationDuration = `${Math.random() * 2 + 2.5}s`;
        confetti.style.animationDelay = `${Math.random() * 1}s`;
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 6000);
    }
}
