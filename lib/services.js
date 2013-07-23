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
	
	Object.keys(manifest.services).forEach(function (name) {
		var value = manifest.services[name];
		
		var action;
		
		if ([1, true, 'true', 'run', 'running', 'start', 'started'].indexOf(value) >= 0) {
			action = 'restart';
		} else
		if ([0, false, 'false', 'stop', 'stopped'].indexOf(value) >= 0) {
			action = 'stop';
		} else {
			throw new Error('undefined option for service ' + name);
		}
		
		target.spawn('sudo', ['service', name, action]);
	});
}

// ---

exports.roost = roost;
