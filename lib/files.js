var fsExtra = require('fs-extra');
var logsmith = require('logsmith');
var pathExtra = require('path-extra');

// ---

function roost(opt, manifest, target) {
	logsmith.silly('processing roost files');
	
	if (!manifest.hasOwnProperty('files')) {
		return;
	}
	
	Object.keys(manifest.files).forEach(function (file) {
		var options = manifest.files[file];
		
		if (options.hasOwnProperty('source')) {
			target.copy(options.source, file);
		} else
		if (options.hasOwnProperty('content')) {
			var tempFile = pathExtra.join(pathExtra.tempdir(), new Date().getTime().toString());
			
			fsExtra.outputFile(tempFile, options.content, function (err) {
				if (err) {
					return target.error(err);
				}
				
				target.copy(tempFile, file, function () {
					fsExtra.remove(tempFile, function (err) {
						target.error(err);
					});
				});
			});
		}
	});
}

// ---

exports.roost = roost;
