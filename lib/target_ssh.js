var fs = require('fs');
var url = require('url');
var util = require('util');
var ssh2 = require('ssh2');
var path = require('path');
var events = require('events');
var logsmith = require('logsmith');

// ---

var helpers = require(path.join(__dirname, 'helpers'));

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
	
	logsmith.debug('connect to ssh with options', options);
	
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
			logsmith.debug('connection closed cleanly');
		} else {
			logsmith.debug('connection closed with errors');
		}
	});
	
	this.ssh2.on('end', function() {
		logsmith.debug('connection end');
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
	logsmith.debug('exec', command);
	
	try {
		this.ssh2.exec(command, function (err, stream) {
			if (err) {
				return callback(err);
			}
			
			var shellStream = new helpers.Stream();
			
			stream.on('data', function (data, extended) {
				if (extended == 'stdout') {
					shellStream.emit_data_for_stdout(data);
				} else
				if (extended == 'stderr') {
					shellStream.emit_data_for_stderr(data);
				} else {
					shellStream.emit_data_for_stdout(data);
				}
			});
			
			stream.on('error', function (error) {
				shellStream.emit_error(error);
			});
			
			stream.on('exit', function (code, signal) {
				shellStream.emit_exit(code);
			});
			
			callback(null, shellStream);
		});
	} catch (e) {
		return callback(e);
	}
};

Connection.prototype.spawn = function (command, args, callback) {
	logsmith.debug('spawn', [command].concat(args).join(' '));
	
	args = (args ? args : []).map(function (arg) {
		return helpers.quote(arg);
	}).join(' ');
	
	command = command + ' ' + args;
	
	try {
		this.ssh2.exec(command, function (err, stream) {
			if (err) {
				return callback(err);
			}
			
			var shellStream = new helpers.Stream();
			
			stream.on('data', function (data, extended) {
				if (extended == 'stdout') {
					shellStream.emit_data_for_stdout(data);
				} else
				if (extended == 'stderr') {
					shellStream.emit_data_for_stderr(data);
				} else {
					shellStream.emit_data_for_stdout(data);
				}
			});
			
			stream.on('error', function (error) {
				shellStream.emit_error(error);
			});
			
			stream.on('exit', function (code, signal) {
				shellStream.emit_exit(code);
			});
			
			callback(null, shellStream);
		});
	} catch (e) {
		return callback(e);
	}
};

Connection.prototype.shell = function (callback) {
	this.ssh2.shell({term: process.env['TERM'], rows: process.stdout.rows, cols: process.stdout.columns}, function (err, stream) {
		if (err) {
			return callback(err);
		}
		
		var onResize = function () {
			stream.setWindow(process.stdout.rows, process.stdout.columns);
		};
		
		var init = function () {
			process.stdin.setRawMode(true);
			process.stdout.on('resize', onResize);
			process.stdin.pipe(stream);
			stream.pipe(process.stdout, {end: false});
		};
		
		var deinit = function () {
			process.stdin.unpipe(stream);
			process.stdout.removeListener('resize', onResize);
			process.stdin.setRawMode(false);
		};
		
		process.stdin.on('error', function (error) {
			deinit();
			
			return callback(error);
		});
		
		process.stdin.on('end', function() {
			deinit();
			
			return callback();
		});
		
		stream.on('error', function (error) {
			deinit();
			
			return callback(error);
		});
		
		stream.on('end', function () {
			deinit();
			
			return callback();
		});
		
		init();
	});
};

// ---

function Procedure() {
	events.EventEmitter.call(this);
	
	this.lasts = [];
	this.steps = [];
}

util.inherits(Procedure, events.EventEmitter);

Procedure.prototype.last = function (func, desc) {
	this.lasts.push([func, desc]);
};

Procedure.prototype.step = function (func, desc) {
	this.steps.push([func, desc]);
};

Procedure.prototype.ignite = function (isDryRun) {
	var self = this;
	
	var doLast = function (err) {
		if (err) {
			return self.emit('error', err);
		}
		
		var last = self.lasts.shift();
		
		if (!last) {
			return self.emit('complete');
		}
		
		func = last[0];
		desc = last[1];
		
		if (isDryRun) {
			(function (next) {
				if (desc) {
					logsmith.info(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				logsmith.info(desc);
			}
			
			try {
				func.call(self, arguments.callee);
			} catch (e) {
				arguments.callee(e);
			}
		}
	};
	
	var doStep = function (err) {
		if (err) {
			self.last(function (next) {
				return next(err);
			});
			
			return doLast();
		}
		
		var step = self.steps.shift();
		
		if (!step) {
			return doLast();
		}
		
		func = step[0];
		desc = step[1];
		
		if (isDryRun) {
			(function (next) {
				if (desc) {
					logsmith.info(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				logsmith.info(desc);
			}
			
			try {
				func.call(self, arguments.callee);
			} catch (e) {
				arguments.callee(e);
			}
		}
	};
	
	doStep();
};

// ---

function createExecHandler(next, failproofORhandler) {
	return function (err, stream) {
		if (err) {
			return next(err);
		}
		
		stream.on('data', function (data, extended) {
			var out;
			
			if (extended == 'stdout') {
				out = process.stdout;
			} else
			if (extended == 'stderr') {
				out = process.stderr;
			} else {
				out = process.stdout;
			}
			
			out.write(data);
		});
		
		var failproof;
		var handler;
		
		if (failproofORhandler == undefined) {
			failproof = false;
			handler = null;
		} else
		if (typeof(failproofORhandler) == 'boolean' || failproofORhandler instanceof Boolean) {
			failproof = failproofORhandler;
			handler = null;
		} else {
			failproof = false;
			handler = failproofORhandler;
		}
		
		if (handler) {
			try {
				handler.call(this, stream, next);
			} catch (e) {
				return next(e);
			}
		} else {
			stream.on('exit', function (code) {
				if (code && !failproof) {
					return next(helpers.e('command exited with code', code));
				}
				
				next();
			});
		}
	};
}

// ---

function Target(spec, manifest) {
	Procedure.apply(this, arguments);
	
	this.connection = new Connection(manifest);
	
	this.step(function (next) {
		this.connection.connect(spec, function (err) {
			if (err) {
				return next(err);
			}
			
			next();
		});
	});
	
	this.last(function (next) {
		this.connection.disconnect({}, function (err) {
			if (err) {
				// pass
			}
			
			next();
		});
	});
}

util.inherits(Target, Procedure);

Target.prototype.exec = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.exec(command, createExecHandler(next, failproofORhandler));
	}, command);
};

Target.prototype.spawn = function (command, args, failproofORhandler) {
	var desc = command + (args.length ? ' ' + args.join(' ') : '');
	
	this.step(function (next) {
		this.connection.spawn(command, args, createExecHandler(next, failproofORhandler));
	}, desc);
};

Target.prototype.copy = function (source, destination, handler) {
	this.step(function (next) {
		var realSource = path.resolve(path.dirname(this.connection.manifest.meta.location), source);
		
		if (!handler) {
			handler = function () {};
		}
		
		var end = function (sftp, err) {
			if (err) {
				handler(err);
				
				sftp.end();
				
				return next(err);
			}
			
			handler();
			
			sftp.end();
			
			return next(err);
		};
		
		this.connection.ssh2.sftp(function (err, sftp) {
			if (err) {
				return end(sftp, err);
			}
			
			sftp.fastPut(realSource, destination, function (err) {
				if (err) {
					return end(sftp, err);
				}
				console.log('here');
				return end(sftp);
			});
		});
	}, 'copying ' + source + ' to ' + destination);
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
exports.Target = Target;
