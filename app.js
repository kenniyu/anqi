var express = require('express'),
	app = express(),
	http = require('http'), 
	server = http.createServer(app), 
	io = require('socket.io').listen(server);

server.listen(3000);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({secret: "anqi"}));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes


app.get('/', function(req, res) {
	res.render('index');
});

app.get('/rules', function(req, res){
	res.render('rules');
});


// app vars
var socketsHash	= {},
	clientsHash = {},
	colors 		= ["#84C0DE", "#A59DC9", "#9AC77D"],
	gameState 	= {
		'waitingPlayers': [],
		'status': 'waiting',
		'currentPlayers': [],
		'currentTurnCounter': 1
	},
	NUM_SHUFFLES = 10,
	NUM_ROWS = 8,
	NUM_COLS = 4,
	userCounter	= 1,
	everyone 	= io.sockets,
	chessPieces	= {
		'redGeneral': {	id: 'redGeneral', name: 'general', color: 'red', status: 'hidden', teamEnum: 0, rank: 1 },
		'redAdvisor1': { id: 'redAdvisor1', name: 'advisor', color: 'red', status: 'hidden', teamEnum: 0, rank: 2 },
		'redAdvisor2': { id: 'redAdvisor2', name: 'advisor', color: 'red', status: 'hidden', teamEnum: 0, rank: 2 },
		'redElephant1': { id: 'redElephant1', name: 'elephant', color: 'red', status: 'hidden', teamEnum: 0, rank: 3 },
		'redElephant2': { id: 'redElephant2', name: 'elephant', color: 'red', status: 'hidden', teamEnum: 0, rank: 3 },
		'redHorse1': { id: 'redHorse1', name: 'horse', color: 'red', status: 'hidden', teamEnum: 0, rank: 5 },
		'redHorse2': { id: 'redHorse2', name: 'horse', color: 'red', status: 'hidden', teamEnum: 0, rank: 5 },
		'redChariot1': { id: 'redChariot1', name: 'chariot', color: 'red', status: 'hidden', teamEnum: 0, rank: 4 },
		'redChariot2': { id: 'redChariot2', name: 'chariot', color: 'red', status: 'hidden', teamEnum: 0, rank: 4 },
		'redCannon1': { id: 'redCannon1', name: 'cannon', color: 'red', status: 'hidden', teamEnum: 0, rank: 6 },
		'redCannon2': { id: 'redCannon2', name: 'cannon', color: 'red', status: 'hidden', teamEnum: 0, rank: 6 },
		'redSoldier1': { id: 'redSoldier1', name: 'soldier', color: 'red', status: 'hidden', teamEnum: 0, rank: 7 },
		'redSoldier2': { id: 'redSoldier2', name: 'soldier', color: 'red', status: 'hidden', teamEnum: 0, rank: 7 },
		'redSoldier3': { id: 'redSoldier3', name: 'soldier', color: 'red', status: 'hidden', teamEnum: 0, rank: 7 },
		'redSoldier4': { id: 'redSoldier4', name: 'soldier', color: 'red', status: 'hidden', teamEnum: 0, rank: 7 },
		'redSoldier5': { id: 'redSoldier5', name: 'soldier', color: 'red', status: 'hidden', teamEnum: 0, rank: 7 },
		'blackGeneral': { id: 'blackGeneral', name: 'general', color: 'black', status: 'hidden', teamEnum: 1, rank: 1 },
		'blackAdvisor1': { id: 'blackAdvisor1', name: 'advisor', color: 'black', status: 'hidden', teamEnum: 1, rank: 2 },
		'blackAdvisor2': { id: 'blackAdvisor2', name: 'advisor', color: 'black', status: 'hidden', teamEnum: 1, rank: 2 },
		'blackElephant1': { id: 'blackElephant1', name: 'elephant', color: 'black', status: 'hidden', teamEnum: 1, rank: 3 },
		'blackElephant2': { id: 'blackElephant2', name: 'elephant', color: 'black', status: 'hidden', teamEnum: 1, rank: 3 },
		'blackHorse1': { id: 'blackHorse1', name: 'horse', color: 'black', status: 'hidden', teamEnum: 1, rank: 5 },
		'blackHorse2': { id: 'blackHorse2', name: 'horse', color: 'black', status: 'hidden', teamEnum: 1, rank: 5 },
		'blackChariot1': { id: 'blackChariot1', name: 'chariot', color: 'black', status: 'hidden', teamEnum: 1, rank: 4 },
		'blackChariot2': { id: 'blackChariot2', name: 'chariot', color: 'black', status: 'hidden', teamEnum: 1, rank: 4 },
		'blackCannon1': { id: 'blackCannon1', name: 'cannon', color: 'black', status: 'hidden', teamEnum: 1, rank: 6 },
		'blackCannon2': { id: 'blackCannon2', name: 'cannon', color: 'black', status: 'hidden', teamEnum: 1, rank: 6 },
		'blackSoldier1': { id: 'blackSoldier1', name: 'soldier', color: 'black', status: 'hidden', teamEnum: 1, rank: 7 },
		'blackSoldier2': { id: 'blackSoldier2', name: 'soldier', color: 'black', status: 'hidden', teamEnum: 1, rank: 7 },
		'blackSoldier3': { id: 'blackSoldier3', name: 'soldier', color: 'black', status: 'hidden', teamEnum: 1, rank: 7 },
		'blackSoldier4': { id: 'blackSoldier4', name: 'soldier', color: 'black', status: 'hidden', teamEnum: 1, rank: 7 },
		'blackSoldier5': { id: 'blackSoldier5', name: 'soldier', color: 'black', status: 'hidden', teamEnum: 1, rank: 7 }
	},
	gameBoard;
	
// when a client connects
io.sockets.on('connection', function (socket) {
	clientsHash[socket['id']] = socket;
	
	console.log('socket id = '+socket['id']);
	socket.set('clientId', socket['id'], function() {
		socketsHash[socket['id']] = socket['store']['data'];
	});
	
	
	// when a client connects, set its nickname automatically...
	socket.set('nickname', 'player'+userCounter, function () {
		socket.set('color', colors[userCounter%colors.length], function () {
			socket.set('status', 'waiting', function() {
				// ... and then update the users list for all sockets
				updateUsersList();	
			});
		});
	});
	socket.emit('display-board', gameBoard);
	
	userCounter++;

	// received
	socket.on('set-nickname', function (name) {
		setNickname(socket, name);
	});
	
	socket.on('submit-player-ready', function () {
		var socketData = socketsHash[socket['id']],
			numWaitingPlayers,
			gameStatus,
			readyPlayer;
		
		// set status of the user to ready, then push this user to waitingPlayers, and update users list
		// make sure user is not already ready
		if (socketData['status'] == 'waiting') {
			socketData['status'] = 'ready';
			gameState['waitingPlayers'].push(socketData);
			
			updateUsersList();

			numWaitingPlayers 	= gameState['waitingPlayers'].length;
			gameStatus			= gameState['status'];
			
			
			if (numWaitingPlayers == 2 && gameStatus == 'waiting') {
				// start the game with these two players. move them to currentPlayers
				for (var i = 0; i < numWaitingPlayers; i++) {
					readyPlayer = gameState['waitingPlayers'].splice(0, 1)[0];
					gameState['currentPlayers'].push( readyPlayer );
				}
				console.log(gameState['currentPlayers']);
				gameState['status'] = 'playing';
				// initialize the game board
				initGameBoard();
				// alert the next player
				alertNextPlayer();
				
			} else {
				// for this user, hide the ready up button
				socket.emit('submit-player-ready-callback', {});	
			}
		}

	});
	
	socket.on('submit-chat', function (message, messageType) {
		submitChat(socket, message, messageType);
	});
	
	socket.on('show-piece', function (locHash) {
		showPiece(socket, locHash);
	});
	
	socket.on('move-piece', function (moveHash) {
		initLocHash = moveHash['initLocHash'];
		finalLocHash = moveHash['finalLocHash'];
		movePiece(socket, initLocHash, finalLocHash);
	});
	
	socket.on('disconnect', function () {
		var gameStatus = gameState['status'];
		delete socketsHash[socket['id']];
		if (gameStatus == 'playing') {
			console.log('current players are ');
			console.log(gameState['currentPlayers']);
			// end the game, reset gameStatus
			gameStatus = 'waiting';
		} else {
			// was not playing
		}
		updateUsersList();
	});
});

function isTurn(socket) {
	var socketId 				= socket['id'],
		currentTurnCounter 		= gameState['currentTurnCounter'],
		currentPlayers			= gameState['currentPlayers'],
		currentPlayer			= currentPlayers[currentTurnCounter%2],
		currentPlayerClientId	= currentPlayer['clientId'];
			
	return (socketId == currentPlayerClientId);
}

function showPiece(socket, locHash) {
	if (isTurn(socket)) {
		var row = locHash['row'],
			col = locHash['col'],
			message,
			socketData,
			socketId = socket['id'],
			currentPlayerTeamEnum,
			chessPiece;

		if (gameBoard[row][col]['status'] && gameBoard[row][col]['status'] === 'hidden') {
			gameBoard[row][col]['status'] = 'active';
			
			socketData = socketsHash[socketId];
			if (socketData['teamEnum'] === undefined) {
				// set this socket's teamEnum
				currentPlayerTeamEnum = gameBoard[row][col]['teamEnum'];
				socketData['teamEnum'] = currentPlayerTeamEnum;
				socket.set('teamEnum', currentPlayerTeamEnum);
				
				console.log('socketData[teamenum] = ' + socketData['teamEnum']);
				
				
				// set other socket's teamEnum
				otherPlayerTeamEnum = (currentPlayerTeamEnum == 0 ? 1 : 0);
				var currentTurnCounter 		= gameState['currentTurnCounter'],
					currentPlayers			= gameState['currentPlayers'],
					otherPlayer				= currentPlayers[(currentTurnCounter+1)%2],
					otherSocketId			= otherPlayer['clientId'],
					otherSocket				= getClientById(otherSocketId);
				socketsHash[otherSocketId]['teamEnum'] = otherPlayerTeamEnum;
				otherSocket.set('teamEnum', otherPlayerTeamEnum);
				console.log('socketData[teamEnum] = ' + otherPlayerTeamEnum);
				
				// set all colors of the chessPieces for this socket's enum
				for (var chessPieceName in chessPieces) {
					chessPiece = chessPieces[chessPieceName];
					if (chessPiece['teamEnum'] === socketData['teamEnum']) {
						chessPiece['color'] = socketData['color'];
					} else {
						chessPiece['color'] = socketsHash[otherSocketId]['color'];
					}
				}
				console.log(gameBoard);
			}
			
			parseAndDisplayBoard();
			alertNextPlayer();
		} else {
			message = 'Bad move. Try again.'
			broadcastGameFeedback(message, socket);	
		}
	} else {
		message = 'It is not your move yet!'
		broadcastGameFeedback(message, socket);
	}
}

function canMovePiece(socket, initLocHash, finalLocHash) {
	// get piece at loc
	var initRow = initLocHash['row'],
		initCol = initLocHash['col'],
		finalRow = finalLocHash['row'],
		finalCol = finalLocHash['col'],
		socketData = socketsHash[socket['id']],
		teamEnum = socketData['teamEnum'],
		chessPiece = gameBoard[initRow][initCol],
		chessPieceTeamEnum;
	
	// valid init and final locations?
	if (initRow < 0 || initRow >= NUM_ROWS || initCol < 0 || initCol >= NUM_COLS || finalRow < 0 || finalRow >= NUM_ROWS || finalCol < 0 || finalCol >= NUM_COLS || initLocHash == finalLocHash) {
		console.log('out of bounds');
		console.log(initLocHash == finalLocHash);
		return false;
	}
	
	// valid team piece?
	if ( chessPiece['status'] != 'empty' ) {
		chessPieceTeamEnum = chessPiece['teamEnum'];
	}
	console.log(teamEnum === chessPieceTeamEnum);
	return (teamEnum === chessPieceTeamEnum);
}

function movePiece(socket, initLocHash, finalLocHash) {
	var canMoveByRules = false,
		initRow = initLocHash['row'],
		initCol = initLocHash['col'],
		finalRow = finalLocHash['row'],
		finalCol = finalLocHash['col'];
		
	if (isTurn(socket)) {
		if ( canMovePiece(socket, initLocHash, finalLocHash) ) {
			// check rules
			canMoveByRules = checkRules(socket, initLocHash, finalLocHash);
			if (canMoveByRules) {
				gameBoard[finalRow][finalCol] = gameBoard[initRow][initCol];
				gameBoard[initRow][initCol] = {'status': 'empty'};
				parseAndDisplayBoard();
				alertNextPlayer();
			}
		} else {
			message = 'You cannot move that piece!'
			broadcastGameFeedback(message, socket);
		}
	} else {
		message = 'It is not your move yet!'
		broadcastGameFeedback(message, socket);
	}
}

function checkRules(socket, initLocHash, finalLocHash) {
	console.log('checking rules');
	
	var initRow = initLocHash['row'],
		initCol = initLocHash['col'],
		finalRow = finalLocHash['row'],
		finalCol = finalLocHash['col'],
		initLocPiece = gameBoard[initRow][initCol],
		finalLocPiece = gameBoard[finalRow][finalCol],
		initPieceRank = initLocPiece['rank'],
		initPieceTeamEnum = initLocPiece['teamEnum'],
		moveDist = getDistance(initLocHash, finalLocHash),
		message,
		piecesJumpedOver = [];
	
	if (finalLocPiece['status'] == 'empty') {
		// this piece must move adjacently by 1 unit
		if (moveDist == 1) {
			return true;
		} else {
			message = 'You cannot move like that.';
			broadcastGameFeedback(message, socket);
			return false;
		}
	} else {
		// there is a piece at the final location
		
		// are we trying to capture our own piece?
		finalPieceTeamEnum = finalLocPiece['teamEnum'];
		console.log(initLocPiece);
		console.log(finalLocPiece);
		if (initPieceTeamEnum === finalPieceTeamEnum) {
			message = 'You cannot capture yourself.';
			broadcastGameFeedback(message, socket);
			return false;
		}
		
		// get the move distance
		finalPieceRank = finalLocPiece['rank'];
		
		if (moveDist == 1) {
			// everyone except cannons can capture by moving 1 space
			if (initPieceRank == 6) {
				// we have a cannon. it must capture by moving more than one piece
				message = "Cannons must jump over only one piece to capture opponent.";
				broadcastGameFeedback(message, socket);
				return false;
			} else if (initPieceRank <= finalPieceRank) {
				// special case for generals and pawns
				if (initPieceRank == 1 && finalPieceRank == 7) {
					message = 'You cannot capture like that. Generals fear soldiers. Run!!!';
					broadcastGameFeedback(message, socket);
					return false;
				} else {
					return true;
				}
			} else {
				// check special case for cannon and pawns
				if (initPieceRank == 7 && finalPieceRank == 1) {
					// allow soldier to capture
					return true;
				} else {
					// dont allow capture
					message = "You're too weak to capture him";
					broadcastGameFeedback(message, socket);
					return false;
				}
			}
		} else if (initPieceRank == 6) {
			// allow cannons to jump over piece to kill
			if (finalRow - initRow != 0) {
				// row jumping
				for (var row = Math.min(initRow, finalRow); row <= Math.max(initRow, finalRow); row++) {
					if (gameBoard[row][finalCol]['status'] != 'empty') {
						piecesJumpedOver.push(gameBoard[row][finalCol]);	
					}
				}
				if (piecesJumpedOver == 3) {
					// success
					return true;
				} else {
					message = "Cannons must jump over only one piece to capture opponent.";
					broadcastGameFeedback(message, socket);
					return false;
				}
			} else {
				// col jumping
				for (var col = Math.min(initCol, finalCol); col <= Math.max(initCol, finalCol); col++) {
					if (gameBoard[finalRow][col]['status'] != 'empty') {
						piecesJumpedOver.push(gameBoard[finalRow][col]);	
					}
				}
				if (piecesJumpedOver == 3) {
					// success
					return true;
				} else {
					message = "Cannons must jump over only one piece to capture opponent.";
					broadcastGameFeedback(message, socket);
					return false;
				}
			}
		} else {
			console.log('moveDist = ' + moveDist);
			message = 'You cannot capture like that';
			broadcastGameFeedback(message, socket);
			return false;
		}
	}
	
}

function getDistance(initLocHash, finalLocHash) {
	var initRow = initLocHash['row'],
		initCol = initLocHash['col'],
		finalRow = finalLocHash['row'],
		finalCol = finalLocHash['col'];
	return (Math.abs(initRow - finalRow) + Math.abs(initCol - finalCol));
}

function initGameBoard() {
	var	location,
		chessPieceInfo,
		tempPiecesArray = [],
		shuffledPiecesArray;
	
	// for all chess pieces, push onto array
	for (var piece in chessPieces) {
		chessPieceInfo = chessPieces[piece];
		tempPiecesArray.push(chessPieceInfo);
	}
	
	// shuffle pieces
	shuffledPiecesArray = shufflePieces(tempPiecesArray);
	
	console.log(shuffledPiecesArray);
	
	// set gameboard
	gameBoard = [];
	for (var row = 0; row < NUM_ROWS; row++) {
		// create a new row
		gameBoard.push([]);
		for (var col = 0; col < NUM_COLS; col++) {
			// set the board at row, col to 0
			gameBoard[row][col] = shuffledPiecesArray.splice(0, 1)[0];
		}
	}
	
	parseAndDisplayBoard();
	
	everyone.emit('hide-btn-ready');
}

function parseAndDisplayBoard() {
	var tempGameBoard = [];
	for (var row = 0; row < NUM_ROWS; row++) {
		tempGameBoard.push([]);
		for (var col = 0; col < NUM_COLS; col++) {
			tempGameBoard[row][col] = gameBoard[row][col];
			if (tempGameBoard[row][col]['status'] && tempGameBoard[row][col]['status'] == 'hidden') {
				tempGameBoard[row][col] = {'status': 'hidden'};
			}
		}
	}
	console.log(tempGameBoard);
	everyone.emit('display-board', tempGameBoard);
}

function shufflePieces(pieces) {
	var numPieces = pieces.length,
		tempPiece,
		randomIndex;

	for (var i = 0; i < NUM_SHUFFLES; i++) {
		for (var j = 0; j < numPieces; j++) {
			randomIndex = Math.floor(Math.random()*numPieces);
			tempPiece = pieces[randomIndex];
			pieces[randomIndex] = pieces[j];
			pieces[j] = tempPiece;
		}
	}

	return pieces;
}

function alertNextPlayer() {
	// increment the turn counter, find current player
	gameState['currentTurnCounter'] += 1;
	
	var currentTurnCounter 		= gameState['currentTurnCounter'],
		currentPlayers			= gameState['currentPlayers'],
		currentPlayer			= currentPlayers[currentTurnCounter%2],
		currentPlayerName		= currentPlayer['nickname'],
		currentPlayerClientId	= currentPlayer['clientId'],
		currentPlayer			= getClientById(currentPlayerClientId),
		everyoneMsg				= "It is "+currentPlayerName+"'s turn.",
		currentPlayerMsg		= "It is your turn.";
	
	console.log(currentPlayer);
	console.log(currentPlayerName);
	
	broadcastGameFeedback(everyoneMsg);
	broadcastGameFeedback(currentPlayerMsg, currentPlayer);
}

function broadcastGameFeedback(message, socket) {
	var messageHash = {
		message: message
	}
	if (socket) {
		socket.emit('display-game-feedback', messageHash);
	} else {
		everyone.emit('display-game-feedback', messageHash);
	}
}

function setNickname(socket, name) {
	var escapedName		= encodeHTML(name),
		prevNickname	= socket['store']['data']['nickname'];
	
	socket.set('nickname', escapedName, function () {
		var data = {
			socketId: socket['id'],
			nickname: socket['store']['data']['nickname']
		};
		everyone.emit('update-users-list', socketsHash);
		submitChat(socket, prevNickname + ' is now known as ' +data['nickname'], 'change-nickname');
	});
}

function submitChat(socket, message, messageType) {
	var escapedMessage	= encodeHTML(message),
		socketId		= socket['id'],
		nickname 		= socketsHash[socketId]['nickname'],
		color			= socketsHash[socketId]['color'],
		chatData		= {
			socketId: socketId,
			message: escapedMessage,
			nickname: nickname,
			messageType: messageType,
			color: color
		}
	everyone.emit('submit-chat-callback', chatData);
}

function updateUsersList() {
	everyone.emit('update-users-list', socketsHash);
}

function getSocketId(socket) {
	return socket['id'];
}

function getSocketStore(socket) {
	return socket['store'];
}

function getSocketData(socket) {
	return socket['store']['data'];
}

function getClientById(socketId) {
	return clientsHash[socketId];
}

// ******************** helper functions ********************
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}