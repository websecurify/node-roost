function roostApt(manifest, target) {
	if (!manifest.hasOwnProperty('apt')) {
		return;
	}
	
	if (manifest.apt.hasOwnProperty('update') && manifest.apt.update) {
		target.exec('sudo apt-get update');
	}
}

function roostPackages(manifest, target) {
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
		
		if ([1, true, 'true', 'install', 'installed'].indexOf(value) >= 0) {
			target.exec('sudo apt-get -y --fix-missing install ' + name);
		} else
		if ([0, false, 'false', 'remove', 'removed', 'purge', 'purged'].indexOf(value) >= 0) {
			target.exec('sudo apt-get -y --fix-missing remove ' + name);
		} else
		if (value.indexOf && value.indexOf('.') > 0) {
			target.exec('sudo apt-get -y --fix-missing install ' + name + '=' + value);
		} else {
			throw new Error('undefined option for package ' + name);
		}
	});
}

// ---

function roost(manifest, target) {
	roostApt(manifest, target);
	roostPackages(manifest, target);
}

// ---

exports.roostApt = roostApt;
exports.roostPackages = roostPackages;
exports.roost = roost;
