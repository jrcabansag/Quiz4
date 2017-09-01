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

function createLobby(gameCode, player0Socket, player0Name){
    var lobby = {
        gameCode: gameCode,
        players: [player0Name]
    }
    return lobby;
}

function removePlayerFromLobby(playerSocket, lobby){
    
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('newGameRequest', function(name){
    var gameCode = generateGameCode();
    socket.join(gameCode);
    var lobby = createLobby(gameCode, socket, name);
    socket.emit('joinLobby', lobby);
    lobbyDictionary[gameCode] = lobby;
    playersInLobbyDictionary[socket.id] = gameCode;
    playersNameDictionary[socket.id] = name;
  });
  
  socket.on('joinGameRequest', function(joinRequest){
    if(joinRequest.gameCode in lobbyDictionary){
        lobbyDictionary[joinRequest.gameCode].players.push(joinRequest.name);
        socket.emit('joinLobby', lobbyDictionary[joinRequest.gameCode]);
        socket.join(joinRequest.gameCode);
        io.in(joinRequest.gameCode).emit('updateLobby', lobbyDictionary[joinRequest.gameCode]);
        playersInLobbyDictionary[socket.id] = joinRequest.gameCode;
        playersNameDictionary[socket.id] = joinRequest.name;
    }
    else{
        socket.emit('errorMessage', "That is not a valid game key!");
    }
  });

  socket.on('disconnect', function(){
    if(socket.id in playersInLobbyDictionary){
        var gameCode = playersInLobbyDictionary[socket.id];
        var name = playersNameDictionary[socket.id];
        var lobby = lobbyDictionary[gameCode];
        var playerIndex = lobby.players.indexOf(name);
        lobby.players.splice(playerIndex, 1);
        lobbyDictionary[gameCode] = lobby;
        io.in(gameCode).emit('updateLobby', lobby);
    }
  });
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
});
