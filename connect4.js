import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Audio Setup ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound generation functions
function createTone(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playMyMoveSound() {
    // Pleasant ascending tone for my moves
    createTone(523.25, 0.2); // C5
    setTimeout(() => createTone(659.25, 0.2), 100); // E5
}

function playOpponentMoveSound() {
    // Different tone for opponent moves
    createTone(440, 0.3, 'square'); // A4 with square wave
}

function playWinSound() {
    // Victory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((note, index) => {
        setTimeout(() => createTone(note, 0.4), index * 150);
    });
}

function playLoseSound() {
    // Descending sad tone
    createTone(440, 0.5); // A4
    setTimeout(() => createTone(369.99, 0.5), 200); // F#4
    setTimeout(() => createTone(293.66, 0.8), 400); // D4
}

// Initialize audio context on first user interaction
function initializeAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// --- DOM Elements ---
const backBtn = document.getElementById('back-btn');
const gameCodeDisplay = document.getElementById('game-code-display');
const copyCodeBtn = document.getElementById('copy-code-btn');
const gameBetAmount = document.getElementById('game-bet-amount');
const creatorAvatar = document.getElementById('creator-avatar');
const creatorUsername = document.getElementById('creator-username');
const creatorStatus = document.getElementById('creator-status');
const opponentAvatar = document.getElementById('opponent-avatar');
const opponentUsername = document.getElementById('opponent-username');
const opponentStatus = document.getElementById('opponent-status');
const gameStatusMessage = document.getElementById('game-status-message');
const currentTurnIndicator = document.getElementById('current-turn-indicator');
const turnPlayerName = document.getElementById('turn-player-name');
const turnPiece = document.getElementById('turn-piece');
const connectFourBoard = document.getElementById('connect-four-board');
const gameGrid = document.querySelector('.game-grid');
const columnButtons = document.querySelectorAll('.column-btn');
const leaveGameBtn = document.getElementById('leave-game-btn');
const gameResultModal = document.getElementById('game-result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const resultAmount = document.getElementById('result-amount');
const resultCloseBtn = document.getElementById('result-close-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const watchGameBtn = document.getElementById('watch-game-btn');
const notificationContainer = document.getElementById('notification-container');

// --- Game Constants ---
const ROWS = 6;
const COLS = 7;
const PLAYER_ONE = 1; // Red (Creator)
const PLAYER_TWO = 2; // Yellow (Opponent)

// --- Game State ---
let gameState = {
    gameCode: '',
    betAmount: 0,
    playerRole: '', // 'creator' or 'opponent'
    gameStatus: 'waiting', // 'waiting', 'ongoing', 'finished', 'cancelled'
    creator: {},
    opponent: {},
    board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
    currentTurn: '',
    moves: [],
    betDeducted: false,
    didWeWin: false,
    lastMoveColumn: -1,
    winningCells: []
};

// --- Transaction Handling ---
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

// --- Connect Four Logic ---
function checkWin(board, row, col, player) {
    const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal \
        [1, -1]   // diagonal /
    ];

    for (let [deltaRow, deltaCol] of directions) {
        let count = 1;
        let winningCells = [{row, col}];

        // Check in positive direction
        let r = row + deltaRow;
        let c = col + deltaCol;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
            winningCells.push({row: r, col: c});
            count++;
            r += deltaRow;
            c += deltaCol;
        }

        // Check in negative direction
        r = row - deltaRow;
        c = col - deltaCol;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
            winningCells.unshift({row: r, col: c});
            count++;
            r -= deltaRow;
            c -= deltaCol;
        }

        if (count >= 4) {
            return winningCells;
        }
    }

    return null;
}

function isBoardFull(board) {
    return board[0].every(cell => cell !== 0);
}

function getLowestAvailableRow(board, col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === 0) {
            return row;
        }
    }
    return -1;
}

// --- Game Flow Functions ---
async function handleGameWin(winningPlayer, winningCells) {
    if (gameState.gameStatus === 'finished') return;

    try {
        const totalPrizePool = gameState.betAmount * 2;
        const winnerPrize = Math.floor(totalPrizePool * 0.9); // 90% to winner
        const houseCut = totalPrizePool - winnerPrize; // 10% to house

        // Update database with winner
        const { error } = await supabase
            .from('connect_four_games')
            .update({ 
                status: 'finished',
                winner: winningPlayer.phone,
                result: 'connect_four',
                board: gameState.board,
                moves: gameState.moves
            })
            .eq('code', gameState.gameCode);
        
        if (error) throw error;

        // Award prize to winner
        const { data: winnerData } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', winningPlayer.phone)
            .single();

        if (winnerData) {
            const newBalance = winnerData.balance + winnerPrize;
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('phone', winningPlayer.phone);
        }

        // Record transaction for winner
        await recordTransaction({
            player_phone: winningPlayer.phone,
            transaction_type: 'win',
            amount: winnerPrize,
            description: `Won Connect Four game (${gameState.gameCode})`,
            status: 'completed'
        });

        // Update house balance
        await updateHouseBalance(houseCut);

        // Highlight winning pieces
        gameState.winningCells = winningCells;
        highlightWinningPieces(winningCells);

        // Play win/lose sound
        const phone = localStorage.getItem('phone');
        if (winningPlayer.phone === phone) {
            gameState.didWeWin = true;
            playWinSound();
            showNotification(`You won ${formatBalance(winnerPrize)}!`, 'success');
        } else {
            playLoseSound();
            // Record loss for the losing player (no money deducted, just for history)
            
        }

        // Show result after animation
        setTimeout(() => {
            showFinalResult({
                winner: winningPlayer.phone,
                result: 'connect_four',
                prize_amount: winnerPrize,
                house_cut: houseCut
            });
        }, 1000);

    } catch (error) {
        console.error('Error handling game win:', error);
    }
    
    gameState.gameStatus = 'finished';
}

async function handleGameDraw() {
    if (gameState.gameStatus === 'finished') return;

    try {
        const { error } = await supabase
            .from('connect_four_games')
            .update({ 
                status: 'finished',
                result: 'draw',
                board: gameState.board,
                moves: gameState.moves
            })
            .eq('code', gameState.gameCode);
        
        if (error) throw error;

        // In case of draw, refund both players (minus small house fee)
        const refundAmount = Math.floor(gameState.betAmount * 0.95);
        const houseCut = gameState.betAmount * 2 - (refundAmount * 2);

        const phone = localStorage.getItem('phone');
        
        // Refund current player
        const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', phone)
            .single();

        if (userData) {
            const newBalance = userData.balance + refundAmount;
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('phone', phone);
        }

        await recordTransaction({
            player_phone: phone,
            transaction_type: 'refund',
            amount: refundAmount,
            description: `Connect Four game ended in draw - refund`,
            status: 'completed'
        });

        await updateHouseBalance(houseCut);

        showFinalResult({
            result: 'draw',
            refund_amount: refundAmount
        });

        showNotification('Game ended in draw - refund processed', 'info');

    } catch (error) {
        console.error('Error handling game draw:', error);
    }
    
    gameState.gameStatus = 'finished';
}

// --- UI Functions ---
function initializeBoard() {
    gameGrid.innerHTML = '';
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            gameGrid.appendChild(cell);
        }
    }
}

function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = gameState.board[row][col];
        
        // Remove existing pieces
        cell.innerHTML = '';
        
        if (value !== 0) {
            const piece = document.createElement('div');
            piece.className = `piece ${value === PLAYER_ONE ? 'red' : 'yellow'}`;
            
            // Add animation for the last dropped piece
            if (gameState.lastMoveColumn === col) {
                setTimeout(() => {
                    piece.classList.add('dropped');
                }, 50);
            } else {
                piece.classList.add('dropped');
            }
            
            cell.appendChild(piece);
        }
    });
    
    updateColumnButtons();
}

function highlightWinningPieces(winningCells) {
    winningCells.forEach(({row, col}) => {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('winning');
            }
        }
    });
}

function updateColumnButtons() {
    const phone = localStorage.getItem('phone');
    const isMyTurn = gameState.currentTurn === phone;
    const canPlay = gameState.gameStatus === 'ongoing' && isMyTurn;
    
    columnButtons.forEach((button, col) => {
        const isColumnFull = gameState.board[0][col] !== 0;
        button.disabled = !canPlay || isColumnFull;
        
        if (canPlay && !isColumnFull) {
            const playerNumber = gameState.playerRole === 'creator' ? PLAYER_ONE : PLAYER_TWO;
            const pieceColor = playerNumber === PLAYER_ONE ? 'red' : 'yellow';
            button.style.setProperty('--hover-color', pieceColor);
        }
    });
}

function updateGameUI() {
    updatePlayerUI(creatorAvatar, creatorUsername, creatorStatus, gameState.creator, 'Creator');
    updatePlayerUI(opponentAvatar, opponentUsername, opponentStatus, gameState.opponent, 'Waiting...');

    gameBetAmount.textContent = formatBalance(gameState.betAmount * 2);

    const phone = localStorage.getItem('phone');
    
    switch (gameState.gameStatus) {
        case 'waiting':
            displayMessage(gameStatusMessage, gameState.playerRole === 'creator' ?
                'Waiting for opponent...' : 'Connecting to game...', 'info');
            currentTurnIndicator.style.display = 'none';
            break;
        case 'ongoing':
            const isMyTurn = gameState.currentTurn === phone;
            const currentPlayer = gameState.currentTurn === gameState.creator.phone ? gameState.creator : gameState.opponent;
            
            displayMessage(gameStatusMessage, 'Game in progress!', 'success');
            
            currentTurnIndicator.style.display = 'flex';
            turnPlayerName.textContent = isMyTurn ? 'Your' : `${currentPlayer.username || 'Opponent'}'s`;
            
            const playerNumber = gameState.currentTurn === gameState.creator.phone ? PLAYER_ONE : PLAYER_TWO;
            turnPiece.className = `turn-piece ${playerNumber === PLAYER_ONE ? 'red' : 'yellow'}`;
            break;
        case 'finished':
            displayMessage(gameStatusMessage, 'Game finished.', 'info');
            currentTurnIndicator.style.display = 'none';
            break;
        case 'cancelled':
            displayMessage(gameStatusMessage, 'Game cancelled.', 'error');
            currentTurnIndicator.style.display = 'none';
            break;
        default:
            displayMessage(gameStatusMessage, 'Unknown game status.', 'info');
            currentTurnIndicator.style.display = 'none';
    }

    renderBoard();
}

// --- Utility Functions ---
function generateAvatarColor(username) {
    if (!username) return '#6c757d';
    const colors = [
        '#22c55e', '#16a34a', '#15803d', '#86efac',
        '#3b82f6', '#1d4ed8', '#f59e0b', '#d97706'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
}

function formatBalance(amount) {
    const numericAmount = typeof amount === 'number' ? amount : 0;
    return numericAmount.toLocaleString() + ' ETB';
}

function displayMessage(element, message, type = 'info') {
    if (!element) return;

    element.textContent = message;
    element.classList.remove('status-message', 'success', 'error', 'warning', 'info');
    element.classList.add('status-message', type);

    if (type === 'success') {
        setTimeout(() => {
            if (gameState.gameStatus === 'ongoing') {
                element.textContent = 'Game in progress!';
            }
        }, 3000);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `game-notification ${type}`;
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function updatePlayerUI(avatarEl, nameEl, statusEl, player, defaultName) {
    if (player && player.phone) {
        nameEl.textContent = player.username || defaultName;
        avatarEl.textContent = player.username ? player.username.charAt(0).toUpperCase() : defaultName.charAt(0);
        avatarEl.style.backgroundColor = generateAvatarColor(player.username || defaultName);
        
        const phone = localStorage.getItem('phone');
        statusEl.textContent = player.phone === phone ? 'You' : 'Connected';
    } else {
        nameEl.textContent = defaultName;
        avatarEl.textContent = defaultName.charAt(0);
        avatarEl.style.backgroundColor = '#6c757d';
        statusEl.textContent = 'Waiting';
    }
}

function copyGameCode() {
    navigator.clipboard.writeText(gameState.gameCode).then(() => {
        const originalSvg = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>';
        setTimeout(() => {
            copyCodeBtn.innerHTML = originalSvg;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy game code:', err);
        showNotification('Failed to copy game code', 'error');
    });
}

// --- Game Management Functions ---
async function deductBetAmount() {
    if (gameState.betDeducted) return;

    try {
        const phone = localStorage.getItem('phone');
        const isCreator = gameState.playerRole === 'creator';
        
        // Get current game state to check bet status
        const { data: gameData, error: fetchError } = await supabase
            .from('connect_four_games')
            .select('bet, creator_bet_deducted, opponent_bet_deducted, status')
            .eq('code', gameState.gameCode)
            .single();

        if (fetchError) throw fetchError;
        if (!gameData) {
            console.warn("Game data not found for bet deduction.");
            return;
        }

        // Check if bet already deducted for this player
        const betAlreadyDeducted = isCreator ? 
            gameData.creator_bet_deducted : 
            gameData.opponent_bet_deducted;

        if (betAlreadyDeducted) {
            console.log('Bet already deducted for this player');
            gameState.betDeducted = true;
            gameState.betAmount = gameData.bet;
            return;
        }

        gameState.betAmount = gameData.bet;

        // Check if game is ready for bet deduction
        // For creator: deduct immediately when creating game
        // For opponent: deduct when joining an existing game
        const shouldDeduct = (isCreator && gameData.status === 'waiting') || 
                            (!isCreator && gameData.status === 'ongoing');

        if (!shouldDeduct) {
            console.log('Not the right time to deduct bet yet');
            return;
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('phone', phone)
            .single();

        if (userError) throw userError;

        if (userData && userData.balance >= gameState.betAmount) {
            // Deduct from user balance
            const newBalance = userData.balance - gameState.betAmount;
            const { error: updateError } = await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('phone', phone);

            if (updateError) throw updateError;

            // Mark bet as deducted for this player in game record
            const updateField = isCreator ? 'creator_bet_deducted' : 'opponent_bet_deducted';
            const { error: betUpdateError } = await supabase
                .from('connect_four_games')
                .update({ 
                    [updateField]: true,
                    // If opponent is joining, also update game status to ongoing
                    ...(!isCreator && gameData.status === 'waiting' ? { status: 'ongoing' } : {})
                })
                .eq('code', gameState.gameCode);

            if (betUpdateError) throw betUpdateError;

            gameState.betDeducted = true;
            showNotification(`Bet of ${formatBalance(gameState.betAmount)} deducted`, 'info');

            // Record transaction
            await recordTransaction({
                player_phone: phone,
                transaction_type: 'bet',
                amount: -gameState.betAmount,
                description: `Connect Four game bet`,
                status: 'completed'
            });

            // If both bets are now deducted, update the game status if needed
            if (gameData.creator_bet_deducted && !isCreator) {
                await supabase
                    .from('connect_four_games')
                    .update({ status: 'ongoing' })
                    .eq('code', gameState.gameCode);
            }
        } else {
            displayMessage(gameStatusMessage, 'Insufficient balance to join game. Redirecting...', 'error');
            setTimeout(() => window.location.href = '/', 3000);
        }
    } catch (error) {
        console.error('Error deducting bet amount:', error);
        displayMessage(gameStatusMessage, 'Error deducting bet. Please try again.', 'error');
    }
}

async function updateGameInDatabase() {
    try {
        await supabase
            .from('connect_four_games')
            .update({
                board: gameState.board,
                current_turn: gameState.currentTurn,
                moves: gameState.moves,
                status: gameState.gameStatus
            })
            .eq('code', gameState.gameCode);
    } catch (error) {
        console.error('Error updating game:', error);
    }
}

// --- Result Handling ---
async function showFinalResult(gameData) {
    const phone = localStorage.getItem('phone');
    const isWinner = gameData.winner === phone;

    gameResultModal.classList.add('active');

    if (gameData.result === 'connect_four') {
        resultTitle.textContent = isWinner ? 'You Won!' : 'You Lost!';
        resultMessage.textContent = isWinner
            ? `You got four in a row and won ${formatBalance(gameData.prize_amount)}!`
            : `Your opponent got four in a row!`;
        
        resultAmount.textContent = isWinner 
            ? `+${formatBalance(gameData.prize_amount)}` 
            : `No money lost`;
        
        resultAmount.className = isWinner ? 'result-amount win' : 'result-amount';
    } else if (gameData.result === 'draw') {
        resultTitle.textContent = 'Draw!';
        resultMessage.textContent = 'The board is full with no winner.';
        resultAmount.textContent = `No money lost`;
        resultAmount.className = 'result-amount';
    }
    
    watchGameBtn.style.display = (gameData.result === 'connect_four' && !isWinner) ? 'block' : 'none';
}

function handleGameCancellation() {
    gameState.gameStatus = 'cancelled';
    displayMessage(gameStatusMessage, 'Game cancelled', 'error');

    resultTitle.textContent = 'Game Cancelled';
    resultMessage.textContent = 'The game was cancelled.';
    resultAmount.textContent = 'Refund processed';
    resultAmount.className = 'result-amount';
    gameResultModal.classList.add('active');

    setTimeout(() => {
        window.location.href = '/';
    }, 5000);
}

// --- Realtime Updates ---
function setupRealtimeUpdates() {
    const channel = supabase
        .channel(`connect_four:${gameState.gameCode}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'connect_four_games',
                filter: `code=eq.${gameState.gameCode}`
            },
            async (payload) => {
                console.log('Realtime payload received:', payload);
                
                const phone = localStorage.getItem('phone');
                const isCreator = gameState.playerRole === 'creator';
                
                // Handle game cancellation first
                if (payload.new.status === 'cancelled') {
                    handleGameCancellation();
                    return;
                }
                
                // Handle bet deduction updates
                if ((payload.new.creator_bet_deducted || payload.new.opponent_bet_deducted) && 
                    !gameState.betDeducted) {
                    
                    const ourBetDeducted = isCreator ? 
                        payload.new.creator_bet_deducted : 
                        payload.new.opponent_bet_deducted;
                    
                    if (ourBetDeducted) {
                        gameState.betDeducted = true;
                        gameState.betAmount = payload.new.bet;
                        showNotification(`Bet of ${formatBalance(payload.new.bet)} deducted`, 'info');
                    }
                }
                
                // Handle refund notifications
                if (payload.new.creator_refunded || payload.new.opponent_refunded) {
                    const wasRefunded = isCreator ? 
                        payload.new.creator_refunded : 
                        payload.new.opponent_refunded;
                    
                    const otherPlayerRefunded = isCreator ?
                        payload.new.opponent_refunded :
                        payload.new.creator_refunded;
                    
                    // Check if current player was refunded
                    if (wasRefunded && !(isCreator ? gameState.creator_refunded : gameState.opponent_refunded)) {
                        const refundAmount = gameState.betAmount;
                        
                        // Update local state
                        if (isCreator) {
                            gameState.creator_refunded = true;
                        } else {
                            gameState.opponent_refunded = true;
                        }
                        
                        // Update user balance locally
                        const { data: userData } = await supabase
                            .from('users')
                            .select('balance')
                            .eq('phone', phone)
                            .single();
                        
                        if (userData) {
                            const newBalance = userData.balance + refundAmount;
                            await supabase
                                .from('users')
                                .update({ balance: newBalance })
                                .eq('phone', phone);
                        }
                        
                        showNotification(`You've been refunded ${formatBalance(refundAmount)}`, 'success');
                        
                        // Show refund modal if game hasn't started
                        if (payload.new.moves.length === 0) {
                            showRefundResult({
                                amount: refundAmount,
                                opponentLeft: otherPlayerRefunded
                            });
                        }
                    }
                    
                    // Check if other player was refunded
                    if (otherPlayerRefunded) {
                        showNotification('Opponent has left and been refunded', 'info');
                    }
                }
                
                // Update game state from payload
                gameState.gameStatus = payload.new.status;
                gameState.board = payload.new.board || gameState.board;
                gameState.currentTurn = payload.new.current_turn;
                gameState.moves = payload.new.moves || [];
                gameState.creator_refunded = payload.new.creator_refunded || false;
                gameState.opponent_refunded = payload.new.opponent_refunded || false;
                
                // Handle opponent joining
                if (payload.new.opponent_phone && !gameState.opponent.phone) {
                    gameState.opponent = {
                        username: payload.new.opponent_username,
                        phone: payload.new.opponent_phone
                    };

                    if (gameState.gameStatus === 'waiting') {
                        gameState.gameStatus = 'ongoing';
                        gameState.currentTurn = gameState.creator.phone;
                        updateGameInDatabase();
                    }
                    deductBetAmount();
                    showNotification('Opponent has joined!', 'success');
                }

                // Check if a new move was made and play sound
                if (payload.new.moves && payload.new.moves.length > gameState.moves.length) {
                    const lastMove = payload.new.moves[payload.new.moves.length - 1];
                    if (lastMove && lastMove.player && lastMove.player.phone !== phone) {
                        playOpponentMoveSound();
                    }
                }

                updateGameUI();

                // Handle game completion
                if (payload.new.status === 'finished') {
                    setTimeout(() => {
                        showFinalResult(payload.new);
                    }, 500);
                }
            }
        )
        .subscribe((status, err) => {
            console.log('Subscription status:', status);
            if (err) console.error('Subscription error:', err);
            
            // Handle subscription errors
            if (status === 'CHANNEL_ERROR') {
                showNotification('Connection lost - attempting to reconnect...', 'error');
                setTimeout(setupRealtimeUpdates, 5000);
            }
        });

    return channel;
}

// Helper function to show refund result modal
function showRefundResult({ amount, opponentLeft }) {
    const modal = document.createElement('div');
    modal.className = 'refund-modal active';
    modal.innerHTML = `
        <div class="refund-modal-content">
            <h3>Game Refund Processed</h3>
            <p>You've received a refund of ${formatBalance(amount)}</p>
            ${opponentLeft ? 
                '<p>The opponent has also left the game.</p>' : 
                '<p>The game will continue if the opponent stays.</p>'}
            <button id="refund-close-btn" class="btn primary">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#refund-close-btn').addEventListener('click', () => {
        modal.remove();
        if (opponentLeft) {
            window.location.href = '/';
        }
    });
}

// --- Game Exit Handling ---
async function leaveGame() {
    const phone = localStorage.getItem('phone');
    const isCreator = gameState.playerRole === 'creator';
    const opponentJoined = !!gameState.opponent.phone;
    
    if (gameState.gameStatus === 'finished') {
        window.location.href = '/';
        return;
    }

    if (confirm('Are you sure you want to leave this game?')) {
        try {
            // Get current game state to check moves
            const { data: gameData, error: fetchError } = await supabase
                .from('connect_four_games')
                .select('moves, creator_bet_deducted, opponent_bet_deducted')
                .eq('code', gameState.gameCode)
                .single();

            if (fetchError) throw fetchError;

            const movesMade = gameData.moves && gameData.moves.length > 0;
            const betDeducted = isCreator ? 
                gameData.creator_bet_deducted : 
                gameData.opponent_bet_deducted;

            if (!movesMade && betDeducted) {
                // No moves made - process refund
                const refundAmount = gameState.betAmount;
                
                // Record refund transaction
                await recordTransaction({
                    player_phone: phone,
                    transaction_type: 'refund',
                    amount: refundAmount,
                    description: `Refund for unfinished Connect Four game`,
                    status: 'completed'
                });

                // Update user balance
                const { data: userData } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('phone', phone)
                    .single();

                if (userData) {
                    const newBalance = userData.balance + refundAmount;
                    await supabase
                        .from('users')
                        .update({ balance: newBalance })
                        .eq('phone', phone);
                }

                // Mark player as refunded in game record
                const updateField = isCreator ? 'creator_refunded' : 'opponent_refunded';
                await supabase
                    .from('connect_four_games')
                    .update({ 
                        [updateField]: true,
                        status: 'cancelled',
                        result: 'early_exit_refund'
                    })
                    .eq('code', gameState.gameCode);

                showNotification(`You've been refunded ${formatBalance(refundAmount)}`, 'success');
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }

            // If moves were made or bet wasn't deducted, proceed with normal exit handling
            if (isCreator) {
                if (!opponentJoined) {
                    await supabase
                        .from('connect_four_games')
                        .update({
                            status: 'cancelled',
                            result: 'creator_left_early'
                        })
                        .eq('code', gameState.gameCode);
                    
                    showNotification('Game cancelled', 'info');
                } else {
                    // Creator forfeits - opponent wins
                    const winnerPrize = Math.floor(gameState.betAmount * 2 * 0.9);
                    
                    await supabase
                        .from('connect_four_games')
                        .update({
                            status: 'finished',
                            winner: gameState.opponent.phone,
                            result: 'forfeit'
                        })
                        .eq('code', gameState.gameCode);
                    
                    // Award prize to opponent
                    const { data: opponentData } = await supabase
                        .from('users')
                        .select('balance')
                        .eq('phone', gameState.opponent.phone)
                        .single();

                    if (opponentData) {
                        await supabase
                            .from('users')
                            .update({ balance: opponentData.balance + winnerPrize })
                            .eq('phone', gameState.opponent.phone);
                    }
                    
                    // Record loss for creator
                    await recordTransaction({
                        player_phone: phone,
                        transaction_type: 'loss',
                        amount: -gameState.betAmount,
                        description: `Forfeited Connect Four game`,
                        status: 'completed'
                    });
                    
                    showNotification('You forfeited - opponent wins', 'info');
                }
            } else {
                // Opponent forfeits - creator wins
                const winnerPrize = Math.floor(gameState.betAmount * 2 * 0.9);
                
                await supabase
                    .from('connect_four_games')
                    .update({
                        status: 'finished',
                        winner: gameState.creator.phone,
                        result: 'forfeit'
                    })
                    .eq('code', gameState.gameCode);
                
                // Record loss for opponent
                await recordTransaction({
                    player_phone: phone,
                    transaction_type: 'loss',
                    amount: -gameState.betAmount,
                    description: `Forfeited Connect Four game`,
                    status: 'completed'
                });
                
                showNotification('You forfeited - creator wins', 'info');
            }
        } catch (error) {
            console.error('Error leaving game:', error);
            showNotification('Error leaving game', 'error');
        } finally {
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
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

// --- Move Handling ---
async function dropPiece(col) {
    const phone = localStorage.getItem('phone');
    
    if (gameState.gameStatus !== 'ongoing') {
        showNotification('Game is not active', 'error');
        return;
    }
    
    if (gameState.currentTurn !== phone) {
        showNotification('Not your turn', 'error');
        return;
    }
    
    const row = getLowestAvailableRow(gameState.board, col);
    if (row === -1) {
        showNotification('Column is full', 'error');
        return;
    }
    
    // Initialize audio context and play move sound
    initializeAudio();
    playMyMoveSound();
    
    try {
        const playerNumber = gameState.playerRole === 'creator' ? PLAYER_ONE : PLAYER_TWO;
        const currentPlayer = gameState.playerRole === 'creator' ? gameState.creator : gameState.opponent;
        
        // Update local board
        gameState.board[row][col] = playerNumber;
        gameState.lastMoveColumn = col;
        
        // Add move to history
        const moveData = {
            player: {
                phone: currentPlayer.phone,
                username: currentPlayer.username
            },
            column: col,
            row: row,
            timestamp: new Date().toISOString()
        };
        
        gameState.moves.push(moveData);
        
        // Check for win
        const winningCells = checkWin(gameState.board, row, col, playerNumber);
        if (winningCells) {
            await handleGameWin(currentPlayer, winningCells);
            return;
        }
        
        // Check for draw
        if (isBoardFull(gameState.board)) {
            await handleGameDraw();
            return;
        }
        
        // Switch turns
        gameState.currentTurn = gameState.playerRole === 'creator' ? 
            gameState.opponent.phone : gameState.creator.phone;
        
        // Update database
        await updateGameInDatabase();
        
        // Update UI
        updateGameUI();
        
    } catch (error) {
        console.error('Error processing move:', error);
        showNotification('Error processing move', 'error');
        
        // Revert local changes
        gameState.board[row][col] = 0;
        gameState.moves.pop();
        gameState.lastMoveColumn = -1;
        updateGameUI();
    }
}

// --- Game Initialization ---
async function loadGameData() {
    try {
        const { data: gameData, error } = await supabase
            .from('connect_four_games')
            .select('*')
            .eq('code', gameState.gameCode)
            .single();

        if (error) throw error;
        if (!gameData) {
            displayMessage(gameStatusMessage, 'Game not found or already ended.', 'error');
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        Object.assign(gameState, {
            betAmount: gameData.bet,
            gameStatus: gameData.status,
            creator: {
                username: gameData.creator_username,
                phone: gameData.creator_phone
            },
            opponent: {
                username: gameData.opponent_username,
                phone: gameData.opponent_phone
            },
            board: gameData.board || gameState.board,
            currentTurn: gameData.current_turn,
            moves: gameData.moves || []
        });

        const phone = localStorage.getItem('phone');
        gameState.playerRole = gameData.creator_phone === phone ? 'creator' : 'opponent';

        // Check if we need to deduct bet
        const isCreator = gameState.playerRole === 'creator';
        const betAlreadyDeducted = isCreator ? 
            gameData.creator_bet_deducted : 
            gameData.opponent_bet_deducted;

        if (!betAlreadyDeducted) {
            // For creator: deduct immediately when loading the game
            // For opponent: deduct only if joining an existing game
            if (isCreator || gameData.creator_phone) {
                await deductBetAmount();
            }
        } else {
            gameState.betDeducted = true;
        }

        if (gameState.gameStatus === 'finished') {
            showFinalResult(gameData);
        } else if (gameState.gameStatus === 'cancelled') {
            handleGameCancellation();
        }

        updateGameUI();

    } catch (error) {
        console.error('Game load error:', error);
        displayMessage(gameStatusMessage, `Failed to load game: ${error.message}`, 'error');
        setTimeout(() => window.location.href = '/', 3000);
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    copyCodeBtn.addEventListener('click', copyGameCode);
    
    columnButtons.forEach((button, col) => {
        button.addEventListener('click', () => dropPiece(col));
    });
    
    leaveGameBtn.addEventListener('click', () => leaveGame());
    
    resultCloseBtn.addEventListener('click', () => {
        gameResultModal.classList.remove('active');
        window.location.href = '/';
    });
    
    modalCloseBtn.addEventListener('click', () => {
        gameResultModal.classList.remove('active');
    });
    
    watchGameBtn.addEventListener('click', () => {
        gameResultModal.classList.remove('active');
        displayMessage(gameStatusMessage, 'Viewing completed game', 'info');
    });
    
    backBtn.addEventListener('click', async () => {
        if (gameState.gameStatus === 'finished') {
            window.location.href = '/';
        } else {
            await leaveGame();
        }
    });

    // Initialize audio on first user interaction
    document.addEventListener('click', initializeAudio, { once: true });
    document.addEventListener('touchstart', initializeAudio, { once: true });
}

// --- Initialize Game ---
async function initializeGame() {
    const params = new URLSearchParams(window.location.search);
    gameState.gameCode = params.get('code');

    if (!gameState.gameCode) {
        displayMessage(gameStatusMessage, 'No game code provided', 'error');
        return;
    }

    gameCodeDisplay.textContent = gameState.gameCode;
    initializeBoard();
    setupEventListeners();

    await loadGameData();
    setupRealtimeUpdates();
}

// --- Page Unload Handling ---
window.addEventListener('beforeunload', async (e) => {
    if (gameState.gameStatus === 'finished') return;
    
    const isCreator = gameState.playerRole === 'creator';
    const opponentJoined = !!gameState.opponent.phone;
    
    try {
        // Get current game state to check moves
        const { data: gameData } = await supabase
            .from('connect_four_games')
            .select('moves, creator_bet_deducted, opponent_bet_deducted')
            .eq('code', gameState.gameCode)
            .single();

        const movesMade = gameData.moves && gameData.moves.length > 0;
        const betDeducted = isCreator ? 
            gameData.creator_bet_deducted : 
            gameData.opponent_bet_deducted;

        if (isCreator && !opponentJoined && !movesMade && betDeducted) {
            // Process refund for creator leaving before opponent joins
            const refundAmount = gameState.betAmount;
            
            await recordTransaction({
                player_phone: gameState.creator.phone,
                transaction_type: 'refund',
                amount: refundAmount,
                description: `Refund for unfinished Connect Four game (page closed)`,
                status: 'completed'
            });

            await supabase
                .from('connect_four_games')
                .update({ 
                    creator_refunded: true,
                    status: 'cancelled',
                    result: 'early_exit_refund'
                })
                .eq('code', gameState.gameCode);
        }
    } catch (error) {
        console.error('Error handling page unload:', error);
    }
});
document.addEventListener('DOMContentLoaded', initializeGame);

