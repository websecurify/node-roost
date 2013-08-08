var path = require('path');
var logsmith = require('logsmith');

// ---

var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roostApt(opt, manifest, target) {
	if (!manifest.hasOwnProperty('apt')) {
		return;
	}
	
	var apt = manifest.apt;
	
	logsmith.debug('apt configuration', apt);
	
	if (apt.hasOwnProperty('repositories')) {
		target.exec('sudo apt-get update');
		target.exec('sudo apt-get -y install python-software-properties');
		
		apt.repositories.forEach(function (repository) {
			target.spawn('sudo', ['add-apt-repository', repository]);
		});
	}
	
	if (apt.hasOwnProperty('update') && apt.update) {
		target.exec('sudo apt-get update');
	}
}

function roostPackages(opt, manifest, target) {
	if (!manifest.hasOwnProperty('packages')) {
		return;
	}
	
	var packages = manifest.packages;
	
	if (Array.isArray(manifest.packages)) {
		var packages = {};
		
		manifest.packages.forEach(function (name) {
			packages[name] = true;
		});
		
		manifest.packages = packages;
	}
	
	logsmith.debug('roost packages to be processed', manifest.packages);
	
	var trueValues = [1, true, 'true', 'install', 'installed'];
	var falseValues = [0, false, 'false', 'remove', 'removed', 'purge', 'purged'];
	
	Object.keys(manifest.packages).forEach(function (name) {
		var value = manifest.packages[name];
		
		var action;
		
		if (trueValues.indexOf(value) >= 0) {
			action = 'install';
		} else
		if (falseValues.indexOf(value) >= 0) {
			action = 'remove';
		} else
		if (value.indexOf && value.indexOf('.') > 0) {
			action = 'install';
			name = name + '=' + value;
		} else {
			throw helpers.e('undefined option for package', helpers.q(name));
		}
		
		target.spawn('sudo', ['apt-get', '-y', action, name]);
	});
}

// ---

function roost(opt, manifest, target) {
	exports.roostApt(opt, manifest, target);
	exports.roostPackages(opt, manifest, target);
}

// ---

exports.roostApt = roostApt;
exports.roostPackages = roostPackages;
exports.roost = roost;
