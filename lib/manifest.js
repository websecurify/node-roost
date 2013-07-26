var fs = require('fs');
var path = require('path');

// ---

function locate(location) {
	var file = location || path.join(process.cwd(), 'roost.json');
	
	if (!fs.existsSync(file)) {
		throw new Error('roost not found');
	}
	
	var stat = fs.statSync(file);
	
	if (stat.isDirectory()) {
		file = path.resolve(file, 'roost.json');
		stat = fs.statSync(file);
	}
	
	if (!stat.isFile()) {
		throw new Error('roost manifest does not exist');
	}
	
	return file;
}

// ---

function load(location) {
	var manifest = require(location);
	
	manifest.meta = {
		location: location,
	};
	
	return manifest;
}

// ---

exports.locate = locate;
exports.load = load;
