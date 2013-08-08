var path = require('path');
var logsmith = require('logsmith');

// ---

var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roost(opt, manifest, target) {
	logsmith.silly('processing roost bootstrap');
	
	if (!manifest.hasOwnProperty('bootstrap')) {
		return;
	}
	
	if (!Array.isArray(manifest.bootstrap)) {
		throw helpers.e('bootstrap option must be an array');
	}
	
	manifest.bootstrap.forEach(function (command) {
		target.exec(command);
	});
}

// ---

exports.roost = roost;
