function roost(manifest, target) {
	if (!manifest.hasOwnProperty('commands')) {
		return;
	}
	
	if (Array.isArray(manifest.commands)) {
		var commands = {};
		
		manifest.commands.forEach(function (name) {
			commands[name] = true;
		});
		
		manifest.commands = commands;
	}
	
	Object.keys(manifest.commands).forEach(function (name) {
		var value = manifest.commands[name];
		
		if ([1, true, 'true', 'run', 'execute'].indexOf(value) >= 0) {
			target.exec(name);
		} else
		if ([0, false, 'false'].indexOf(value) >= 0) {
			// pass
		} else {
			throw new Error('undefined option for command ' + name);
		}
	});
}

// ---

exports.roost = roost;
