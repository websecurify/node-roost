var path = require('path');

// ---

[
	'bootstrap',
	'commands',
	'engine',
	'helpers',
	'local',
	'manifest',
	'packages',
	'plugins',
	'services',
	'shell',
	'ssh',
	'targets',
	'sync'
].forEach(function (module) {
	exports[module] = require(path.join(__dirname, module + '.js'));
});
