var path = require('path');
var url = require('url');
var child_process = require('child_process');

// ---

var shell = require(path.join(__dirname, 'shell.js'));

// ---

function parseSpec(spec) {
	spec = url.parse(spec);
	
	return spec;
}

// ---

function Connection() {
	// pass
}

Connection.prototype.connect = function (options) {
	if (typeof(options) == 'string' || options instanceof String) {
		var spec = parseSpec(options);
		
		// NOTE: perhaps handle local spec here
	} else
	if (options.hasOwnProperty('spec')) {
		var spec = parseSpec(options.spec);
		
		// NOTE: perhaps handle local spec here
	}
};

Connection.prototype.spawn = function (command, args, callback) {
	var shellStream = new shell.Stream();
	var child = child_process.spawn(command, args);
	
	child.stdout.on('data', function (data) {
		shellStream.emitDataForStdout(data);
	});
	
	child.stderr.on('data', function (data) {
		shellStream.emitDataForStderr(data);
	});
	
	child.on('error', function (error) {
		shellStream.emitError(error);
	})
	
	child.on('exit', function (code) {
		shellStream.emitExit(code);
	});
	
	callback(null, shellStream);
};

Connection.prototype.system = function (command, callback) {
	this.spawn('sh', ['-c', command], callback);
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
