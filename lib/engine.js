var path = require('path');

// ---

var packages = require(path.join(__dirname, 'packages.js'));
var services = require(path.join(__dirname, 'services.js'));
var commands = require(path.join(__dirname, 'commands.js'));

// ---

function launch(opt, manifest, plugins, target, callback) {
	(plugins || []).forEach(function (plugin) {
		plugin.roost(opt, manifest, target);
	});
	
	packages.roost(manifest, target);
	services.roost(manifest, target);
	commands.roost(manifest, target);
	
	target.on('error', function (error) {
		callback(error);
	});
	
	target.on('complete', function () {
		callback();
	});
	
	try {
		target.ignite(opt.options.dry);
	} catch (e) {
		return callback(e);
	}
}

// ---

exports.launch = launch;
