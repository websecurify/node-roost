var url = require('url');
var fs = require('fs');
var util = require('util');
var ssh2 = require('ssh2');

// ---

function parseSpec(spec) {
	spec = url.parse(spec);
	
	var authTokens = (spec.auth || '').split(':');
	var username = authTokens[0] || undefined;
	var password = authTokens[1] || undefined;
	
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
				privateKey = value;
			} else
			if (name == 'passphrase') {
				passphrase = value;
			}
		});
		
	spec.privateKey = privateKey;
	spec.passphrase = passphrase;
	
	return spec;
}

// ---

function escape(input) {
	return input
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/(["`$\\])/g, '\\$1')
}

function quote(input) {
	return '"' + escape(input) + '"';
}

// ---

function Connection() {
	ssh2.call(this);
}

util.inherits(Connection, ssh2);

Connection.prototype.connect = function (options) {
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
		var spec = parseSpec(options);
		
		spec.privateKey = spec.privateKey ? fs.readFileSync(spec.privateKey) : undefined;
		
		['host', 'port', 'username', 'password', 'privateKey', 'passphrase'].forEach(function (param) {
			if (!options.hasOwnProperty(param)) {
				options[param] = spec[param];
			}
		});
	}
	
	ssh2.prototype.connect.call(this, options);
};

Connection.prototype.spawn = function (command, args, callback) {
	args = (args ? args : []).map(function (arg) {
		return quote(arg);
	}).join(' ');
	
	command = command + ' ' + args;
	
	this.exec(command, callback);
};

// ---

exports.parseSpec = parseSpec;
exports.escape = escape;
exports.quote = quote;
exports.Connection = Connection;
