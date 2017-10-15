var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var playersNameDictionary = {};
var lobbyDictionary = {};
var playersGameCodeDictionary = {};
var gameDictionary = {};
var wordArray = [];
var bigWordSet = new Set();

function loadWordDictionaries(){
    var fileReader = require('fs')
    fileReader.readFile("words.txt", 'utf8', function(err, data) {
        wordArray = data.split("\n");
    });
    fileReader.readFile("dictionary.txt", 'utf8', function(err, data) {
        bigWordSet = new Set(data.split("\r\n"));
    });
}

function generateGameCode(){
    var gameCode = "";
    for(var digitIndex = 0; digitIndex < 6; digitIndex++){
        gameCode += String.fromCharCode(65+Math.floor(Math.random()*26));
    }
    return gameCode;
}

function createLobby(gameCode){
    lobbyDictionary[gameCode] = {gameCode: gameCode, players: [], teams: []};
}

function addPlayerToLobby(playerSocket, playerName, gameCode){
    var lobby = lobbyDictionary[gameCode];
    while(lobby.players.indexOf(playerName) != -1){
        playerName+="2";
    }
    lobby.players.push(playerName);
    lobby.teams.push("");
    lobbyDictionary[gameCode] = lobby;
    playerSocket.join(gameCode);
    playerSocket.emit('joinLobby', lobby);
    playersGameCodeDictionary[playerSocket.id] = gameCode;
    playersNameDictionary[playerSocket.id] = playerName;
    io.in(gameCode).emit('updateLobby', lobby);
}

function removePlayerFromLobby(playerSocket){
    var playerSocketId = playerSocket.id;
    if(playerSocketId in playersGameCodeDictionary){
        var gameCode = playersGameCodeDictionary[playerSocketId];
        if(gameCode in lobbyDictionary){
            var name = playersNameDictionary[playerSocketId];
            playerSocket.leave(gameCode);
            delete playersGameCodeDictionary[playerSocketId];
            delete playersNameDictionary[playerSocketId];
            var lobby = lobbyDictionary[gameCode];
            lobby.teams.splice(lobby.players.indexOf(name), 1);
            lobby.players.splice(lobby.players.indexOf(name), 1);
            if(lobby.players.length > 0){
                lobbyDictionary[gameCode] = lobby;
                io.in(gameCode).emit('updateLobby', lobby);
            }
            else{
                console.log("No more players in lobby "+gameCode+"! It is now deleted");
                delete lobbyDictionary[gameCode];
            }
        }
    }
}

function createGame(gameCode){
    if(gameCode in lobbyDictionary){
        var lobby = lobbyDictionary[gameCode];
        delete lobbyDictionary[gameCode];
        var board = new Array(7);
        for(var x = 0; x < board.length; x++){
            board[x] = new Array(6);
            for(var y = 0; y < 6; y++){
                board[x][y] = "";
            }
        }
        var scoreDictionary = {};
        var teamDictionary = {};
        for(var x = 0; x < lobby.players.length; x++){
            scoreDictionary[lobby.players[x]] = 0;
            teamDictionary[lobby.players[x]] = lobby.teams[x];
        }
        gameDictionary[gameCode] = {gameCode: gameCode, players: lobby.players, playerCount: lobby.players.length, teams: teamDictionary, scores: scoreDictionary, statuses: new Array(lobby.players.length), status: "", iteration: 0, board: board, correctAnswerer: "", wrongAnswerCount: 0, questions: ["What is 1+1?", "What is 11-1?"], answers: ["2", "10"], wordScramble: "", word: "", questionIndex: -1, coinCount: 0, gameType: "Word", answerIteration: 0};
    }
    return gameDictionary[gameCode];
}

function removePlayerFromGame(playerSocket){
    var playerSocketId = playerSocket.id;
    if(playerSocketId in playersGameCodeDictionary){
        var gameCode = playersGameCodeDictionary[playerSocketId];
        if(gameCode in gameDictionary){
            var name = playersNameDictionary[playerSocketId];
            playerSocket.leave(gameCode);
            delete playersGameCodeDictionary[playerSocketId];
            delete playersNameDictionary[playerSocketId];
            var game = gameDictionary[gameCode];
            game.players.splice(game.players.indexOf(name), 1);
            delete game.scores[name];
            delete game.teams[name];
            game.statuses[game.players.indexOf(name)] = -1;
            game.playerCount -= 1;
            if(game.playerCount > 0){
                gameDictionary[gameCode] = game;
                io.in(gameCode).emit('updateGame', game);
            }
            else{
                console.log("No more players in game "+gameCode+"! It is now deleted");
                delete gameDictionary[gameCode];
            }
        }
    }
}

function changeGamePhase(gameCode, phase, timer, iteration, extra){
    if(gameCode in gameDictionary){
        var game = gameDictionary[gameCode];
        if(iteration >= game.iteration && game.status != phase){
            game.status = phase;
            game.iteration = iteration+1;
            gameDictionary[gameCode] = game;
            if(phase == "Question"){
                game.wrongAnswerCount = 0;
                if(game.gameType = "Word"){
                    game.word = wordArray[Math.floor(Math.random()*wordArray.length)];
                    game.answerIteration = game.iteration;
                    var scrambledWord = scrambleWord(game.word);
                    while(scrambledWord == game.word){
                        scrambledWord = scrambleWord(game.word);
                    }
                    io.in(gameCode).emit('updateGameText', phase, scrambledWord);
                }
                gameDictionary[gameCode] = game;
                // game.questionIndex = Math.floor(Math.random()*game.questions.length);
                // io.in(gameCode).emit('updateGameText', phase, game.questions[game.questionIndex]);
            }
            else if(phase == "CoinDropCountdown"){
                if(game.gameType = "Word"){
                    extra.broadcast.to(gameCode).emit('updateGameText', phase, {correctAnswerer: game.correctAnswerer, answer: game.word});
                    extra.emit('updateGameText', "CoinDrop", game.word);
                }
                // extra.broadcast.to(gameCode).emit('updateGameText', phase, {correctAnswerer: game.correctAnswerer, answer: game.answers[game.questionIndex]});
                // extra.emit('updateGameText', "CoinDrop", game.answers[game.questionIndex]);
                io.in(gameCode).emit('updateGame', game);
            }
            else if(phase == "NoCorrectCountdown"){
                if(game.gameType = "Word"){
                    io.in(gameCode).emit('updateGameText', phase, game.word);
                }
                //io.in(gameCode).emit('updateGameText', phase, game.answers[game.questionIndex]);
            }
            else if(phase == "GameWon"){
                io.in(gameCode).emit('updateGameText', phase, extra);
            }
            else{
                io.in(gameCode).emit('updateGameText', phase, "");
            }
            gameDictionary[gameCode] = game;
            io.in(gameCode).emit('changeTimer',timer, gameDictionary[gameCode].iteration);
            setTimeout(function(){
                if(phase == "WelcomeCountdown" || phase == "NoCorrectCountdown" || phase == "QuestionCountdown"){
                    changeGamePhase(gameCode, "Question", 59, iteration+1, "");
                }
                else if(phase == "CoinDropCountdown"){
                    changeGamePhase(gameCode, "QuestionCountdown", 4, iteration+1, "");
                }
                else if(phase == "Question"){
                    changeGamePhase(gameCode, "NoCorrectCountdown", 7, iteration+1, "");
                }
            }, timer*1000);
        }
        else{
            console.log('Ignored phase change request: '+phase+' with iteration '+iteration+' (Current iteration is '+game.iteration+')');
        }
    }
}

function checkWinner(board, x, y){
    var directionsArray = [{dX: 1, dY: 0}, {dX: 0, dY: 1}, {dX: 1, dY: -1}, {dX: 1, dY: 1}];
    for(var directionIndex = 0; directionIndex < directionsArray.length; directionIndex++){
        var currentDirection = directionsArray[directionIndex];
        var directionNeighborCount = countSameNeighbors(board, x, y, currentDirection.dX, currentDirection.dY);
        var compDirectionNeighborCount = countSameNeighbors(board, x, y, -currentDirection.dX, -currentDirection.dY);
        if(directionNeighborCount + compDirectionNeighborCount >= 3){
            return true;
        }
    }
    return false;
}

function countSameNeighbors(board, x, y, dX, dY){
    var coinColor = board[x][y];
    var neighborCount = 0;
    var neighborX = x+dX;
    var neighborY = y+dY;
    while(neighborX >= 0 && neighborY >= 0 && neighborX < 7 && neighborY < 6 && board[neighborX][neighborY] == coinColor){
        neighborCount += 1;
        neighborX += dX;
        neighborY += dY;
    }
    return neighborCount;
}

function checkAnswer(answer, game){
    answer = answer.toLowerCase();
    var gameWord = game.word
    if(answer == gameWord){
        return true;
    }
    else if(answer.length != gameWord.length){
        return false;
    }
    var currAnswerWord = answer;
    for(var x = 0; x < answer.length; x++){
        var prevAnswerWord = currAnswerWord;
        currAnswerWord = currAnswerWord.replace(answer[x], '');
        if(prevAnswerWord == currAnswerWord){
            return false;
        }
    }
    if(currAnswerWord == "" && bigWordSet.has(answer)){
        return true;
    }
    else{
        return false;
    }
}

function scrambleWord(word){
    var newWord = "";
    var currWord = word;
    while(currWord != ""){
        var randomIndex = Math.floor(Math.random()*currWord.length);
        newWord += currWord[randomIndex];
        currWord = currWord.replace(currWord[randomIndex], '');
    }
    return newWord;
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

loadWordDictionaries();

io.on('connection', function(socket){
    socket.on('newGameRequest', function(name){
        var gameCode = generateGameCode();
        createLobby(gameCode);
        addPlayerToLobby(socket, name, gameCode);
    });
  
    socket.on('joinGameRequest', function(gameCode, name){
        if(gameCode in lobbyDictionary){
            if(lobbyDictionary[gameCode].players.length < 4){
                addPlayerToLobby(socket, name, gameCode);
            }
            else{
                socket.emit('errorMessage', "That room is full!");
            }
        }
        else{
            socket.emit('errorMessage', "That is not a valid game key!");
        }
    });

    socket.on('changeTeamRequest', function(playerIndex, team){
        var playerSocketId = socket.id;
        if(playerSocketId in playersGameCodeDictionary){
            var gameCode = playersGameCodeDictionary[playerSocketId];
            var lobby = lobbyDictionary[gameCode];
            lobby.teams[playerIndex] = team;
            io.in(gameCode).emit('updateLobby', lobby);
        }
    });
    
    socket.on('leaveLobby', function(){
        removePlayerFromLobby(socket);
    });
    
    socket.on('startGameRequest', function(){
        var playerSocketId = socket.id;
        if(playerSocketId in playersGameCodeDictionary){
            var gameCode = playersGameCodeDictionary[playerSocketId];
            if(gameCode in lobbyDictionary){
                var lobby = lobbyDictionary[gameCode];
                var canStartGame = true;
                for(var playerIndex = 0; playerIndex < lobby.players.length; playerIndex++){
                    if(lobby.teams[playerIndex] == ""){
                        canStartGame = false;
                    }
                }
                if(canStartGame){
                    var game = createGame(gameCode);
                    io.in(gameCode).emit('joinGame', game);
                    changeGamePhase(gameCode, "WelcomeCountdown", 7, game.iteration, "");
                }
                else{
                    socket.emit('errorMessage', "Not everyone has selected a team!");
                }
            }
        }
    });
    
    socket.on('submitAnswer', function(answer){
        var playerSocketId = socket.id;
        if(playerSocketId in playersGameCodeDictionary){
            var gameCode = playersGameCodeDictionary[playerSocketId];
            if(gameCode in gameDictionary){
                var game = gameDictionary[gameCode];
                var gameStatus = game.status;
                var gameIteration = game.iteration;
                if(gameStatus == "Question"){
                    if(game.gameType = "Word"){
                        var result = checkAnswer(answer, game);
                        console.log(playersNameDictionary[socket.id]+" answered...checking with iteration "+gameIteration+" Game Status From Dict "+gameDictionary[gameCode].status+" Game Status From Variable "+gameStatus)
                        if(result && gameDictionary[gameCode] == game && gameDictionary[gameCode].status == "Question" && game.answerIteration == gameIteration){
                            gameDictionary[gameCode].status = "QuestionR"
                            game.status = "QuestionP"
                            game.word = answer;
                            game.correctAnswerer = playersNameDictionary[socket.id];
                            game.scores[game.correctAnswerer] += 1;
                            gameDictionary[gameCode] = game;
                            console.log(playersNameDictionary[socket.id]+" answered correctly with "+answer+" Game Status From Dict "+gameDictionary[gameCode].status+" Game Status From Variable "+gameStatus);
                            changeGamePhase(gameCode, "CoinDropCountdown", 15, gameIteration, socket);
                        }
                        else if(game.answerIteration != gameIteration){
                            console.log("Denied answer from "+playersNameDictionary[socket.id]+"because of wrong iteration! (Answered too late)"+" Game Status From Dict "+gameDictionary[gameCode].status+" Game Status From Variable "+gameStatus)
                        }
                        else if(result == false){
                            game.wrongAnswerCount += 1;
                            if(game.wrongAnswerCount >= game.playerCount){
                                changeGamePhase(gameCode, "NoCorrectCountdown", 7, game.iteration, "");
                            }
                            else{
                                socket.emit('wrongAnswer', game.word);
                            }
                        }
                    }
                    // if(answer == game.answers[game.questionIndex]){
                    //     game.correctAnswerer = playersNameDictionary[socket.id];
                    //     game.scores[playersNameDictionary[socket.id]] += 1;
                    //     gameDictionary[gameCode] = game;
                    //     changeGamePhase(gameCode, "CoinDropCountdown", 15, game.iteration, socket);
                    // }
                    // else{
                    //     game.wrongAnswerCount += 1;
                    //     if(game.wrongAnswerCount >= game.playerCount){
                    //         changeGamePhase(gameCode, "NoCorrectCountdown", 7, game.iteration, "");
                    //     }
                    //     else{
                    //         socket.emit('wrongAnswer', game.answers[game.questionIndex]);
                    //     }
                    // }
                }
                else{
                    console.log("Denied answer from "+playersNameDictionary[socket.id]+" because no longer question!")
                }
            }
        }
    });
    
    socket.on('placeCoin', function(x, y){
        var playerSocketId = socket.id;
        if(playerSocketId in playersGameCodeDictionary){
            var gameCode = playersGameCodeDictionary[playerSocketId];
            var playerName = playersNameDictionary[playerSocketId];
            if(gameCode in gameDictionary){
                var game = gameDictionary[gameCode];
                if(game.status = "CoinDropCountdown" && playerName == game.correctAnswerer){
                    var coinY = 0;
                    var board = game.board;
                    while(board[x][coinY] != "" && coinY < 6){
                        coinY += 1;
                    }
                    if(coinY < 6){
                        board[x][coinY] = game.teams[playerName].toLowerCase();
                        gameDictionary[gameCode].board = board;
                        gameDictionary[gameCode].coinCount += 1;
                        io.in(gameCode).emit('coinDrop', x, y, game.teams[playerName].toLowerCase());
                        if(checkWinner(board, x, coinY)){
                            var winnerArray = [];
                            for(var playerIndex = 0; playerIndex < game.players.length; playerIndex++){
                                var otherName = game.players[playerIndex];
                                if(game.teams[otherName] == game.teams[playerName]){
                                    winnerArray.push(game.players[playerIndex]);
                                }
                            }
                            changeGamePhase(gameCode, "GameWon", 0, game.iteration, winnerArray);
                        }
                        else if(gameDictionary[gameCode].coinCount >= 42){
                            changeGamePhase(gameCode, "GameWon", 0, game.iteration, []);
                        }
                        else{
                            changeGamePhase(gameCode, "QuestionCountdown", 4, game.iteration, "");
                        }
                    }
                }
            }
        }

    });
    
    socket.on('leaveGame', function(){
        removePlayerFromGame(socket);
    });
    
    socket.on('disconnect', function(){
        removePlayerFromLobby(socket);
        removePlayerFromGame(socket);
    });
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
});
