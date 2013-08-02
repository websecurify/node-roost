var path = require('path');
var url = require('url');
var child_process = require('child_process');

// ---

var shell = require(path.join(__dirname, 'shell.js'));
var logger = require(path.join(__dirname, 'logger.js'));
var helpers = require(path.join(__dirname, 'helpers.js'));

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

Connection.prototype.exec = function (command, callback) {
	logger.debug('exec', command);
	
	var shellStream = new shell.Stream();
	var child = child_process.spawn('sh', ['-c', command]);
	
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

Connection.prototype.spawn = function (command, args, callback) {
	logger.debug('spawn', [command].concat(args).join(' '));
	
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

Connection.prototype.shell = function (callback) {
	var shell;
	
	if (process.platform.match(/^win/)) {
		shell = 'cmd';
	} else {
		shell = 'sh';
	}
	
	process.stdin.setRawMode(true);
	
	var child = child_process.spawn(shell, [], {stdio: 'inherit'});
	
	child.on('error', function (error) {
		return callback(error);
	})
	
	child.on('exit', function (code) {
		return callback();
	});
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
