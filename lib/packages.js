function roostApt(opt, manifest, target) {
	if (!manifest.hasOwnProperty('apt')) {
		return;
	}
	
	if (manifest.apt.hasOwnProperty('update') && manifest.apt.update) {
		target.system('sudo apt-get update');
	}
}

function roostPackages(opt, manifest, target) {
	if (!manifest.hasOwnProperty('packages')) {
		return;
	}
	
	if (Array.isArray(manifest.packages)) {
		var packages = {};
		
		manifest.packages.forEach(function (name) {
			packages[name] = true;
		});
		
		manifest.packages = packages;
	}
	
	Object.keys(manifest.packages).forEach(function (name) {
		var value = manifest.packages[name];
		
		var action;
		
		if ([1, true, 'true', 'install', 'installed'].indexOf(value) >= 0) {
			action = 'install';
		} else
		if ([0, false, 'false', 'remove', 'removed', 'purge', 'purged'].indexOf(value) >= 0) {
			action = 'remove';
		} else
		if (value.indexOf && value.indexOf('.') > 0) {
			action = 'install';
			name = name + '=' + value;
		} else {
			throw new Error('undefined option for package ' + name);
		}
		
		target.spawn('sudo', ['apt-get', '-y', '--fix-missing', action, name]);
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
