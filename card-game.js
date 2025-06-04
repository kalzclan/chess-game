<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Game</title>
    <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'; 

        // Initialize Supabase
        const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co"; 
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // DOM Elements
        const elements = {
            backBtn: document.getElementById('back-btn'),
            gameCodeDisplay: document.getElementById('game-code-display'),
            currentSuitDisplay: document.getElementById('current-suit'),
            playerHandEl: document.getElementById('player-hand'),
            opponentHandCountEl: document.getElementById('opponent-hand-count'),
            discardPileEl: document.getElementById('discard-pile'),
            gameStatusEl: document.getElementById('game-status'),
            playerNameEl: document.getElementById('player-name'),
            opponentNameEl: document.getElementById('opponent-name'),
            playerAvatarEl: document.getElementById('player-avatar'),
            opponentAvatarEl: document.getElementById('opponent-avatar'),
            drawCardBtn: document.getElementById('draw-card-btn'),
            passTurnBtn: document.getElementById('pass-turn-btn')
        };

        // Game Constants
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

        // Sound Effects
        const sounds = {
            cardPlay: new Audio('sounds/card-play.mp3'),
            cardDraw: new Audio('sounds/card-draw.mp3'),
            victory: new Audio('sounds/victory.mp3'),
            defeat: new Audio('sounds/defeat.mp3'),
            suitChange: new Audio('sounds/suit-change.mp3'),
            error: new Audio('sounds/error.mp3')
        };

        // Game State
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
            canChangeSuit: true
        };

        // Helper Functions
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

        function playSound(sound) {
            if (sounds[sound]) {
                sounds[sound].currentTime = 0;
                sounds[sound].play();
            }
        }

        function generateAvatarColor(username) {
            if (!username) return '#6c757d';
            const colors = ['#ff6b6b', '#51cf66', '#fcc419', '#228be6', '#be4bdb'];
            const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
            return colors[hash % colors.length];
        }

        function safeParseJSON(json) {
            try {
                return typeof json === 'string' ? JSON.parse(json) : json;
            } catch (e) {
                console.error('Error parsing JSON:', e);
                return null;
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

        // UI Rendering Functions
        function renderCardHTML(card, {isPlayable = false} = {}) {
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
            if (!elements.playerHandEl) return;
            elements.playerHandEl.innerHTML = '';
            
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
            elements.playerHandEl.appendChild(scrollWrapper);
        }

        function renderDiscardPile() {
            if (!elements.discardPileEl) return;
            elements.discardPileEl.innerHTML = '';
            
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
            elements.discardPileEl.appendChild(pileContainer);
        }

        // Card Logic Functions
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

        // Game Initialization
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
                gameState.lastSuitChangeMethod = gameData.last_suit_change_method;
                
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
                }
                
                if (gameData.pending_action) {
                    gameState.pendingAction = gameData.pending_action;
                    gameState.pendingActionData = gameData.pending_action_data;
                }
                
                updateGameUI();
            } catch (error) {
                console.error('Error loading game:', error);
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Error loading game';
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

        function setupEventListeners() {
            if (elements.drawCardBtn) elements.drawCardBtn.addEventListener('click', drawCard);
            if (elements.passTurnBtn) elements.passTurnBtn.addEventListener('click', passTurn);
            
            if (elements.backBtn) {
                elements.backBtn.addEventListener('click', () => {
                    window.location.href = 'home.html';
                });
            }
        }

        // Game Actions
        async function playCard(cardIndex) {
            try {
                const users = JSON.parse(localStorage.getItem('user')) || {};
                if (!users.phone) throw new Error('User not logged in');
                if (gameState.currentPlayer !== users.phone) {
                    displayMessage(elements.gameStatusEl, "It's not your turn!", 'error');
                    return;
                }
                
                const card = gameState.playerHand[cardIndex];
                if (!card) throw new Error('Invalid card index');
                
                if (card.value === '7') {
                    await showSevenCardDialog(cardIndex);
                    return;
                }
                
                await processCardPlay([card]);
            } catch (error) {
                console.error('Error playing card:', error);
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Error playing card';
            }
        }

        async function drawCard() {
            try {
                const users = JSON.parse(localStorage.getItem('user')) || {};
                if (!users.phone) throw new Error('User not logged in');
                if (gameState.currentPlayer !== users.phone) {
                    displayMessage(elements.gameStatusEl, "It's not your turn!", 'error');
                    return;
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
                    }
                    
                    if (deck.length > 0) {
                        cardsToAdd.push(deck.pop());
                    }
                }
                
                gameState.playerHand = [...gameState.playerHand, ...cardsToAdd];
                
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
                
                playSound('cardDraw');
                updateGameUI();
            } catch (error) {
                console.error('Error drawing card:', error);
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Error drawing card';
            }
        }

        async function passTurn() {
            try {
                const users = JSON.parse(localStorage.getItem('user')) || {};
                if (!users.phone) throw new Error('User not logged in');
                if (gameState.currentPlayer !== users.phone) {
                    displayMessage(elements.gameStatusEl, "It's not your turn!", 'error');
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
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Error passing turn';
            }
        }

        async function processCardPlay(cardsToPlay) {
            const users = JSON.parse(localStorage.getItem('user')) || {};
            const isCreator = gameState.playerRole === 'creator';
            const opponentPhone = isCreator ? gameState.opponent.phone : gameState.creator.phone;
            
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
                                playSound('suitChange');
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
                                playSound('suitChange');
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
                
                playSound('victory');
                showGameResult(true, winnings);
            }
            
            const { error } = await supabase
                .from('card_games')
                .update(updateData)
                .eq('code', gameState.gameCode);
                
            if (error) throw error;
            
            playSound('cardPlay');
            updateGameUI();
        }

        // Dialog Functions
        function modernCardChip(card) {
            return `
                <div class="modern-card-chip ${card.suit}" 
                    style="border-radius:9px;padding:8px 10px;background:#fff;box-shadow:0 2px 8px #0001;display:flex;align-items:center;gap:6px;min-width:54px;justify-content:center;">
                    <span style="font-weight:700;font-size:1.1em;">${card.value}</span>
                    ${getSuitSVG(card.suit)}
                </div>
            `;
        }

        async function showSevenCardDialog(initialCardIndex) {
            const initialCard = gameState.playerHand[initialCardIndex];
            const specialCards = gameState.playerHand.filter(
                (card, index) => (card.value === '8' || card.value === 'J') && index !== initialCardIndex
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
                    resolve();
                });
                
                modal.querySelector('#play-single-seven').addEventListener('click', async () => {
                    modal.remove();
                    await processCardPlay([initialCard]);
                    resolve();
                });
            });
        }

        function injectModernDialogCSS() {
            if (document.getElementById('modern-dialog-css')) return;
            const style = document.createElement('style');
            style.id = 'modern-dialog-css';
            style.textContent = `
                /* Add your CSS styles here */
            `;
            document.head.appendChild(style);
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
            
            const closeBtn = resultModal.querySelector('#result-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    resultModal.remove();
                    window.location.href = 'home.html';
                });
            }
            
            playSound(isWinner ? 'victory' : 'defeat');
        }

        // UI Update
        function updateGameUI() {
            const users = JSON.parse(localStorage.getItem('user')) || {};
            const isMyTurn = users.phone === gameState.currentPlayer;
            const isCreator = gameState.playerRole === 'creator';
            
            if (elements.opponentNameEl) {
                elements.opponentNameEl.textContent = isCreator ? 
                    gameState.opponent.username || 'Waiting...' : 
                    gameState.creator.username || 'Waiting...';
            }
            
            if (elements.opponentAvatarEl) {
                const name = isCreator ? gameState.opponent.username : gameState.creator.username;
                elements.opponentAvatarEl.style.backgroundColor = generateAvatarColor(name);
                elements.opponentAvatarEl.textContent = name ? name.charAt(0).toUpperCase() : 'O';
            }
            
            if (elements.playerNameEl) {
                elements.playerNameEl.textContent = users.username || 'You';
            }
            
            if (elements.playerAvatarEl) {
                elements.playerAvatarEl.style.backgroundColor = generateAvatarColor(users.username);
                elements.playerAvatarEl.textContent = users.username ? users.username.charAt(0).toUpperCase() : 'Y';
            }
            
            if (elements.currentSuitDisplay) {
                elements.currentSuitDisplay.textContent = gameState.currentSuit 
                    ? `${gameState.currentSuit.toUpperCase()}` 
                    : 'Not set';
                elements.currentSuitDisplay.className = `suit-${gameState.currentSuit}`;
            }
            
            if (elements.opponentHandCountEl) {
                elements.opponentHandCountEl.textContent = `${gameState.opponentHandCount} cards`;
            }
            
            if (elements.drawCardBtn) {
                elements.drawCardBtn.style.display = isMyTurn && !gameState.hasDrawnThisTurn ? 'block' : 'none';
            }
            
            if (elements.passTurnBtn) {
                elements.passTurnBtn.style.display = isMyTurn && gameState.hasDrawnThisTurn ? 'block' : 'none';
                
                if (isMyTurn && gameState.mustPlaySuit && !hasCardsOfSuit(gameState.currentSuitToMatch)) {
                    elements.passTurnBtn.style.display = 'block';
                }
            }
            
            if (gameState.status !== 'waiting') {
                renderPlayerHand();
                renderDiscardPile();
            } else {
                if (elements.playerHandEl) elements.playerHandEl.innerHTML = '<div class="waiting-message"></div>';
                if (elements.discardPileEl) elements.discardPileEl.innerHTML = '';
            }
            
            if (elements.gameStatusEl) {
                if (gameState.status === 'waiting') {
                    elements.gameStatusEl.textContent = 'Waiting for opponent...';
                } else {
                    let statusText = isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
                    
                    if (isMyTurn && gameState.pendingAction === 'draw_two') {
                        const drawCount = gameState.pendingActionData || 2;
                        statusText = `You must draw ${drawCount} cards or play a 2`;
                    }
                    
                    elements.gameStatusEl.textContent = statusText;
                    elements.gameStatusEl.className = isMyTurn ? 'status-your-turn' : 'status-opponent-turn';
                }
            }
        }

        // Initialize Game
        document.addEventListener('DOMContentLoaded', async () => {
            const requiredElements = Object.entries(elements)
                .filter(([name, element]) => !element)
                .map(([name]) => name);
                
            if (requiredElements.length > 0) {
                console.error('Missing DOM elements:', requiredElements.join(', '));
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Game setup error - missing elements';
            }
            
            const params = new URLSearchParams(window.location.search);
            gameState.gameCode = params.get('code');
            
            if (!gameState.gameCode) {
                console.error('No game code provided in URL');
                window.location.href = '/';
                return;
            }
            
            if (elements.gameCodeDisplay) elements.gameCodeDisplay.textContent = gameState.gameCode;
            
            try {
                await loadGameData();
                setupEventListeners();
                setupRealtimeUpdates();
            } catch (error) {
                console.error('Game initialization failed:', error);
                if (elements.gameStatusEl) elements.gameStatusEl.textContent = 'Game initialization failed';
            }
        });
    </script>

    <!-- Add your CSS styles here -->
    <style>
        /* Add realistic card styles */
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

        /* Add dialog styles */
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

        /* Add other necessary styles */
    </style>
</head>
<body>
    <!-- Your HTML elements go here -->
    <div id="game-container">
        <button id="back-btn">← Back</button>
        <div id="game-header">
            <div id="game-code-display"></div>
            <div id="current-suit"></div>
        </div>
        <div id="game-board">
            <div id="opponent-hand">
                <div id="opponent-name"></div>
                <div id="opponent-avatar"></div>
                <div id="opponent-hand-count"></div>
            </div>
            <div id="center-area">
                <div id="discard-pile"></div>
            </div>
            <div id="player-area">
                <div id="player-name"></div>
                <div id="player-avatar"></div>
                <div id="player-hand"></div>
                <div id="controls">
                    <button id="draw-card-btn">Draw Card</button>
                    <button id="pass-turn-btn">Pass Turn</button>
                </div>
                <div id="game-status"></div>
            </div>
        </div>
    </div>
</body>
</html>
