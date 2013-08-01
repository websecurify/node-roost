var fs = require('fs');
var url = require('url');
var ssh2 = require('ssh2');
var path = require('path');

// ---

var shell = require(path.join(__dirname, 'shell.js'));
var logger = require(path.join(__dirname, 'logger.js'));
var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function parseSpec(spec) {
	spec = url.parse(spec);
	
	var authTokens = (spec.auth || '').split(':');
	var username = authTokens[0] ? decodeURIComponent(authTokens[0]) : undefined;
	var password = authTokens[1] ? decodeURIComponent(authTokens[1]) : undefined;
	
	spec.username = username;
	spec.password = password;
	
	var privateKey;
	var passphrase;
	
	(spec.pathname || '').split(/;/g).slice(1)
		.map(function (entry) {
			return entry.split('=');
		})
		.forEach(function (entry) {
			var name = entry[0].trim();
			var value = entry[1];
			
			if (name == 'privateKey') {
				privateKey = decodeURIComponent(value);
			} else
			if (name == 'passphrase') {
				passphrase = decodeURIComponent(value);
			}
		});
		
	spec.privateKey = privateKey;
	spec.passphrase = passphrase;
	
	return spec;
}

// ---

function Connection(manifest) {
	this.manifest = manifest;
	this.ssh2 = new ssh2();
}

Connection.prototype.connect = function (options, callback) {
	if (typeof(options) == 'string' || options instanceof String) {
		var spec;
		
		try {
			spec = exports.parseSpec(options);
		} catch (e) {
			return callback(e);
		}
		
		options  = {
			tryKeyboard: true,
			host: spec.hostname,
			port: spec.port,
			username: spec.username,
			password: spec.password,
			privateKey: spec.privateKey,
			passphrase: spec.passphrase
		};
	} else
	if (options.hasOwnProperty('spec')) {
		var spec;
		
		try {
			spec = exports.parseSpec(options.spec);
		} catch (e) {
			return callback(e);
		}
		
		['host', 'port', 'username', 'password', 'privateKey', 'passphrase'].forEach(function (param) {
			if (!options.hasOwnProperty(param)) {
				options[param] = spec[param];
			}
		});
	}
	
	logger.debug('connect to ssh with options', options);
	
	if (options.hasOwnProperty('privateKey') && options.privateKey) {
		options.privateKey = path.resolve(path.dirname(this.manifest.meta.location), options.privateKey);
		
		if (fs.existsSync(options.privateKey)) {
			options.privateKey = fs.readFileSync(options.privateKey);
		} else {
			return callback(helpers.e('private key', helpers.q(options.privateKey), 'does not exist'));
		}
	}
	
	this.ssh2.on('error', function (error) {
		if (error.code == 'ECONNREFUSED') {
			error = helpers.e('connection refused');
		} else
		if (error.code == 'ETIMEDOUT') {
			error = helpers.e('connection timedout');
		} else
		if (error.level == 'authentication') {
			error = helpers.e(error.message.toLowerCase().replace('.', ' -'));
		}
		
		callback(error);
	});
	
	this.ssh2.on('close', function (hadError) {
		if (hadError) {
			logger.debug('connection closed cleanly');
		} else {
			logger.debug('connection closed with errors');
		}
	});
	
	this.ssh2.on('end', function() {
		logger.debug('connection end');
	});
	
	this.ssh2.on('ready', function () {
		callback();
	});
	
	try {
		this.ssh2.connect(options);
	} catch (e) {
		return callback(e);
	}
};

Connection.prototype.disconnect = function (options, callback) {
	try {
		this.ssh2.end();
	} catch (e) {
		return callback(e);
	}
	
	callback();
};

Connection.prototype.exec = function (command, callback) {
	logger.debug('exec', command);
	
	try {
		this.ssh2.exec(command, function (err, stream) {
			if (err) {
				return callback(err);
			}
			
			var shellStream = new shell.Stream();
			
			stream.on('data', function (data, extended) {
				if (extended == 'stdout') {
					shellStream.emitDataForStdout(data);
				} else
				if (extended == 'stderr') {
					shellStream.emitDataForStderr(data);
				} else {
					shellStream.emitDataForStdout(data);
				}
			});
			
			stream.on('error', function (error) {
				shellStream.emitError(error);
			});
			
			stream.on('exit', function (code, signal) {
				shellStream.emitExit(code);
			});
			
			callback(null, shellStream);
		});
	} catch (e) {
		return callback(e);
	}
};

Connection.prototype.spawn = function (command, args, callback) {
	logger.debug('spawn', [command].concat(args).join(' '));
	
	args = (args ? args : []).map(function (arg) {
		return shell.quote(arg);
	}).join(' ');
	
	command = command + ' ' + args;
	
	try {
		this.ssh2.exec(command, function (err, stream) {
			if (err) {
				return callback(err);
			}
			
			var shellStream = new shell.Stream();
			
			stream.on('data', function (data, extended) {
				if (extended == 'stdout') {
					shellStream.emitDataForStdout(data);
				} else
				if (extended == 'stderr') {
					shellStream.emitDataForStderr(data);
				} else {
					shellStream.emitDataForStdout(data);
				}
			});
			
			stream.on('error', function (error) {
				shellStream.emitError(error);
			});
			
			stream.on('exit', function (code, signal) {
				shellStream.emitExit(code);
			});
			
			callback(null, shellStream);
		});
	} catch (e) {
		return callback(e);
	}
};

Connection.prototype.shell = function (callback) {
	// NOTE: it is likely that this implementation is not working as it should
	this.ssh2.shell({term: process.env['TERM']}, function (err, stream) {
		if (err) {
			return callback(err);
		}
		
		process.stdin.on('error', function (error) {
			process.stdout.write('\n');
			
			return callback(error);
		});
		
		process.stdin.on('end', function() {
			process.stdout.write('\n');
			
			return callback();
		});
		
		stream.on('error', function (error) {
			process.stdout.write('\n');
			
			return callback(error);
		});
		
		stream.on('end', function () {
			process.stdout.write('\n');
			
			return callback();
		});
		
		process.stdin.pipe(stream, {end: false});
		stream.pipe(process.stdout, {end: false});
	});
	//
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
