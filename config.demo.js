//Credit to GiuBot
var fs = require('fs');

var config = {
	'prod': {
		server: 'chat.freenode.net', 
		nick: 'RaceBotChannel',
		userName: 'RacingBot', 
		password: 'racer', 
		mainChannel: '#Racingwhoo'

	}
};

module.exports = config['prod'];

