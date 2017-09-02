var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var lobbyDictionary = {};
var playersInLobbyDictionary = {};
var playersNameDictionary = {};

function generateGameCode(){
    var gameCode = "";
    for(var digitIndex = 0; digitIndex < 6; digitIndex++){
        gameCode += String.fromCharCode(65+Math.floor(Math.random()*26));
    }
    return gameCode;
}

function createLobby(gameCode){
    lobbyDictionary[gameCode] = {gameCode: gameCode, players: []};
}

function addPlayerToLobby(playerSocket, playerName, gameCode){
    var lobby = lobbyDictionary[gameCode];
    while(lobby.players.indexOf(playerName) != -1){
        playerName+="2";
    }
    lobby.players.push(playerName);
    lobbyDictionary[gameCode] = lobby;
    playerSocket.join(gameCode);
    playerSocket.emit('joinLobby', lobby);
    playersInLobbyDictionary[playerSocket.id] = gameCode;
    playersNameDictionary[playerSocket.id] = playerName;
    io.in(gameCode).emit('updateLobby', lobby);
}

function removePlayerFromLobby(playerSocket){
    var playerSocketId = playerSocket.id;
    if(playerSocketId in playersInLobbyDictionary){
        var gameCode = playersInLobbyDictionary[playerSocketId];
        var name = playersNameDictionary[playerSocketId];
        playerSocket.leave(gameCode);
        delete playersInLobbyDictionary[playerSocketId];
        delete playersNameDictionary[playerSocketId];
        var lobby = lobbyDictionary[gameCode];
        lobby.players.splice(lobby.players.indexOf(name), 1);
        if(lobby.players.length > 0){
            lobbyDictionary[gameCode] = lobby;
            io.in(gameCode).emit('updateLobby', lobby);
        }
        else{
            delete lobbyDictionary[gameCode];
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

    socket.on('leaveLobby', function(){
        removePlayerFromLobby(socket);
    });
    
    socket.on('disconnect', function(){
        removePlayerFromLobby(socket);
    });
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
});
