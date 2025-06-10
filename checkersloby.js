// Import Socket.IO and Supabase from CDN
import { io } from 'https://cdn.socket.io/4.4.1/socket.io.esm.min.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Setup
const supabaseUrl = "https://evberyanshxxalxtwnnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmVyeWFuc2h4eGFseHR3bm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwOTcsImV4cCI6MjA1OTY1OTA5N30.pEoPiIi78Tvl5URw0Xy_vAxsd-3XqRlC8FTnX9HpgMw";
const supabase = createClient(supabaseUrl, supabaseKey);

// Game State Management
class CheckersGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'red';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.capturedPieces = { red: [], black: [] };
        this.gameStatus = 'playing';
        this.winner = null;
        this.moveHistory = [];
        this.isMultiplayer = false;
        this.playerColor = 'red';
        this.gameCode = '';
        this.isConnected = false;
        this.socket = null;
        this.timeRemaining = { red: 600, black: 600 }; // 10 minutes each
        this.timerInterval = null;
        this.mustCapture = false;
        this.multipleCaptures = [];
        this.gameData = null;
        this.betAmount = 0;
        this.userPhone = localStorage.getItem('phone');
        
        this.initializeDOM();
        this.initializeGame();
        this.startTimer();
    }
    
    initializeBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place red pieces (bottom of board)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = { color: 'red', king: false };
                }
            }
        }
        
        // Place black pieces (top of board)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = { color: 'black', king: false };
                }
            }
        }
        
        return board;
    }
    
    initializeDOM() {
        this.boardElement = document.getElementById('board');
        this.gameStatusElement = document.getElementById('game-status');
        this.redTimeElement = document.getElementById('red-time');
        this.blackTimeElement = document.getElementById('black-time');
        this.moveHistoryElement = document.getElementById('move-history');
        this.currentTurnElement = document.getElementById('current-turn');
        this.moveCountElement = document.getElementById('move-count');
        this.captureCountElement = document.getElementById('capture-count');
        this.errorDisplay = document.getElementById('error-display');
        this.waitingOverlay = document.getElementById('waiting-overlay');
        this.gameResultModal = document.getElementById('game-result-modal');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Board click handler
        this.boardElement.addEventListener('click', (e) => this.handleSquareClick(e));
        
        // Control buttons
        document.getElementById('new-game')?.addEventListener('click', () => this.newGame());
        document.getElementById('offer-draw')?.addEventListener('click', () => this.offerDraw());
        document.getElementById('resign')?.addEventListener('click', () => this.resign());
        
        // Copy buttons
        document.getElementById('copy-code')?.addEventListener('click', () => this.copyGameCode());
        document.getElementById('copy-share-code')?.addEventListener('click', () => this.copyGameCode());
        
        // Modal close
        document.getElementById('result-close-btn')?.addEventListener('click', () => this.closeResultModal());
        
        // Back button
        document.getElementById('back-btn')?.addEventListener('click', () => this.goBack());
    }
    
    async initializeGame() {
        // Check URL parameters for multiplayer
        const urlParams = new URLSearchParams(window.location.search);
        const gameCode = urlParams.get('code');
        const playerColor = urlParams.get('color');
        
        if (gameCode && playerColor) {
            await this.initializeMultiplayer(gameCode, playerColor);
        } else {
            this.initializeLocalGame();
        }
    }
    
    initializeLocalGame() {
        this.isMultiplayer = false;
        this.gameStatus = 'playing';
        this.renderBoard();
        this.updateUI();
        this.hideOverlay();
        
        // Update game code display
        document.getElementById('game-code-text').textContent = 'Local Game';
        document.getElementById('connection-status').innerHTML = 
            '<span class="status-icon" style="color: #6b7280;">●</span><span class="status-text">Local Game</span>';
    }
    
    async initializeMultiplayer(gameCode, playerColor) {
        this.isMultiplayer = true;
        this.gameCode = gameCode;
        this.playerColor = playerColor;
        this.gameStatus = 'waiting';
        
        try {
            // Load game data from Supabase
            await this.loadGameFromDatabase();
            
            // Initialize Socket.IO connection
            this.socket = io('https://chess-game-production-9494.up.railway.app', {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000,
                transports: ['websocket'],
                secure: true,
                withCredentials: true
            });
            
            this.setupSocketEvents();
            this.socket.emit('joinGame', this.gameCode, 'checkers');
            
            // Update UI for multiplayer
            document.getElementById('game-code-text').textContent = gameCode;
            document.getElementById('share-game-code').textContent = gameCode;
            
            if (this.gameData.status === 'waiting') {
                this.showWaitingOverlay();
            } else {
                this.hideWaitingOverlay();
                this.gameStatus = 'playing';
            }
            
            this.updatePlayerInfo();
            this.renderBoard();
            this.updateUI();
            
        } catch (error) {
            console.error('Error initializing multiplayer game:', error);
            this.showError('Failed to load game data');
        }
    }
    
    async loadGameFromDatabase() {
        try {
            const { data, error } = await supabase
                .from('checkers_games')
                .select('*')
                .eq('code', this.gameCode)
                .single();
            
            if (error) throw error;
            if (!data) throw new Error('Game not found');
            
            this.gameData = data;
            this.betAmount = data.bet;
            
            // Load board state if available
            if (data.board_state && data.board_state.pieces) {
                this.loadBoardFromState(data.board_state);
            }
            
            this.currentPlayer = data.turn || 'red';
            this.gameStatus = data.status === 'ongoing' ? 'playing' : data.status;
            
        } catch (error) {
            console.error('Error loading game from database:', error);
            throw error;
        }
    }
    
    loadBoardFromState(boardState) {
        // Clear the board
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place pieces from the saved state
        if (boardState.pieces) {
            boardState.pieces.forEach(piece => {
                const { row, col } = this.positionToRowCol(piece.position);
                this.board[row][col] = {
                    color: piece.color,
                    king: piece.isKing || false
                };
            });
        }
        
        // Load captured pieces if available
        if (boardState.capturedPieces) {
            this.capturedPieces = boardState.capturedPieces;
        }
    }
    
    positionToRowCol(position) {
        // Convert position like "A1" to row/col coordinates
        const col = position.charCodeAt(0) - 65; // A=0, B=1, etc.
        const row = 8 - parseInt(position[1]); // 8=0, 7=1, etc.
        return { row, col };
    }
    
    rowColToPosition(row, col) {
        // Convert row/col to position like "A1"
        const colLetter = String.fromCharCode(65 + col);
        const rowNumber = 8 - row;
        return colLetter + rowNumber;
    }
    
    updatePlayerInfo() {
        if (!this.gameData) return;
        
        const redUsernameElement = document.getElementById('red-username');
        const blackUsernameElement = document.getElementById('black-username');
        
        if (redUsernameElement) {
            redUsernameElement.textContent = this.gameData.red_username || 'Red Player';
        }
        if (blackUsernameElement) {
            blackUsernameElement.textContent = this.gameData.black_username || 'Black Player';
        }
    }
    
    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.updateConnectionStatus();
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus();
        });
        
        this.socket.on('gameState', (gameData) => {
            this.handleGameState(gameData);
        });
        
        this.socket.on('gameUpdate', (update) => {
            this.handleGameUpdate(update);
        });
        
        this.socket.on('gameReady', () => {
            this.hideWaitingOverlay();
            this.gameStatus = 'playing';
            this.updateUI();
            this.showNotification('Game started! Red player goes first.');
        });
        
        this.socket.on('moveError', (error) => {
            this.showError(error);
        });
        
        this.socket.on('gameOver', (result) => {
            this.handleGameOver(result);
        });
    }
    
    renderBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Only dark squares are playable in checkers
                if ((row + col) % 2 === 1) {
                    square.classList.add('playable');
                }
                
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = this.createPieceElement(piece);
                    square.appendChild(pieceElement);
                }
                
                this.boardElement.appendChild(square);
            }
        }
        
        this.highlightLegalMoves();
    }
    
    createPieceElement(piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${piece.color}`;
        
        if (piece.king) {
            pieceElement.classList.add('king');
        }
        
        return pieceElement;
    }
    
    handleSquareClick(event) {
        if (this.gameStatus !== 'playing') return;
        
        const square = event.target.closest('.square');
        if (!square) return;
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        // In multiplayer, only allow moves for current player
        if (this.isMultiplayer && this.currentPlayer !== this.playerColor) {
            this.showError("It's not your turn!");
            return;
        }
        
        if (this.selectedSquare) {
            this.tryMakeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
        } else {
            this.selectSquare(row, col);
        }
    }
    
    selectSquare(row, col) {
        const piece = this.board[row][col];
        
        // Can only select own pieces
        if (!piece || piece.color !== this.currentPlayer) {
            return;
        }
        
        // Check if there are mandatory captures
        const allCaptures = this.getAllCapturesForPlayer(this.currentPlayer);
        if (allCaptures.length > 0) {
            const pieceCaptures = this.getCaptureMoves(row, col);
            if (pieceCaptures.length === 0) {
                this.showError('You must capture when possible!');
                return;
            }
        }
        
        this.selectedSquare = { row, col };
        this.legalMoves = this.getLegalMoves(row, col);
        this.renderBoard();
        this.highlightSelectedSquare(row, col);
    }
    
    async tryMakeMove(fromRow, fromCol, toRow, toCol) {
        const move = this.legalMoves.find(m => m.toRow === toRow && m.toCol === toCol);
        
        if (!move) {
            this.selectedSquare = null;
            this.legalMoves = [];
            this.renderBoard();
            return;
        }
        
        await this.makeMove(move);
    }
    
    async makeMove(move) {
        const { fromRow, fromCol, toRow, toCol, captures, promotion } = move;
        const piece = this.board[fromRow][fromCol];
        
        // Move the piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle captures
        if (captures && captures.length > 0) {
            captures.forEach(({ row, col }) => {
                const capturedPiece = this.board[row][col];
                this.capturedPieces[piece.color].push(capturedPiece);
                this.board[row][col] = null;
            });
        }
        
        // Handle king promotion
        if (promotion || this.shouldPromoteToKing(piece, toRow)) {
            piece.king = true;
        }
        
        // Add to move history
        this.addMoveToHistory(move);
        
        // Clear selection
        this.selectedSquare = null;
        this.legalMoves = [];
        
        // Check for additional captures
        const additionalCaptures = this.getCaptureMoves(toRow, toCol);
        if (captures && captures.length > 0 && additionalCaptures.length > 0) {
            // Force additional capture with same piece
            this.selectedSquare = { row: toRow, col: toCol };
            this.legalMoves = additionalCaptures;
            this.mustCapture = true;
        } else {
            // Switch turns
            this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
            this.mustCapture = false;
            
            // Check for game over
            this.checkGameOver();
        }
        
        // Save game state to database and send to server if multiplayer
        if (this.isMultiplayer) {
            await this.saveGameState();
            
            if (this.socket) {
                this.socket.emit('checkersMove', {
                    gameCode: this.gameCode,
                    move: move,
                    gameState: this.getGameState()
                });
            }
        }
        
        this.renderBoard();
        this.updateUI();
        this.playMoveSound(captures && captures.length > 0);
    }
    
    async saveGameState() {
        try {
            const boardState = {
                pieces: [],
                turn: this.currentPlayer,
                capturedPieces: this.capturedPieces
            };
            
            // Convert board to pieces array
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece) {
                        boardState.pieces.push({
                            position: this.rowColToPosition(row, col),
                            color: piece.color,
                            isKing: piece.king
                        });
                    }
                }
            }
            
            const { error } = await supabase
                .from('checkers_games')
                .update({
                    board_state: boardState,
                    turn: this.currentPlayer,
                    status: this.gameStatus
                })
                .eq('code', this.gameCode);
            
            if (error) throw error;
            
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
    
    getLegalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        // Check for mandatory captures first
        const captures = this.getCaptureMoves(row, col);
        if (captures.length > 0) {
            return captures;
        }
        
        // If no captures, check for regular moves
        const allCaptures = this.getAllCapturesForPlayer(piece.color);
        if (allCaptures.length > 0) {
            return []; // Must capture if captures are available
        }
        
        return this.getRegularMoves(row, col);
    }
    
    getCaptureMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        const directions = this.getMoveDirections(piece);
        
        for (const [dr, dc] of directions) {
            const captureRow = row + dr;
            const captureCol = col + dc;
            const landRow = row + (dr * 2);
            const landCol = col + (dc * 2);
            
            if (this.isValidPosition(captureRow, captureCol) && 
                this.isValidPosition(landRow, landCol)) {
                
                const capturedPiece = this.board[captureRow][captureCol];
                const landSquare = this.board[landRow][landCol];
                
                if (capturedPiece && 
                    capturedPiece.color !== piece.color && 
                    !landSquare) {
                    
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: landRow,
                        toCol: landCol,
                        captures: [{ row: captureRow, col: captureCol }],
                        promotion: this.shouldPromoteToKing(piece, landRow)
                    });
                }
            }
        }
        
        return moves;
    }
    
    getRegularMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        const directions = this.getMoveDirections(piece);
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({
                    fromRow: row,
                    fromCol: col,
                    toRow: newRow,
                    toCol: newCol,
                    captures: [],
                    promotion: this.shouldPromoteToKing(piece, newRow)
                });
            }
        }
        
        return moves;
    }
    
    getMoveDirections(piece) {
        if (piece.king) {
            return [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // All diagonal directions
        } else {
            return piece.color === 'red' 
                ? [[1, -1], [1, 1]]   // Red moves down
                : [[-1, -1], [-1, 1]]; // Black moves up
        }
    }
    
    getAllCapturesForPlayer(color) {
        const captures = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    captures.push(...this.getCaptureMoves(row, col));
                }
            }
        }
        
        return captures;
    }
    
    shouldPromoteToKing(piece, row) {
        if (piece.king) return false;
        return (piece.color === 'red' && row === 7) || (piece.color === 'black' && row === 0);
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    highlightLegalMoves() {
        if (!this.selectedSquare || !this.legalMoves) return;
        
        this.legalMoves.forEach(move => {
            const square = this.getSquareElement(move.toRow, move.toCol);
            if (square) {
                square.classList.add('legal-move');
            }
        });
    }
    
    highlightSelectedSquare(row, col) {
        const square = this.getSquareElement(row, col);
        if (square) {
            square.classList.add('selected');
        }
    }
    
    getSquareElement(row, col) {
        return this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    checkGameOver() {
        const redPieces = this.countPieces('red');
        const blackPieces = this.countPieces('black');
        const currentPlayerMoves = this.getAllMovesForPlayer(this.currentPlayer);
        
        if (redPieces === 0) {
            this.endGame('black', 'All red pieces captured');
        } else if (blackPieces === 0) {
            this.endGame('red', 'All black pieces captured');
        } else if (currentPlayerMoves.length === 0) {
            const winner = this.currentPlayer === 'red' ? 'black' : 'red';
            this.endGame(winner, 'No legal moves available');
        }
    }
    
    countPieces(color) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    count++;
                }
            }
        }
        return count;
    }
    
    getAllMovesForPlayer(color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    moves.push(...this.getLegalMoves(row, col));
                }
            }
        }
        
        return moves;
    }
    
    async endGame(winner, reason) {
        this.gameStatus = 'finished';
        this.winner = winner;
        this.stopTimer();
        
        // Update game in database
        if (this.isMultiplayer) {
            await this.updateGameResult(winner, reason);
        }
        
        this.showGameResult({
            winner: winner,
            reason: reason,
            isWinner: !this.isMultiplayer || winner === this.playerColor
        });
        
        this.updateUI();
    }
    
    async updateGameResult(winner, reason) {
        try {
            // Update game status in database
            const { error: gameError } = await supabase
                .from('checkers_games')
                .update({
                    status: 'finished',
                    winner: winner
                })
                .eq('code', this.gameCode);
            
            if (gameError) throw gameError;
            
            // Update user balances
            const winnerPhone = winner === 'red' ? this.gameData.red_phone : this.gameData.black_phone;
            const loserPhone = winner === 'red' ? this.gameData.black_phone : this.gameData.red_phone;
            
            if (winnerPhone && loserPhone) {
                const winnings = this.betAmount * 1.8; // 80% return to winner
                
                // Get current balances
                const { data: winnerData } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('phone', winnerPhone)
                    .single();
                
                if (winnerData) {
                    // Update winner's balance
                    await supabase
                        .from('users')
                        .update({ balance: winnerData.balance + winnings })
                        .eq('phone', winnerPhone);
                }
            }
            
        } catch (error) {
            console.error('Error updating game result:', error);
        }
    }
    
    addMoveToHistory(move) {
        const moveNotation = this.getMoveNotation(move);
        this.moveHistory.push(moveNotation);
        
        const moveElement = document.createElement('div');
        moveElement.className = 'move-entry';
        moveElement.textContent = `${this.moveHistory.length}. ${moveNotation}`;
        
        this.moveHistoryElement.appendChild(moveElement);
        this.moveHistoryElement.scrollTop = this.moveHistoryElement.scrollHeight;
    }
    
    getMoveNotation(move) {
        const { fromRow, fromCol, toRow, toCol, captures } = move;
        const fromSquare = this.getSquareNotation(fromRow, fromCol);
        const toSquare = this.getSquareNotation(toRow, toCol);
        
        if (captures && captures.length > 0) {
            return `${fromSquare}x${toSquare}`;
        } else {
            return `${fromSquare}-${toSquare}`;
        }
    }
    
    getSquareNotation(row, col) {
        const file = String.fromCharCode(97 + col); // a-h
        const rank = 8 - row; // 8-1
        return file + rank;
    }
    
    updateUI() {
        // Update game status
        if (this.gameStatus === 'finished') {
            this.gameStatusElement.textContent = `Game Over - ${this.winner} wins!`;
        } else if (this.gameStatus === 'waiting') {
            this.gameStatusElement.textContent = 'Waiting for opponent...';
        } else {
            this.gameStatusElement.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
        }
        
        // Update timers
        this.redTimeElement.textContent = this.formatTime(this.timeRemaining.red);
        this.blackTimeElement.textContent = this.formatTime(this.timeRemaining.black);
        
        // Update sidebar stats
        this.currentTurnElement.textContent = this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        this.moveCountElement.textContent = this.moveHistory.length;
        this.captureCountElement.textContent = `Red: ${this.capturedPieces.red.length}, Black: ${this.capturedPieces.black.length}`;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.gameStatus === 'playing') {
                this.timeRemaining[this.currentPlayer]--;
                
                if (this.timeRemaining[this.currentPlayer] <= 0) {
                    const winner = this.currentPlayer === 'red' ? 'black' : 'red';
                    this.endGame(winner, 'Time expired');
                }
                
                this.updateUI();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (this.isConnected) {
            statusElement.innerHTML = '<span class="status-icon" style="color: #10b981;">●</span><span class="status-text">Online</span>';
        } else {
            statusElement.innerHTML = '<span class="status-icon" style="color: #ef4444;">●</span><span class="status-text">Offline</span>';
        }
    }
    
    showWaitingOverlay() {
        this.waitingOverlay.classList.remove('hidden');
    }
    
    hideWaitingOverlay() {
        this.waitingOverlay.classList.add('hidden');
    }
    
    hideOverlay() {
        const overlay = document.getElementById('game-status-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
            this.errorDisplay.classList.remove('hidden');
            
            setTimeout(() => {
                this.errorDisplay.classList.add('hidden');
            }, 3000);
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: linear-gradient(135deg, #059669, #047857);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(5, 150, 105, 0.4);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showGameResult(result) {
        const modal = this.gameResultModal;
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const icon = document.getElementById('result-icon');
        const amount = document.getElementById('result-amount');
        
        if (result.isWinner) {
            title.textContent = 'Victory!';
            message.textContent = `You won! ${result.reason}`;
            icon.textContent = '🏆';
            if (this.betAmount > 0) {
                const winnings = this.betAmount * 1.8;
                amount.textContent = `+${winnings.toLocaleString()} ETB`;
                amount.className = 'result-amount win';
            }
        } else {
            title.textContent = 'Defeat';
            message.textContent = `You lost. ${result.reason}`;
            icon.textContent = '😔';
            if (this.betAmount > 0) {
                amount.textContent = `-${this.betAmount.toLocaleString()} ETB`;
                amount.className = 'result-amount lose';
            }
        }
        
        modal.classList.add('active');
    }
    
    closeResultModal() {
        this.gameResultModal.classList.remove('active');
    }
    
    playMoveSound(isCapture) {
        // Create audio context for sound effects
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(isCapture ? 800 : 400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Fallback for browsers that don't support Web Audio API
            console.log('Audio not supported');
        }
    }
    
    // Game control methods
    newGame() {
        if (this.isMultiplayer) {
            this.showError('Cannot start new game in multiplayer mode');
            return;
        }
        
        this.board = this.initializeBoard();
        this.currentPlayer = 'red';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.capturedPieces = { red: [], black: [] };
        this.gameStatus = 'playing';
        this.winner = null;
        this.moveHistory = [];
        this.timeRemaining = { red: 600, black: 600 };
        this.mustCapture = false;
        
        this.moveHistoryElement.innerHTML = '';
        this.renderBoard();
        this.updateUI();
        this.startTimer();
        this.closeResultModal();
    }
    
    offerDraw() {
        if (!this.isMultiplayer) {
            this.showError('Draw offers only available in multiplayer');
            return;
        }
        
        if (confirm('Offer a draw to your opponent?')) {
            this.socket.emit('offerDraw', { gameCode: this.gameCode });
        }
    }
    
    resign() {
        if (confirm('Are you sure you want to resign?')) {
            if (this.isMultiplayer) {
                this.socket.emit('resign', { gameCode: this.gameCode });
            } else {
                const winner = this.currentPlayer === 'red' ? 'black' : 'red';
                this.endGame(winner, 'Resignation');
            }
        }
    }
    
    copyGameCode() {
        if (this.gameCode) {
            navigator.clipboard.writeText(this.gameCode).then(() => {
                this.showNotification('Game code copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy game code');
            });
        }
    }
    
    goBack() {
        if (this.gameStatus === 'playing' && !confirm('Are you sure you want to leave the game?')) {
            return;
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.stopTimer();
        window.history.back();
    }
    
    // Multiplayer event handlers
    handleGameState(gameData) {
        this.board = gameData.board || this.initializeBoard();
        this.currentPlayer = gameData.currentPlayer || 'red';
        this.capturedPieces = gameData.capturedPieces || { red: [], black: [] };
        this.gameStatus = gameData.status || 'playing';
        this.moveHistory = gameData.moveHistory || [];
        
        this.renderBoard();
        this.updateUI();
        
        if (this.gameStatus === 'playing') {
            this.hideWaitingOverlay();
        }
    }
    
    handleGameUpdate(update) {
        if (update.gameState) {
            this.handleGameState(update.gameState);
        }
        
        if (update.move) {
            this.addMoveToHistory(update.move);
            this.playMoveSound(update.move.captures && update.move.captures.length > 0);
        }
    }
    
    handleGameOver(result) {
        this.endGame(result.winner, result.reason);
    }
    
    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            capturedPieces: this.capturedPieces,
            status: this.gameStatus,
            winner: this.winner,
            moveHistory: this.moveHistory,
            timeRemaining: this.timeRemaining
        };
    }
}

// Global error handler
function hideError() {
    document.getElementById('error-display').classList.add('hidden');
}

// Global modal handler
function closeResultModal() {
    document.getElementById('game-result-modal').classList.remove('active');
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkersGame = new CheckersGame();
});

// Export for potential use in other modules
export { CheckersGame };
