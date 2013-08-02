var path = require('path');

// ---

var logger = require(path.join(__dirname, 'logger.js'));
var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roost(opt, manifest, target) {
	logger.silly('processing roost sync');
	
	if (!manifest.hasOwnProperty('sync')) {
		return;
	}
	
	Object.keys(manifest.sync).forEach(function (source) {
		var destination = manifest.sync[source];
		
		target.copy(source, destination);
	});
}

// ---

exports.roost = roost;
