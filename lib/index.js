var path = require('path');

// ---

[
	'bootstrap',
	'commands',
	'engine',
	'helpers',
	'local',
	'logger',
	'manifest',
	'packages',
	'plugins',
	'services',
	'shell',
	'ssh',
	'targets'
].forEach(function (module) {
	exports[module] = require(path.join(__dirname, module + '.js'));
});
