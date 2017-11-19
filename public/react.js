let colors = {
    "red": "#F68888",
    "orange": "#FFC477",
    "yellow": "#FFE26F",
    "green": "#93F971",
    "blue": "#7ABCFF",
    "purple": "#C290FF",
    "pink": "#FFB7E9"
}

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
    render(){
        let screens = {
            "Welcome": <WelcomeScreen changeScreen={(screen) => this.changeScreen(screen)}/>,
            "NewGame": <NewGameScreen changeScreen={(screen) => this.changeScreen(screen)} newGameRequest={(name) => this.newGameRequest(name)}/>,
            "JoinGame": <JoinGameScreen changeScreen={(screen) => this.changeScreen(screen)} joinGameRequest={(name, gameCode) => this.joinGameRequest(name, gameCode)} error={this.state.error}/>,
            "Lobby": <LobbyScreen state={this.state} changeTeamRequest={(playerIndex, team) => this.changeTeamRequest(playerIndex, team)} startGameRequest={() => this.startGameRequest()} leaveLobby={() => this.leaveLobby()} error={this.state.error}/>,
            "Game": <GameScreen state={this.state} leaveGame={() => this.leaveGame()}/>
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
                <input ref="nameInput" placeholder="Enter your name" type="text"/><br/>
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
                <input ref="nameInput" placeholder="Enter your name" type="text"/><br/>
                <input ref="gameCodeInput" placeholder="Enter a game code" type="text"/><br/>
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
                    <GameTextScreen state={this.props.state}/>
                    <GameScoreboard state={this.props.state}/>
                </div>
                <GameBoard/><br/>
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
        return(
            <div id="GameTextScreen" style={{height: 290-this.props.state.players.length*34}}>
                <h2 id="GameHeader">{this.props.state.status}</h2>
                <input type="text" id="AnswerBox" placeholder="Enter your answer"/>
                <h2 id="GameTimer">0:00</h2>
            </div>
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
    render(){
        let slotGrid = [];
        for(let y = 0; y < 6; y++){
            let slotRow = [];
            for(let x = 0; x < 7; x++){
                slotRow.push(<td class="Slot"></td>);
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