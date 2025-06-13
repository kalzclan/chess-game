import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

const soundEffects = {
    cardPlay: new Audio('cardplay.mp3'), // keep if you like it
    cardDraw: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-card-slide-fast-2186.mp3'),
    win: new Audio('win.mp3'),
    lose: new Audio('fail.mp3'),
    notification: new Audio('nottification.mp3'),
    opponentPlay: new Audio('cardplay.mp3'),
    specialCard: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magical-sparkle-win-1936.mp3')
};

// Set volume for sounds
Object.values(soundEffects).forEach(sound => {
    sound.volume = 0.2;
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
    betDeducted : false,
    isSuitChangeBlocked: false,
    betAmount: 0,
    winRecorded: false,
    lastCardChangeTimestamp: null // Add this to track when last card changed
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
 const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
        return; // Stop further execution if the connection fails
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
    
   if (backBtn) {
    backBtn.addEventListener('click', async () => {
        // Check if the game is finished
        if (gameState.status === 'finished') {
            // If the game is finished, simply redirect to home
            window.location.href = 'home.html';
            return;
        }

        const users = JSON.parse(localStorage.getItem('user')) || {};
        const isCreator = gameState.playerRole === 'creator';
        const opponentPhone = isCreator ? gameState.opponent.phone : gameState.creator.phone;

        // Update the game state to declare the opponent as the winner
        const updateData = {
            status: 'finished',
            winner: opponentPhone, // Set the winner as the opponent
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('card_games')
                .update(updateData)
                .eq('code', gameState.gameCode);

            if (error) throw error;

            // Redirect to home page or show a message
            window.location.href = 'home.html';
        } catch (error) {
            console.error('Error declaring winner:', error);
            displayMessage(gameStatusEl, 'Error declaring winner. Please try again.', 'error');
        }
    });
}
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

        // --- NEW BET DEDUCTION LOGIC ---
        const isCreator = gameState.playerRole === 'creator';
        const isOpponent = gameState.playerRole === 'opponent';

        if (gameData.status === 'ongoing') {
            // For creator
            if (
                isCreator &&
                gameData.creator_phone &&
                !gameData.creator_bet_deducted
            ) {
                try {
                    await recordTransaction({
                        player_phone: gameData.creator_phone,
                        transaction_type: 'bet',
                        amount: -gameData.bet,
                        description: `Bet for card game ${gameState.gameCode}`,
                        status: 'completed'
                    });
                    await supabase.from('card_games')
                        .update({ creator_bet_deducted: true })
                        .eq('code', gameState.gameCode);
                    showNotification(`Your bet of ${gameData.bet} ETB deducted`, 'info');
                } catch (error) {
                    console.error('Error deducting bet (creator):', error);
                    displayMessage(gameStatusEl, 'Error deducting bet. Please refresh.', 'error');
                }
            }
            // For opponent
            if (
                isOpponent &&
                gameData.opponent_phone &&
                !gameData.opponent_bet_deducted
            ) {
                try {
                    await recordTransaction({
                        player_phone: gameData.opponent_phone,
                        transaction_type: 'bet',
                        amount: -gameData.bet,
                        description: `Bet for card game ${gameState.gameCode}`,
                        status: 'completed'
                    });
                    await supabase.from('card_games')
                        .update({ opponent_bet_deducted: true })
                        .eq('code', gameState.gameCode);
                    showNotification(`Your bet of ${gameData.bet} ETB deducted`, 'info');
                } catch (error) {
                    console.error('Error deducting bet (opponent):', error);
                    displayMessage(gameStatusEl, 'Error deducting bet. Please refresh.', 'error');
                }
            }
        }
        // --- END BET DEDUCTION LOGIC ---

        // Continue with the rest of your loadGameData logic...
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

        updateGameUI();

    } catch (error) {
        console.error('Error loading game:', error);
        displayMessage(gameStatusEl, 'Error loading game data', 'error');
        setTimeout(() => window.location.href = '/', 3000);
    }
}

async function setupRealtimeUpdates() {
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

                    // --- NEW BET DEDUCTION LOGIC ---
                    const isCreator = gameState.playerRole === 'creator';
                    const isOpponent = gameState.playerRole === 'opponent';

                    if (payload.new.status === 'ongoing') {
                        // Deduct for creator if not yet done
                        if (
                            isCreator &&
                            payload.new.creator_phone &&
                            !payload.new.creator_bet_deducted
                        ) {
                            await recordTransaction({
                                player_phone: payload.new.creator_phone,
                                transaction_type: 'bet',
                                amount: -payload.new.bet,
                                description: `Bet for card game ${gameState.gameCode}`,
                                status: 'completed'
                            });
                            await supabase.from('card_games')
                                .update({ creator_bet_deducted: true })
                                .eq('code', gameState.gameCode);
                        }
                        // Deduct for opponent if not yet done
                        if (
                            isOpponent &&
                            payload.new.opponent_phone &&
                            !payload.new.opponent_bet_deducted
                        ) {
                            await recordTransaction({
                                player_phone: payload.new.opponent_phone,
                                transaction_type: 'bet',
                                amount: -payload.new.bet,
                                description: `Bet for card game ${gameState.gameCode}`,
                                status: 'completed'
                            });
                            await supabase.from('card_games')
                                .update({ opponent_bet_deducted: true })
                                .eq('code', gameState.gameCode);
                        }
                    }
                    // --- END BET DEDUCTION LOGIC ---

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

                    // Check for opponent card play - improved logic
                    if (payload.new.last_card && 
                        previousTimestamp !== payload.new.updated_at &&
                        (
                            !previousLastCard || 
                            JSON.stringify(previousLastCard) !== payload.new.last_card
                        )) {
                        
                        const newCard = safeParseJSON(payload.new.last_card);
                        // Determine if this was an opponent's play
                        // The current_player in the payload is the NEXT player to play
                        // So if current_player is us, then the opponent just played
                        const isOpponentPlay = payload.new.current_player === users.phone;
                        if (isOpponentPlay && newCard) {
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

                    // Game end and win payout
                    if (payload.new.status === 'finished') {
                        const isWinner = payload.new.winner === users.phone;
                        const amount = Math.floor(gameState.betAmount * 1.8);
        const houseCut = Math.floor(gameData.bet * 0.1);  // 10% to house
  updateHouseBalance(houseCut);

                        // Only record win transaction if winner
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
        // If suit change is blocked, they can still play the card but can't change suit
        // The card will be treated as a normal card matching value
        if (gameState.isSuitChangeBlocked) {
            return true; // Can always play 8/J, but suit won't change
        }
        // If not blocked, can play to change suit
        return true;
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


    // Handle 2 cards - can only be played on same suit or another 2
    if (card.value === '2') {
        return card.suit === gameState.currentSuit || 
               gameState.lastCard.value === '2';
    }

    // Handle 7 card - can be played with any 8 or J regardless of suit
    if (card.value === '7') {
         return card.suit === gameState.currentSuit || 
               gameState.lastCard.value === '7';
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
            if(card.suit === gameState.currentSuit ){
            await showSevenCardDialog(cardIndex);

            }else{
                const initialCard = gameState.playerHand[cardIndex];
                await processCardPlay([initialCard]);
            }

                       // displayMessage(gameStatusEl, lastPlayedCard.suit, 'error');

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
        } else {
           // soundEffects.cardPlay.play();
        }


        // Handle special cards and combinations
        if (cardsToPlay.length > 1 && cardsToPlay.some(c => c.value === '7')) {
            // Playing multiple cards with a 7
            const specialCards = cardsToPlay.filter(c => 
                (c.value === '8' || c.value === 'J') && c !== lastPlayedCard
            );

            if (specialCards.length > 0) {
                // Playing with 8/J - handle suit change
                const specialCard = specialCards[0];
                gameState.lastSuitChangeMethod = specialCard.value;
                gameState.pendingAction = 'change_suit';
                updateData.pending_action = 'change_suit';
                updateData.current_player = users.phone;
                updateData.last_suit_change_method = specialCard.value;
                updateData.is_suit_change_blocked = true;
                delete updateData.current_suit; // Remove to show suit selector
                showSuitSelector();
            } else if (lastPlayedCard.value === '7') {
                // Multiple 7s played - player gets another turn
                updateData.current_player = users.phone;
            } else {
                // Same suit cards with 7 - normal play
                updateData.current_player = opponentPhone;
            }
        } 
        else if (lastPlayedCard.value in SPECIAL_CARDS) {
            // Handle single special cards
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
            // Normal cards
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

            // Calculate winnings (180% of bet amount - 10% house cut)
            const winnings = Math.floor(gameState.betAmount * 1.8);
            const houseCut = gameState.betAmount * 2 - winnings; // Total is bet*2

            // Show result
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

// Add this near your game state variables
let isDrawing = false;

// Modify your drawCard function like this:
async function drawCard() {
    try {
        const users = JSON.parse(localStorage.getItem('user')) || {};
        if (!users.phone) throw new Error('User not logged in');
        
        if (gameState.currentPlayer !== users.phone) {
            displayMessage(gameStatusEl, "It's not your turn!", 'error');
            soundEffects.notification.play();
            return;
        }

        // Prevent multiple draws
        if (isDrawing) {
            displayMessage(gameStatusEl, "Already drawing cards...", 'info');
            return;
        }

        // Set loading state
        isDrawing = true;
        if (drawCardBtn) {
            drawCardBtn.disabled = true;
            drawCardBtn.textContent = 'Drawing...';
            drawCardBtn.style.cursor = 'wait';
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
        
    } catch (error) {
        console.error('Error drawing card:', error);
        if (gameStatusEl) gameStatusEl.textContent = 'Error drawing card';
    } finally {
        // Reset loading state regardless of success or failure
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

    // Block all gameplay if game is finished
    if (gameState.status === 'finished') {
        // Disable all cards
        if (playerHandEl) {
            const cards = playerHandEl.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.pointerEvents = 'none';
                card.style.opacity = '0.7';
                card.classList.remove('playable');
            });
        }
        
        // Disable action buttons
        if (drawCardBtn) {
            drawCardBtn.style.pointerEvents = 'none';
            drawCardBtn.style.opacity = '0.5';
            drawCardBtn.style.display = 'none';
        }
        
        if (passTurnBtn) {
            passTurnBtn.style.pointerEvents = 'none';
            passTurnBtn.style.opacity = '0.5';
            passTurnBtn.style.display = 'none';
        }
        
        // Update game status display
        if (gameStatusEl) {
            gameStatusEl.textContent = 'Game Over';
            gameStatusEl.className = 'status-game-over';
        }
        
        // Don't render any new cards or updates
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
        renderDiscardPile();
    } else {
        if (playerHandEl) playerHandEl.innerHTML = '<div class="waiting-message">Waiting for opponent to join...</div>';
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
                statusText = `You must draw ${drawCount} cards or play a 2`;
            }
            
            if (gameState.mustPlaySuit && isMyTurn) {
                statusText += ` (Must play ${gameState.currentSuitToMatch})`;
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

// Update the showSevenCardDialog function to implement new 7 card rules
async function showSevenCardDialog(initialCardIndex) {
    const initialCard = gameState.playerHand[initialCardIndex];
    // Find all 8s and Js in hand (regardless of suit) that can be played with this 7
    const specialCards = gameState.playerHand.filter(
        (card, index) => (card.value === '8' || card.value === 'J') && index !== initialCardIndex&&card.suit !== initialCard.suit
    );
    // NEW RULE: Only allow cards of the same suit to be combined with 7
    const playableCards = gameState.playerHand.filter((card, index) => {
        if (index === initialCardIndex) return false;
        // Only allow same suit cards (no other 7s or special cards)
        return card.suit === initialCard.suit;
    });

    if (specialCards.length === 0&&playableCards.length === 0) {
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
  ${specialCards.map((card, i) => {
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
    injectModernDialogCSS();
    
    const selectedIndices = new Set();
    const cardChips = modal.querySelectorAll('.modern-card-chip');
    
    // Highlight the initial 7 in the player's hand
    const initialCardEl = document.querySelector(`.player-hand-cards > div:nth-child(${initialCardIndex + 1})`);
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
            
            // Update the play button text
            const totalSelected = selectedIndices.size + 1; // +1 for the initial 7
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

.game-result-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease-out;
}

.game-result-modal .result-content {
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
    padding: 30px;
    border-radius: 15px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-result-modal h2 {
    color: #2c3e50;
    font-size: 28px;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.game-result-modal p {
    color: #34495e;
    font-size: 18px;
    margin-bottom: 20px;
}

.game-result-modal .transaction-details {
    background: rgba(255, 255, 255, 0.7);
    padding: 15px;
    border-radius: 10px;
    margin: 20px 0;
    border-left: 4px solid #3498db;
}

.game-result-modal .transaction-details p {
    margin: 8px 0;
    font-size: 16px;
    color: #2c3e50;
}

.game-result-modal button {
    background: linear-gradient(to right, #3498db, #2980b9);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 50px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3);
    margin-top: 10px;
}

.game-result-modal button:hover {
    background: linear-gradient(to right, #2980b9, #3498db);
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(52, 152, 219, 0.4);
}

.game-result-modal.win {
    background-color: rgba(46, 204, 113, 0.2);
}

.game-result-modal.win .result-content {
    border-top: 5px solid #2ecc71;
}

.game-result-modal.win h2 {
    color: #27ae60;
}

.game-result-modal.lose {
    background-color: rgba(231, 76, 60, 0.2);
}

.game-result-modal.lose .result-content {
    border-top: 5px solid #e74c3c;
}

.game-result-modal.lose h2 {
    color: #c0392b;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes confetti {
    0% { transform: translateY(0) rotate(0); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #f1c40f;
    opacity: 1;
    animation: confetti 3s ease-out forwards;
}


`;
document.head.appendChild(cardStyles);


// Add this near the top with your other utility functions
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

        // 2. Attempt to create transaction record without game_id reference
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
            const failedTransactions = JSON.parse(localStorage.getItem('failedTransactions') || []);
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
    // Block further gameplay
    gameState.status = 'finished';
    
    // Remove all card click handlers
    if (playerHandEl) {
        const cards = playerHandEl.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.pointerEvents = 'none';
            card.style.opacity = '0.7';
        });
    }
    
    // Disable action buttons
    if (drawCardBtn) {
        drawCardBtn.style.pointerEvents = 'none';
        drawCardBtn.style.opacity = '0.5';
    }
    if (passTurnBtn) {
        passTurnBtn.style.pointerEvents = 'none';
        passTurnBtn.style.opacity = '0.5';
    }
    
    // Create modal
    const resultModal = document.createElement('div');
    resultModal.className = `game-result-modal ${isWinner ? 'win' : 'lose'}`;
    resultModal.innerHTML = `
        <div class="result-content">
            <h2>${isWinner ? '🎉 You Won! 🎉' : '😢 Game Over'}</h2>
            <p>${isWinner ? `You won ${amount} ETB!` : 'Better luck next time'}</p>
            <div class="transaction-details">
                <p><strong>Game Code:</strong> ${gameState.gameCode}</p>
                <p><strong>Your Bet:</strong> ${gameState.betAmount} ETB</p>
                ${isWinner ? `<p><strong>Winnings:</strong> ${amount} ETB</p>` : ''}
            </div>
            <button id="result-close-btn">Return to Home</button>
        </div>
    `;
    
    document.body.appendChild(resultModal);
    
    // Add confetti effect for wins
    if (isWinner) {
        createConfettiEffect();
    }
    
    // Play appropriate sound
    if (isWinner) {
        soundEffects.win.play();
    } else {
        soundEffects.lose.play();
    }
    
    // Close button handler
    const closeBtn = resultModal.querySelector('#result-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            resultModal.remove();
            window.location.href = 'home.html';
        });
    }
    
    // Make modal non-closable by clicking outside
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            e.stopPropagation();
        }
    });
}

function createConfettiEffect() {
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    const container = document.body;
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        container.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}
async function checkDatabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('card_games')
            .select('*')
            .limit(1); // Limit to 1 record for a quick check

        if (error) {
            console.error('Database connection error:', error);
            displayConnectionError('You are not connected to the database. Please refresh your page.'); // Call to display error message
            return false; // Connection failed
        }

        console.log('Database connection successful:', data);
        return true; // Connection successful
    } catch (err) {
        console.error('Error checking database connection:', err);
        displayConnectionError('You are not connected to the database. Please refresh your page.'); // Call to display error message
        return false; // Connection failed
    }
}

function displayConnectionError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'connection-error'; // Add a class for styling
    errorElement.textContent = message;

    // Optionally, you can style the error message
    errorElement.style.color = 'red';
    errorElement.style.fontWeight = 'bold';
    errorElement.style.position = 'fixed';
    errorElement.style.top = '10px';
    errorElement.style.right = '10px';
    errorElement.style.zIndex = '1000';

    document.body.appendChild(errorElement);

    // Optional: Remove the error message after a few seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}
