function roost(manifest, target) {
	if (!manifest.hasOwnProperty('commands')) {
		return;
	}
	
	var commands;
	
	if (Array.isArray(manifest.commands)) {
		commands = manifest.commands;
	} else {
		commands = Object.keys(manifest.commands).filter(function (name) {
			var value = manifest.commands[name];
			
			if ([1, true, 'true', 'run', 'execute'].indexOf(value) >= 0) {
				return true;
			} else
			if ([0, false, 'false'].indexOf(value) >= 0) {
				return false;
			} else {
				throw new Error('undefined option for command ' + name);
			}
		});
	}
	
	commands.forEach(function (command) {
		target.exec(command);
	});
}

// ---

exports.roost = roost;
