import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class App extends Component {
  constructor(props){
  	super(props);
  	this.state = {
  		status: this.props.status
  	}
  }
  render(){
  	var curr_screen;
  	if(this.state.status === "Welcome"){
  		curr_screen = <WelcomeScreen />;
  	}
  	else{
  		curr_screen = <Lobby />;
  	}
    return (
    	<center>
    	<h1>Quiz<b>4</b></h1>
    	{curr_screen}
    	</center>
    );
  }
}

class WelcomeScreen extends Component {
	render(){
		return(
			<div>This is a welcome screen lmao</div>
		);
	}
}

class Lobby extends Component {
	render(){
		return(
			<div>NO RUNNING IN MY LOBBY!!</div>
		);
	}
}

function myAlert(){
	alert("POOOPITY");
}

ReactDOM.render(     
  <App status="Welcome"/>,
  document.getElementById('root')        
);