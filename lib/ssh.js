var path = require('path');
var url = require('url');
var fs = require('fs');
var ssh2 = require('ssh2');

// ---

var logger = require(path.join(__dirname, 'logger.js'));
var shell = require(path.join(__dirname, 'shell.js'));

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
	
	logger.debug('ssh spec', spec);
	
	return spec;
}

// ---

function Connection() {
	this.ssh2 = new ssh2();
}

Connection.prototype.connect = function (options, callback) {
	if (typeof(options) == 'string' || options instanceof String) {
		var spec = parseSpec(options);
		
		spec.privateKey = spec.privateKey ? fs.readFileSync(spec.privateKey) : undefined;
		
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
		var spec = parseSpec(options.spec);
		
		spec.privateKey = spec.privateKey ? fs.readFileSync(spec.privateKey) : undefined;
		
		['host', 'port', 'username', 'password', 'privateKey', 'passphrase'].forEach(function (param) {
			if (!options.hasOwnProperty(param)) {
				options[param] = spec[param];
			}
		});
	}
	
	this.ssh2.on('error', function (error) {
		if (error.code == 'ECONNREFUSED') {
			error = new Error('connection refused', error);
		}
		
		callback(error);
	});
	
	this.ssh2.on('ready', function () {
		callback();
	});
	
	this.ssh2.connect(options);
};

Connection.prototype.disconnect = function (options, callback) {
	this.ssh2.end();
	
	callback();
};

Connection.prototype.system = function (command, callback) {
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
};

Connection.prototype.spawn = function (command, args, callback) {
	args = (args ? args : []).map(function (arg) {
		return shell.quote(arg);
	}).join(' ');
	
	command = command + ' ' + args;
	
	this.system(command, callback);
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
