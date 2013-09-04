var url = require('url');
var util = require('util');
var path = require('path');
var events = require('events');
var logsmith = require('logsmith');
var child_process = require('child_process');

// ---

var helpers = require(path.join(__dirname, 'helpers'));

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
	logsmith.debug('exec', command);
	
	var shellStream = new helpers.Stream();
	var child = child_process.spawn('sh', ['-c', command]);
	
	child.stdout.on('data', function (data) {
		shellStream.emit_data_for_stdout(data);
	});
	
	child.stderr.on('data', function (data) {
		shellStream.emit_data_for_stderr(data);
	});
	
	child.on('error', function (error) {
		shellStream.emit_error(error);
	})
	
	child.on('exit', function (code) {
		shellStream.emit_exit(code);
	});
	
	callback(null, shellStream);
};

Connection.prototype.spawn = function (command, args, callback) {
	logsmith.debug('spawn', [command].concat(args).join(' '));
	
	var shellStream = new helpers.Stream();
	var child = child_process.spawn(command, args);
	
	child.stdout.on('data', function (data) {
		shellStream.emit_data_for_stdout(data);
	});
	
	child.stderr.on('data', function (data) {
		shellStream.emit_data_for_stderr(data);
	});
	
	child.on('error', function (error) {
		shellStream.emit_error(error);
	})
	
	child.on('exit', function (code) {
		shellStream.emit_exit(code);
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
	// TODO: add code here
};

// ---

exports.parseSpec = parseSpec;
exports.Connection = Connection;
exports.Target = Target;
