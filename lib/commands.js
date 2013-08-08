var path = require('path');
var logsmith = require('logsmith');

// ---

var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roost(opt, manifest, target) {
	logsmith.silly('processing roost commands');
	
	if (!manifest.hasOwnProperty('commands')) {
		return;
	}
	
	if (!Array.isArray(manifest.commands)) {
		throw helpers.e('commands option must be an array');
	}
	
	manifest.commands.forEach(function (command) {
		target.exec(command);
	});
}

// ---

exports.roost = roost;
