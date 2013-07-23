var path = require('path');

// ---

var logger = require(path.join(__dirname, 'logger.js'));

// ---

function roost(opt, manifest, target) {
	logger.silly('processing roost commands');
	
	if (!manifest.hasOwnProperty('commands')) {
		return;
	}
	
	var commands;
	
	if (Array.isArray(manifest.commands)) {
		commands = manifest.commands;
	} else {
		var trueValues = [1, true, 'true', 'run', 'launch', 'exec', 'execute'];
		var falseValues = [0, false, 'false'];
		
		commands = Object.keys(manifest.commands).filter(function (name) {
			var value = manifest.commands[name];
			
			if (trueValues.indexOf(value) >= 0) {
				return true;
			} else
			if (valseValues.indexOf(value) >= 0) {
				return false;
			} else {
				throw new Error('undefined option for command ' + name);
			}
		});
	}
	
	logger.debug('roost commands to be executed', commands);
	
	commands.forEach(function (command) {
		target.system(command);
	});
}

// ---

exports.roost = roost;
