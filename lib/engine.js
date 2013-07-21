var path = require('path');
var packages = require(path.join(__dirname, 'roost_packages.js'));
var services = require(path.join(__dirname, 'roost_services.js'));
var commands = require(path.join(__dirname, 'roost_commands.js'));

// ---

function launch(manifest, target, plugins) {
	plugins.forEach(function (plugin) {
		plugin.roost(manifest, target);
	});
	
	packages.roost(manifest, target);
	services.roost(manifest, target);
	commands.roost(manifest, target);
}

// ---

exports.launch = launch;
