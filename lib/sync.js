var path = require('path');
var logsmith = require('logsmith');

// ---

var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function roost(opt, manifest, target) {
	logsmith.silly('processing roost sync');
	
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
