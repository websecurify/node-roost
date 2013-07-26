var path = require('path');

// ---

var logger = require(path.join(__dirname, 'logger.js'));
var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roost(opt, manifest, target) {
	if (!manifest.hasOwnProperty('services')) {
		return;
	}
	
	if (Array.isArray(manifest.services)) {
		var services = {};
		
		manifest.services.forEach(function (name) {
			services[name] = true;
		});
		
		manifest.services = services;
	}
	
	logger.debug('roost services to be processed', manifest.services);
	
	var trueValues = [1, true, 'true', 'run', 'running', 'start', 'started'];
	var falseValues = [0, false, 'false', 'stop', 'stopped'];
	
	Object.keys(manifest.services).forEach(function (name) {
		var value = manifest.services[name];
		
		var action;
		
		if (trueValues.indexOf(value) >= 0) {
			action = 'restart';
		} else
		if (falseValues.indexOf(value) >= 0) {
			action = 'stop';
		} else {
			throw helpers.e('undefined option for service', helpers.q(name));
		}
		
		target.spawn('sudo', ['service', name, action]);
	});
}

// ---

exports.roost = roost;
