var path = require('path');
var url = require('url');
var child_process = require('child_process');

// ---

var logger = require(path.join(__dirname, 'logger.js'));
var shell = require(path.join(__dirname, 'shell.js'));

// ---

function parseSpec(spec) {
	spec = url.parse(spec);
	
	return spec;
}

// ---

function Connection(manifest) {
	// pass
}

Connection.prototype.connect = function (options, callback) {
	if (typeof(options) == 'string' || options instanceof String) {
		var spec = exports.parseSpec(options);
		
		// NOTE: perhaps handle local spec here
	} else
	if (options.hasOwnProperty('spec')) {
		var spec = exports.parseSpec(options.spec);
		
		// NOTE: perhaps handle local spec here
	}
	
	callback();
};

Connection.prototype.disconnect = function (options, callback) {
	callback();
};

Connection.prototype.spawn = function (command, args, callback) {
	logger.debug('spawn command', command, 'with args', args);
	
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
	logger.debug('system command', command);
	
	this.spawn('sh', ['-c', command], callback);
};

Connection.prototype.shell = function (callback) {
	// TODO: add code here
	return callback(new Error('not implemented'));
	//
});

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
