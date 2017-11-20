let colors = {
    "red": "#F68888",
    "orange": "#FFC477",
    "yellow": "#FFE26F",
    "green": "#93F971",
    "blue": "#7ABCFF",
    "purple": "#C290FF",
    "pink": "#FFB7E9"
};
let coinDropTime = 35;
let timer;

class App extends React.Component {
    constructor(){
        super();
        this.state = {
            screen: "Welcome"
        }
    }
    componentDidMount(){
        window.socket.on('updateState', (state) => this.changeState(state));
        window.socket.on('errorMessage', (error) => this.setState({error: error}));
        window.socket.on('updateGameText', (phase, gameiter) => this.setState({status: phase}));
        window.socket.on('updatePlayers', (players) => this.setState({players: players}));
        window.socket.on('updateQuestion', (scrambledWord) => this.setState({status: "Question", scrambledWord: scrambledWord}));
        window.socket.on('correctAnswer', (answerer, word) => this.setState({status: "CorrectAnswer", correctAnswerer: answerer, correctWord: word}));
        window.socket.on('wrongAnswer', (word) => this.setState({status: "WrongAnswer", correctWord: word}));
        window.socket.on('coinDrop', (word) => this.setState({status: "CoinDrop", correctWord: word, coinDrop: null}))
        window.socket.on('coinDropped', (x, y, team) => this.setState({status: "CoinDropped", coinDrop: [x, y, team]}));
        window.socket.on('noCorrect', (word) => this.setState({status: "NoCorrectCountdown", correctWord: word}));
        window.socket.on('updateScores', (scores) => this.setState({scores: scores}));
        window.socket.on('gameWon', (winners) => this.setState({status: "GameWon", winners: winners}));
        window.socket.on('changeTimer', (time, iteration) => this.changeTimer(time, iteration))
    }
    changeState(state){
        this.resetError(state.screen);
        this.setState(state);
    }
    changeScreen(screen){
        this.resetError(screen);
        this.setState({
            screen: screen
        });
    }
    newGameRequest(name){
        window.socket.emit('newGameRequest', name);
    }
    joinGameRequest(name, gameCode){
        window.socket.emit('joinGameRequest', gameCode.toUpperCase(), name);
    }
    changeTeamRequest(playerIndex, team){
        window.socket.emit('changeTeamRequest', playerIndex, team);
    }
    startGameRequest(){
        window.socket.emit('startGameRequest');
    }
    leaveLobby(){
        window.socket.emit('leaveLobby');
        this.changeScreen("Welcome");
    }
    submitAnswer(answer){
        if(answer.length > 0){
            window.socket.emit('submitAnswer', answer);
        }
    }
    placeCoin(x, y){
        window.socket.emit('placeCoin', x, y);
    }
    resetError(screen){
        if(screen != this.state.screen){
            this.setState({
                error: ""
            })
        }
    }
    leaveGame(){
        window.socket.emit('leaveGame');
        this.changeScreen("Welcome");
    }
    changeTimer(time, iteration){
        timer.setTimer(time, iteration);
    }
    render(){
        let screens = {
            "Welcome": <WelcomeScreen changeScreen={(screen) => this.changeScreen(screen)}/>,
            "NewGame": <NewGameScreen changeScreen={(screen) => this.changeScreen(screen)} newGameRequest={(name) => this.newGameRequest(name)}/>,
            "JoinGame": <JoinGameScreen changeScreen={(screen) => this.changeScreen(screen)} joinGameRequest={(name, gameCode) => this.joinGameRequest(name, gameCode)} error={this.state.error}/>,
            "Lobby": <LobbyScreen state={this.state} changeTeamRequest={(playerIndex, team) => this.changeTeamRequest(playerIndex, team)} startGameRequest={() => this.startGameRequest()} leaveLobby={() => this.leaveLobby()} error={this.state.error}/>,
            "Game": <GameScreen state={this.state} submitAnswer={(answer) => this.submitAnswer(answer)} placeCoin={(x, y) => this.placeCoin(x, y)} leaveGame={() => this.leaveGame()}/>
        };
        return (
            <center>
                <h1>Quiz<b>4</b></h1>
                {screens[this.state.screen]}
            </center>
        );
    }
}



class WelcomeScreen extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        return(
            <div>
                <button onClick={() => this.props.changeScreen("NewGame")}>New Game</button>
                <button onClick={() => this.props.changeScreen("JoinGame")}>Join Game</button>
            </div>
        );
    }
}




class NewGameScreen extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            error: ""
        }
    }
    componentDidMount(){
        this.refs.nameInput.focus();    
    }
    checkInput(){
        let name = this.refs.nameInput.value;
        if(name.length == 0){
            this.setState({
                error: "Please enter a name!"
            });
        }
        else{
            this.props.newGameRequest(name);
        }
    }
    render(){
        return(
            <div>
                <h3>{this.state.error}</h3>
                <input ref="nameInput" placeholder="Enter your name" type="text" onKeyUp={event => {
                if (event.key === 'Enter') {
                  this.checkInput();
                }
                }}/><br/>
                <button onClick={() => this.checkInput()}>Create Game</button>
                <button onClick={() => this.props.changeScreen("Welcome")}>Back</button>
            </div>
        );
    }
}



class JoinGameScreen extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            error: this.props.error
        }
    }
    componentDidMount(){
        this.refs.nameInput.focus();    
    }
    componentWillReceiveProps(nextProps){
        this.setState({
            error: nextProps.error
        })
    }
    checkInput(){
        let gameCode = this.refs.gameCodeInput.value;
        let name = this.refs.nameInput.value;
        if(name.length == 0){
            this.setState({
                error: "Please enter a name!"
            });
        }
        else if(gameCode.length != 6){
            this.setState({
                error: "Please enter a six letter game code!"
            });
        }
        else{
            this.props.joinGameRequest(name, gameCode);
        }
    }
    render(){
        return(
            <div>
                <h3>{this.state.error}</h3>
                <input ref="nameInput" placeholder="Enter your name" type="text" onKeyUp={event => {
                if (event.key === 'Enter') {
                  this.checkInput();
                }
                }}/><br/>
                <input ref="gameCodeInput" placeholder="Enter a game code" type="text" onKeyUp={event => {
                if (event.key === 'Enter') {
                  this.checkInput();
                }
                }}/><br/>
                <button onClick={() => this.checkInput()}>Join Game</button>
                <button onClick={() => this.props.changeScreen("Welcome")}>Back</button>
            </div>
        );
    }
}



class LobbyScreen extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            error: "",
            gameCode: this.props.state.gameCode,
            players: this.props.state.players,
            teams: this.props.state.teams
        }
    }
    componentDidMount(){
        let startGameRequest = this.props.startGameRequest;
        window.onkeyup = function (e){
            var code = e.keyCode ? e.keyCode : e.which;
            if (code === 13) {
                startGameRequest();
            }
        };
    }
    componentWillUnmount(){
        window.onkeyup = null;
    }
    componentWillReceiveProps(nextProps){
        this.setState({
            error: nextProps.error,
            gameCode: nextProps.state.gameCode,
            players: nextProps.state.players,
            teams: nextProps.state.teams
        });
    }
    render(){
        return(
            <div>
                <h2>Game Code: <b>{this.state.gameCode}</b></h2>
                <h3>{this.state.error}</h3>
                <table>
                    <tr>
                        <td class="LobbyPlayerNameBox HeaderTD">
                            <strong>Player</strong>
                        </td>
                        <td class="LobbyPlayerTeamBox HeaderTD">
                            <strong>Team</strong>
                        </td>
                    </tr>
                    {this.state.players.map((playerName, playerIndex) => 
                        <tr>
                            <td className="LobbyPlayerNameBox">{playerName}</td>
                            <td className="LobbyPlayerTeamBox">
                                <TeamSelect team={this.state.teams[playerIndex]} onChange={(team) => this.props.changeTeamRequest(playerIndex, team)}/>
                            </td>
                        </tr>)
                    }
                </table>
                <button onClick={() => this.props.startGameRequest()}>Start Game</button>
                <button onClick={() => this.props.leaveLobby()}>Back</button>
            </div>
        );
    }
}



class TeamSelect extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            team: this.props.team,
        }
    }
    componentWillReceiveProps(nextProps){
        this.setState({
            team: nextProps.team
        });
    }
    render(){
        let textColor = this.state.team === "" ? "#3FD5FF":"#FFFFFF";
        return(
            <select value={this.state.team} onChange={() => this.props.onChange(this.refs.teamDropdown.value)} style={{backgroundColor: colors[this.state.team], color: textColor}} ref="teamDropdown">
                <option value="" disabled="disabled">None</option>
                <option value="red">Red</option>
                <option value="orange">Orange</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="pink">Pink</option>
            </select>
        );
    }
}



class GameScreen extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        return(
            <div>
                <div id="GameInfoScreen">
                    <GameTextScreen state={this.props.state} submitAnswer={(answer) => this.props.submitAnswer(answer)}/>
                    <GameScoreboard state={this.props.state}/>
                </div>
                <GameBoard status={this.props.state.status} coinDrop={this.props.state.coinDrop} placeCoin={(x, y) => this.props.placeCoin(x, y)}/><br/>
                <button onClick={() => this.props.leaveGame()}>Leave Game</button>
            </div>
        );
    }
}



class GameTextScreen extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        let winnerString = "";
        if(this.props.state.status === "GameWon"){
            let winnerArray = this.props.state.winners;
            if(winnerArray.length === 1){
                winnerString = winnerArray[0]+" wins!";
            }
            else if(winnerArray.length === 0){
                winnerString = "The board is filled! Everyone wins!";
            }
            else{
                for(let x = 0; x < winnerArray.length; x++){
                    winnerString += winnerArray[x];
                    if(x <= winnerArray.length-2 && winnerArray.length != 2){
                        winnerString += ", "
                    }
                    if(x === winnerArray.length-2){
                        if(winnerArray.length === 2){
                            winnerString += " and "
                        }
                        else{
                            winnerString += "and "
                        }
                    }
                }
                winnerString += " win!";
            }
        }
        let gameTextDict = {
            "WelcomeCountdown": "Welcome! Get ready for the first question...",
            "QuestionCountdown": "Get ready for the next question...",
            "NoCorrectCountdown":  "No one got the correct answer: "+this.props.state.correctWord+"! Get ready for the next question...",
            "Question": "Unscramble: "+this.props.state.scrambledWord,
            "CorrectAnswer": this.props.state.correctAnswerer+" got the correct answer: "+this.props.state.correctWord+". Waiting for them to drop a coin...",
            "WrongAnswer": "Incorrect answer! The right answer was "+this.props.state.correctWord,
            "CoinDrop": "You got the correct answer: "+this.props.state.correctWord+"! Please drop a coin...",
            "GameWon": winnerString
        };
        return(
            <div id="GameTextScreen" style={{height: 290-this.props.state.players.length*34}}>
                <h2 id="GameHeader">{gameTextDict[this.props.state.status]}</h2>
                {this.props.state.status === "Question" ? <GameAnswerBox submitAnswer={(answer) => this.props.submitAnswer(answer)}/> : null}
                {this.props.state.status === "GameWon" ? null : <GameTimer/>}
            </div>
        );
    }
}



class GameTimer extends React.Component {
    constructor(){
        super();
        this.state = {
            time: 0,
            iteration: -1,
        }
    }
    componentDidMount(){
        timer = this;
    }
    setTimer(time, iteration){
        let setTimerFunction = this.setTimer.bind(this);
        if(iteration >= this.state.iteration && time >= 0){
            this.setState({
                time: time
            })
            if(iteration > this.state.iteration){
                this.setState({
                    iteration: iteration
                })
            }
            window.setTimeout(function(){ setTimerFunction(time-1, iteration) }, 1000);
        }
    }
    render(){
        let timeString = this.state.time <= 9 ? "0"+this.state.time : ""+this.state.time;
        return (
            <h2 id="GameTimer">{"0:"+timeString}</h2>
        );
    }
}



class GameAnswerBox extends React.Component {
    componentDidMount(){
        this.refs.answerBox.focus();
    }
    render(){
        return (
            <input ref="answerBox" type="text" id="AnswerBox" placeholder="Enter your answer" onKeyUp={event => {
                if (event.key === 'Enter') {
                  this.props.submitAnswer(this.refs.answerBox.value);
                }
                }}
            />
        );
    }
}



class GameScoreboard extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        return(
            <table>
                {this.props.state.players.map((playerName, playerIndex) => 
                    <tr>
                        <td className="GamePlayerNameBox">{playerName}</td>
                        <td className="GamePlayerScoreBox" style={{backgroundColor: colors[this.props.state.teams[playerName]]}}>{this.props.state.scores[playerName]}</td>
                    </tr>
                )}
            </table>
        );
    }
}



class GameBoard extends React.Component {
    constructor(props){
        super(props);
        let board = [];
        for(var y=0; y<6; y++) {
            board[y] = ["", "", "", "", "", "", ""];
        }
        this.state = {
            status: this.props.status,
            board: board
        }
    }
    componentWillReceiveProps(nextProps){
        this.setState({
            status: nextProps.status
        });
        if(nextProps.status === "CoinDropped"){
            this.placeCoin(nextProps.coinDrop[0], 0, nextProps.coinDrop[2]);
        }
    }
    placeCoin(x, y, team){
        let newBoard = this.state.board.map((arr) => arr.slice());
        newBoard[y][x] = team;
        this.setState({board: newBoard});
        let coinFallFunction = this.coinFall.bind(this);
        window.setTimeout(function(){
            coinFallFunction(x, y, team);
        }, coinDropTime);
    }
    coinFall(x, y, team){
        if(y < 5 && this.state.board[y+1][x] == ""){
            let newBoard = this.state.board.map((arr) => arr.slice());
            newBoard[y][x] = "";
            newBoard[y+1][x] = team; 
            this.setState({board: newBoard});
            let coinFallFunction = this.coinFall.bind(this);
            window.setTimeout(function(){coinFallFunction(x, y+1, team);}, coinDropTime);
        }
    }
    render(){
        let slotGrid = [];
        for(let y = 0; y < 6; y++){
            let slotRow = [];
            for(let x = 0; x < 7; x++){
                let slotColor = this.state.board[y][x] === "" ? "#3FD5FF" : colors[this.state.board[y][x]];
                slotRow.push(<td class="Slot" style={{backgroundColor: slotColor}} onClick={this.state.status === "CoinDrop" ? () => this.props.placeCoin(x, y) : null}></td>);
            }
            slotGrid.push(<tr>{slotRow}</tr>)
        }
        return(
            <table id="GameBoardScreen">
            {slotGrid}
            </table>
        );
    }
}



ReactDOM.render(     
  <App />,
  document.getElementById('root')        
);