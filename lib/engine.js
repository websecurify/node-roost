var path = require('path');

// ---

var packages = require(path.join(__dirname, 'packages.js'));
var services = require(path.join(__dirname, 'services.js'));
var commands = require(path.join(__dirname, 'commands.js'));

// ---

function launch(opt, manifest, plugins, target, next) {
	(plugins || []).forEach(function (plugin) {
		plugin.roost(manifest, target);
	});
	
	packages.roost(manifest, target);
	services.roost(manifest, target);
	commands.roost(manifest, target);
	
	target.on('error', function (error) {
		next(error);
	});
	
	target.on('complete', function () {
		next();
	});
	
	try {
		target.ignite(opt.options.dry);
	} catch (e) {
		return next(e);
	}
}

// ---

exports.launch = launch;
