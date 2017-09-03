var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var playersNameDictionary = {};
var lobbyDictionary = {};
var playersGameCodeDictionary = {};
var gameDictionary = {};

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
        gameDictionary[gameCode] = {gameCode: gameCode, players: lobby.players, playerCount: lobby.players.length, teams: lobby.teams, scores: new Array(lobby.players.length).fill(0), statuses: new Array(lobby.players.length)};
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

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

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
                if(lobby.players.length < 2){
                    socket.emit('errorMessage', "You cannot play by yourself! Maybe try getting some friends?");
                }
                else{
                    var canStartGame = true;
                    for(var playerIndex = 0; playerIndex < lobby.players.length; playerIndex++){
                        if(lobby.teams[playerIndex] == ""){
                            canStartGame = false;
                        }
                    }
                    if(canStartGame){
                        var game = createGame(gameCode);
                        io.in(gameCode).emit('joinGame', game);
                    }
                    else{
                        socket.emit('errorMessage', "Not everyone has selected a team!");
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
