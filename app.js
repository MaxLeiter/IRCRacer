var irc = require('irc');
var fs = require('fs');
var config = require('./config');
var c = require('irc-colors');
//Server, Nick, Password, Channel
var commands = ['.help', '.create', '.join', '.leave', '.done', '.end', '.races', '.start', '.ready', '.unready', '.setgoal', '.goal', '.owner', '.entrants', '.racers', '.reset'];
var races = [];
var games = [];
var ops = [];
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

function saveIndex() {
	var	buffer = new Buffer(index.toString());
	var path = "public/index.txt";

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
	var path = "public/index.txt";
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
			console.log('Please add a 0 to index.txt in /public/');
		}
	});
}

function readOPs(callback) {
	var path = "public/ops.txt";
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
    if(to == config.mainChannel && message.substring(0, createCommand.length) == createCommand && splitMessage.length == 2 && message.indexOf(createCommand) !== -1) {
    	console.log(from + ' has created a lobby!');
    	var game = splitMessage[1];
    	var race = { name: '#' + config.nick + index,
    	raceGame: game, players: [], raceOwner: owner, startTime: 0, goal: '', inProgress: false };
    	console.log('New race is titled: ' + race.raceGame);
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
} else if (message == commands[0]){
	client.say(to, from + ': this is a WIP speed running bot.');
    //join
} else if (message == commands[2]) {
    	//If the message is in the home channel don't send
    	if(to !== config.mainChannel) {
    		race.players.push({ player: from,
    			ready: false,
    			time: 0,
    			done: false });
    		client.say(to, from + " has joined the game! Type .ready to set your status!");
    	} else {
    		client.say(to, 'You cannot join a game in the home channel, ' + from + '!');
    	} 
    //leave
} else if (message == commands[3]) {
	if(to !== config.mainChannel) {
			//find the race in races, then find the player in race.players and splice them.

			var playerLocInArray = find_in_array(race.players, 'player', from);
			race.players.splice(playerLocInArray, 1);
			client.say(to, from + " has left the game!");
		} else {
			client.say(to, 'You cannot leave a game in the home channel, ' + from + '!');
		}
    //done
} else if (message == commands[4]) {
	var playerLocInArray = find_in_array(race.players, 'player', from);
	var playerReady = race.players.filter(function(e){return (e === race.players[playerLocInArray].player)}).length > 0
	//If they're in the race
	if(!playerReady && race.players[playerLocInArray].done != true) {
		var playerLocInArray = find_in_array(race.players, 'player', from);
		var finalTime = Date.now() - race.startTime;
		race.players[playerLocInArray].time = finalTime;
		race.players[playerLocInArray].done = true;
		client.say(to, from + ' is now done with a time of ' + msToTime(finalTime.toString()));

	} else {
		client.say(to, from + ': you must be in the race to be done!');
	}
    //end
} else if (message == commands[5]) {
	if(from == race.raceOwner || isOp(from)) {
		race.inProgress = false;
		client.say(to, 'The race is now complete! The winner is ');
	}
    //races
} else if (message == commands[6]) {
	if (races.length > 0) {
		client.say(to, 'The current races are: ');
		for(var i=0; i < races.length; i++) {
			console.log(races, races[i].name);
			client.say(from, 'Name: ' + races[i].name.toString() + ', goal: ' + races[i].goal.toString());
		}
	} else {
		client.say(from, 'No current races!');
	}
    //start
} else if (message == commands[7]) {
	if(from == race.raceOwner) {
		function isReady(element, index, array) {
			return element.ready;
		}

		if(race.players.every(isReady)) {
			client.say(to, 'All players are ready! Starting in 10 seconds!');
			race.inProgress = true;
			startRace(client, race.name);
			race.startTime = Date.now();			
		} else {
			client.say(to, 'Not all players are ready! Cannot start!');

		}
	} else {
		client.say(to, from + ', you are not the race owner!');
	}
    //ready
} else if (message == commands[8]) {
	var playerLocInArray = find_in_array(race.players, 'player', from);

	var playerReady = race.players.filter(function(e){return (e === race.players[playerLocInArray].player)}).length > 0
	if(!playerReady) {
		race.players[playerLocInArray].ready = true;
		client.say(to, from + ' is now ready!'); 
    		//they never joined, so lets do that for them!
    	} else {
    		client.say(to, from + ' you must join the game to ready up'); 

    	}

   	 //unready
   	} else if (message == commands[9]) {
   		var playerLocInArray = find_in_array(race.players, 'player', from);
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
 } else if (message == commands[11]) {
 	client.say(to, from + ": the current goal is '" + race.goal + "'");
    //owner
}  else if (message == commands[12]) {
	if(to == config.mainChannel) {
		client.say(config.mainChannel, 'I am the supreme ruler!');
	} else {
		client.say(to, 'The owner of this race is ' + race.gameOwner);
	}
   //entrants or racers
} else if (message == commands[13] || message == commands[14]) {
	//make sure we're not in the main channel
	if(to != config.mainChannel && race.inProgress) {
		var finishedRacers = [];
		var runningRacers = [];
		var cachedTime = Date.now();
		race.players.forEach(function(e, i, a) {
			if(e.done == true) {
				finishedRacers.push(e.player + ' is done! Their time was ' + msToTime(e.time));
			}  else {
				runningRacers.push(e.player + 'is still running! Their current time is ' + msToTime(cachedTime - e.time));
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
		client.say(to, 'You must be in a racing channel to do this!');
	}
}
else if (message == '.print') {
	client.say(to, JSON.stringify(races));
}
});

function find_in_array(arr, name, value) {
	for (var i = 0, len = arr.length; i<len; i++) {
		if (name in arr[i] && arr[i][name] == value) return i;
	};
	return false;
}

function isOp(name) {
	//They're an OP
	if(ops.indexOf(name) > -1) {
		return true;
	} else {
		return false;
	}
}

function startRace(client, channel) {
	var seconds;
	var timer = 2;
	var start;
	var id = setInterval(function() {
		timer--;
		if(timer < 0) {
			client.say(channel, c.green('The race begins!'));
			clearInterval(id);
		} else {
			client.say(channel, timer+1);
		}
	}, 1000);
}

function sleep(delay) {
	var start = new Date().getTime();
	while (new Date().getTime() < start + delay);
}

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