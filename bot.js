var irc = require('irc');
var fs = require('fs');
var config = require('./config');
var c = require('irc-colors');



//Server, Nick, Password, Channel
var commands = ['.help', '.startrace', '.join', '.unjoin', '.done', '.stop', '.races', '.start', '.ready', '.unready', '.setgoal', '.goal', '.owner', '.entrants', '.racers', '.reset', '.ops', '.forfeit', '.forcestart', '.comment'];
var opCommands = ['.kick'];
var races = [];
var games = [];
var ops = [];
var records = [];
var completed = [];
var index = 0;
var client = new irc.Client(config.server, config.nick, {
	autoConnect: false,
	userName: config.userName,
	debug: true
});


//TODO: fix this up... somehow; set the index to be what it was when the bot last shutdown.
(function() {
	readIndex(function(data) {
		index = parseInt(data.toString());
		if(typeof index !== 'undefined') {
			console.log('Bot channel index is ' + index);
			index = parseInt(data.toString()) + 1;
		}
		else {
			console.log('Index not found, assuming it is 0');
			index = 0;
		}

	});

	readOPs(function(data) {
		ops = JSON.parse(data);
		console.log('The OPs are: ' + ops );
	});
})();

client.connect(function() {
	console.log('Connected!');
	console.log('Logging in...');
	setTimeout(function() {
		client.say('NickServ', 'IDENTIFY ' + config.password);
		sleep(10000);
		client.join(config.mainChannel, function() {
			console.log('Joined main channel!');
		});
	}, 2000);
});

client.addListener('error', function(message) {
	console.log('error: ', message);
});

//completed: array
function addToRecords(completed) {
	var finishedPlayers = JSON.stringify(completed);
	var	buffer = new Buffer(finishedPlayers);
	var path = 'private/records.json';
	fs.open(path, 'w', function(err, fd) {
		if (err) {
			throw 'error opening file: ' + err;
		}
		fs.write(fd, buffer, 0, buffer.length, null, function(err) {
			if (err) throw 'error writing file: ' + err;
			fs.close(fd, function() {
				console.log('Saved records');
			})
		});
	});
}

function saveIndex() {
	var	buffer = new Buffer(index.toString());
	var path = "private/index.txt";

	fs.open(path, 'w', function(err, fd) {
		if (err) {
			throw 'error opening file: ' + err;
		}
		fs.write(fd, buffer, 0, buffer.length, null, function(err) {
			if (err) throw 'error writing file: ' + err;
			fs.close(fd, function() {
				console.log('Saved Index');
			})
		});
	});
}

function readIndex(callback) {
	var path = "private/index.txt";
	var content;
	fs.readFile(path, function read(err, data) {
		if (err) {
			throw err;
			return 'undefined';
		}
		content = data;
		if(typeof parseInt(content.toString()) !== 'NaN'){
			callback(data);
		} else {
			console.log('Please add a 0 to index.txt in /private/');
		}
	});
}

function readOPs(callback) {
	var path = "private/ops.txt";
	var content;
	fs.readFile(path, function read(err, data) {
		if (err) {
			throw err;
			return 'undefined';
		}
		
		callback(data.toString());
	});
}

client.addListener('message', function (from, to, message) {
	console.log(from + ' => ' + to + ': ' + message);
    //Create command; see if it starts with the command; see if its two words
    var splitMessage = message.split(" ");
    var createCommand = commands[1];
    var owner = from;
    var goal;
    var id = find_in_array(races, 'name', to);
    var race = races[id];

    var playerLocInArray = null;
    if(race !== undefined) {
   		if(typeof race.players != 'undefined' && race.players instanceof Array) {
    		playerLocInArray = find_in_array(race.players, 'player', from);
    	} 
	}
    if(to == config.mainChannel && message.substring(0, createCommand.length).toUpperCase() == createCommand.toUpperCase() && splitMessage.length == 2 && message.indexOf(createCommand) !== -1) {
    	var game = splitMessage[1];
    	var race = { name: '#' + config.nick + index,
    	raceGame: game, players: [], raceOwner: owner, startTime: 0, goal: '', inProgress: false };
    	client.join(race.name);
    	//TODO: this doesn't work
    	client.say(race.name, '/topic ' + owner + "'s " + game + ' lobby! Type .join to participate');
    	client.say(config.mainChannel, c.green(owner + ' has created a lobby for ' + game + '! To join the lobby, please go to this race: ' + race.name + ' and type .join'));
    	races.push(race);
    	saveIndex();
    	index++;
    	//If the usage isn't correct
    } else if(message.indexOf(createCommand) !== -1  && to != config.mainChannel) {
    	client.say(from, c.red(owner + ': You messed up! Either you had too many arguments or used the command incorrectly. Correct usage: .create <game>'));
    //help
} else if (message.toUpperCase() == commands[0].toUpperCase()){
	client.say(to, from + ': this is a WIP speed running bot.');
    //join; check to be sure the race isn't in progress
} else if (message.toUpperCase() == commands[2].toUpperCase() && !race.inProgress) {
    	//If the message is in the home channel don't send
    	if(to !== config.mainChannel) {
    		//If they aren't already in the race
    		if(typeof playerLocInArray !== 'number') {
    			race.players.push({ player: from,
    				ready: false,
    				time: 0,
    				done: false,
    				comment: ''});
    			client.say(to, from + " has joined the game! Type .ready to set your status!");
    		} else {
    			client.say(to, from + ": you are already in the race");
    		}
    	} else {
    		client.say(to, 'You cannot join a game in the home channel, ' + from + '!');
    	} 

    //unjoin
} else if (message.toUpperCase() == commands[3].toUpperCase()) {
	if(to !== config.mainChannel) {
			//find the race in races, then find the player in race.players and splice them.
			if(typeof playerLocInArray == 'number') {
				race.players.splice(playerLocInArray, 1);
			}
			client.say(to, from + " has left the game!");
		} else {
			client.say(to, 'You cannot leave a game in the home channel, ' + from + '!');
		}
    //done
} else if (message.toUpperCase() == commands[4].toUpperCase()) {
	if(typeof playerLocInArray == 'number') {
		var playerReady = race.players.filter(function(e){return (e === race.players[playerLocInArray].player)}).length > 0;
		//If they're in the race
		if(!playerReady && race.players[playerLocInArray].done != true) {
			var finalTime = Date.now() - race.startTime;
			race.players[playerLocInArray].time = finalTime;
			race.players[playerLocInArray].done = true;
			client.say(to, from + ' is now done with a time of ' + msToTime(finalTime.toString()));
			//Store the finishde players
			var player = race.players[playerLocInArray];
			completed.push({name: player.player, game: race.raceGame, time: player.time});

			addToRecords(completed);
		} else {
			client.say(to, from + ': you must be in the race to be done!');
		}

		if(race.players.every(isDone)) {
			race.inProgress = false;
			race.players = sortByKey(race.players, 'time');
			client.say(to, 'The race is now complete! The winner is ' + race.players[0].player + ' with a time of ' + msToTime(race.players[0].time).toString());
			client.say(config.mainChannel, c.green('The race ' + race.raceGame + ' in channel ' + to + ' has finished!'));
			client.say(config.mainChannel, 'The winner was ' + race.players[0].player + ' with a time of ' + msToTime(race.players[0].time).toString());

		}

		function isDone(element, index, array) {
			return element.done;
		}
	} else {
		client.say(to, from + ': you are not in the race');
	}
//stop
} else if (message.toUpperCase() == commands[5].toUpperCase()) {
	if((from == race.raceOwner || isOp(from)) && race.inProgess) {
		race.inProgress = false;
		race.players = sortByKey(race.players, 'time');
		client.say(to, 'The race is now complete! The winner is ' + race.players[0].player + ' with a time of ' + msToTime(race.players[0].time).toString());
	} else {
		client.say(to, from + ': the race is not in progress!');
	}
    //races
} else if (message.toUpperCase() == commands[6].toUpperCase()) {
	if (races.length > 0) {
		client.say(to, 'The current races are: ');
		for(var i=0; i < races.length; i++) {
			console.log(races, races[i].name);
			client.say(to, 'Name: ' + races[i].name.toString() + ', goal: ' + races[i].goal.toString());
		}
	} else {
		client.say(from, 'No current races!');
	}
    //start
} else if (message.toUpperCase() == commands[7].toUpperCase()) {
	if(from == race.raceOwner && race.players.length !== 0) {
		function isReady(element, index, array) {
			return element.ready;
		}

		if(race.players.every(isReady)) {
			client.say(to, 'All players are ready! Starting in 10 seconds!');
			race.inProgress = true;
			startRace(client, race.name, race.players);
			race.startTime = Date.now();
			client.say(config.mainChannel, 'The race ' + race.raceGame + ' in channel ' + to + ' has begun!');			
		} else {
			client.say(to, 'Not all players are ready! Cannot start!');

		}
	} else {
		client.say(to, from + ', you are either not the race owner, or no players have joined!');
	}
    //ready
} else if (message.toUpperCase() == commands[8].toUpperCase()) {

	if(typeof playerLocInArray == 'number') {
		var playerReady = race.players.filter(function(e){return (e === race.players[playerLocInArray].player)}).length > 0
		if(!playerReady) {
			race.players[playerLocInArray].ready = true;
			client.say(to, from + ' is now ready!'); 
    		//they never joined, so lets do that for them!
    	} else {
    		client.say(to, from + ' you must join the game to ready up'); 

    	}
    }
   	 //unready
   	} else if (message.toUpperCase() == commands[9].toUpperCase()) {
   		race.players[playerLocInArray].ready = false;
   		client.say(to, from + ' is no longer ready');
     //setgoal
 } else if(splitMessage.indexOf(commands[10]) > -1 && to !== config.mainChannel) {
 	if(from == race.raceOwner) {
 		var goalString = splitMessage.splice(1, splitMessage.length).join(' ') + " ";
 		race.goal = goalString;
 		client.say(to, from + ' has set the goal.');
 	} else {
 		client.say(to, from + ': you must be the owner to change the goal.');
 	}
     //goal
 } else if (message.toUpperCase() == commands[11].toUpperCase()) {
 	client.say(to, from + ": the current goal is '" + race.goal + "'");
    //owner
}  else if (message.toUpperCase() == commands[12].toUpperCase()) {
	if(to == config.mainChannel) {
		client.say(config.mainChannel, 'I am the supreme ruler!');
	} else {
		client.say(to, 'The owner of this race is ' + race.gameOwner);
	}
   //entrants or racers
} else if (message.toUpperCase() == commands[13].toUpperCase() || message.toUpperCase() == commands[14].toUpperCase()) {
	//make sure we're not in the main channel
	if(to != config.mainChannel && race.inProgress) {
		var finishedRacers = [];
		var runningRacers = [];
		
		race.players.forEach(function(e, i, a) {
			if(e.done == true) {
				finishedRacers.push(e.player + ' is done! Their time was ' + msToTime(e.time)  + ' and their comment is: ' + e.comment);
			}  else {
				runningRacers.push(e.player + 'is still running! Their current time is ' + msToTime((Date.now() - race.startTime)) + ' and their comment is: ' + e.comment);
			}
		});
		
		client.say(to, 'The entrants for this race are: ');
		finishedRacers.forEach(function(e, i, a) {
			client.say(to, c.green(e));
		});
		runningRacers.forEach(function(e, i, a) {
			client.say(to, e);
		});
	} else {
		client.say(to, 'You are either not in the right channel or the race has not yet begun!');
	}
   //reset
} else if(message.toUpperCase() == commands[15].toUpperCase()) {
	//Just clean the players
	race.players = [];
	race.inProgress = false;
	race.startTime = 0;
	client.say(to, 'The race has been reset! Be sure to .join and .ready again!');
 //kick 
} else if (splitMessage.indexOf(opCommands[0]) > -1 && to !== config.mainChannel && (isOp(from) == true || from == race.raceOwner) ) {
	if(typeof playerLocInArray == 'number') {
		race.players.splice(playerLocInArray, 1);
		client.say(to, from + " has kicked " + playerLocInArray.player);
	} else {
		client.say(to, from + ': you had either too many or too few arguments');
	}
  //ops
} else if (message.toUpperCase() == commands[16].toUpperCase()) {
	client.say(to, 'The current OPs are: ');
	ops.forEach(function(e, i, a) {
		client.say(to, JSON.stringify(e));
	});
  //forfeit
}  else if (message.toUpperCase() == commands[17].toUpperCase()) {
	if(typeof playerLocInArray == 'number') {
		race.players.splice(playerLocInArray, 1);
		client.say(to, from + ' has forfeited the race!');
	} else {
		client.say(to, from + ': something went wrong');
	}
   //forcestart
} else if (message.toUpperCase() == commands[18].toUpperCase() && (from == race.raceOwner || from == isOp(from))) {
	race.players.forEach(function(e, i, a) {
		if(!e.ready) {
			race.players.splice(playerLocInArray, 1);
		}
	});
	client.say(to, from + ": has force-start a race; unready players have been kicked!");
	race.inProgress = true;

	startRace(client, race.name);
	race.startTime = Date.now();	
   //comment
}  else if (splitMessage.indexOf(commands[19]) > -1 && to !== config.mainChannel && race.startTime > 0) {
	if(typeof playerLocInArray == 'number') {
		var commentString = splitMessage.splice(1, splitMessage.length).join(' ') + " ";
		race.players[playerLocInArray].comment = commentString;
	} else {
		client.say(to, from + ': you cannot comment if you are not in the race');
	}
}
//A debug command for printing out the races; to be removed in final versions (maybe just OPs?)
else if (message == '.print') {
	client.say(to, JSON.stringify(race.players));
}
});

//For finding a key in an array, used for the multiple playerLocInArray
//TODO: make only one playerLocInArray
function find_in_array(arr, name, value) {
	for (var i = 0, len = arr.length; i<len; i++) {
		if (name in arr[i] && arr[i][name] == value) return i;
	};
	return null;
}

//Check if a user (by their nick) is a bot-OP (in ops.txt)
function isOp(name) {
	//They're an OP
	if(ops.indexOf(name) > -1) {
		return true;
	} else {
		return false;
	}
}

//To start the race; used for the 'start' command. Previously had a callback() for the time, 
//but now the time is handled by the 'race' array. If the timer is 2 I apologize, I set it low for testing
// and don't wish to set a bool to change it atm.
function startRace(client, channel, racers) {
	var seconds;
	var timer = 10;
	var start;
	var id = setInterval(function() {
		timer--;
		if(timer < 0) {
			var runners = '';
			racers.forEach(function(e, i, a) {
				runners += ' ' + e.player.toString();
			});
			client.say(channel, c.green('The race begins!' + runners + ' go!'));
			clearInterval(id);
		} else {
			client.say(channel, timer+1);
		}
	}, 1000);
}

//For NickServ registration, as NickServ will identify the bot before it tries to join the channel.
//TODO: fix this
function sleep(delay) {
	var start = new Date().getTime();
	while (new Date().getTime() < start + delay);
}

//for converting Date.now() into minutes
function msToTime(s) {

	function addZ(n) {
		return (n<10? '0':'') + n;
	}

	var ms = s % 1000;
	s = (s - ms) / 1000;
	var secs = s % 60;
	s = (s - secs) / 60;
	var mins = s % 60;
	var hrs = (s - mins) / 60;

	return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs) + '.' + ms;
}

//players: [player: string, ready: bool, time: int, done: bool]
//for finding the winner
//thanks stackoverflow!
function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = a[key]; var y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
}
