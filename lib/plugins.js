var path = require('path');

// ---

function load(manifest) {
	if (!manifest.hasOwnProperty('plugins')) {
		return [];
	}
	
	var root = path.dirname(manifest.meta.location);
	
	return Object.keys(manifest.plugins)
		.filter(function (name) {
			return manifest.plugins[name];
		})
		.map(function (name) {
			var plugin;
			
			try {
				plugin = require(path.join(root, name));
			} catch (e) {
				if (e.code == 'MODULE_NOT_FOUND') {
					try {
						plugin = require(name);
					} catch (e) {
						throw new Error('cannot load plugin ' + name, e);
					}
				} else {
					throw new Error('cannot load plugin ' + name, e);
				}
			}
			
			if (!plugin.hasOwnProperty('roost')) {
				throw new Error('plugin ' + name + ' is not compatible');
			}
			
			return plugin;
		});
}

// ---

exports.load = load;
