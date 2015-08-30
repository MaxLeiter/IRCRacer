//Credit to GiuBot
var fs = require('fs');
var extend = require('extend');

var config = {
	'prod': {
		server: 'chat.freenode.net', 
		nick: 'RacingBot',
		userName: 'RacingBot', 
		password: 'whatever', 
		mainChannel: '#Channel'
	}
};

var directory = fs.readdirSync(__dirname);
if(directory.indexOf('config-private.js') != -1) {
	var privateConfig = require('./config-private');
	config = extend(true, config, privateConfig);
}

if(!args.env) {
	console.log('No environment specified, exiting');
	process.exit();
}
if(!config[args.env]) {
	console.log('Invalid environment specified, exiting');
	process.exit();
}

module.exports = config[args.env];