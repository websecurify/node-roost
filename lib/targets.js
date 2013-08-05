var path = require('path');
var util = require('util');
var events = require('events');

// ---

var ssh = require(path.join(__dirname, 'ssh.js'));
var local = require(path.join(__dirname, 'local.js'));
var logger = require(path.join(__dirname, 'logger.js'));
var helpers = require(path.join(__dirname, 'helpers.js'));

// ---

function splitSpec(spec) {
	var tokens = spec.split(':');
	var scheme = tokens[0];
	var definition = tokens[1];
	
	return {
		original: spec,
		scheme: scheme,
		definition: definition
	}
}

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
					logger.info(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				logger.info(desc);
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
					logger.info(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				logger.info(desc);
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

function Local(spec, manifest) {
	Procedure.apply(this, arguments);
	
	this.connection = new local.Connection(manifest);
	
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

util.inherits(Local, Procedure);

Local.prototype.exec = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.exec(command, createExecHandler(next, failproofORhandler));
	}, command);
};

Local.prototype.spawn = function (command, args, failproofORhandler) {
	var desc = command + (args.length ? ' ' + args.join(' ') : '');
	
	this.step(function (next) {
		this.connection.spawn(command, args, createExecHandler(next, failproofORhandler));
	}, desc);
};

Local.prototype.copy = function (source, destination) {
	
};

// ---

function Ssh(spec, manifest) {
	Procedure.apply(this, arguments);
	
	this.connection = new ssh.Connection(manifest);
	
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

util.inherits(Ssh, Procedure);

Ssh.prototype.exec = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.exec(command, createExecHandler(next, failproofORhandler));
	}, command);
};

Ssh.prototype.spawn = function (command, args, failproofORhandler) {
	var desc = command + (args.length ? ' ' + args.join(' ') : '');
	
	this.step(function (next) {
		this.connection.spawn(command, args, createExecHandler(next, failproofORhandler));
	}, desc);
};

Ssh.prototype.copy = function (source, destination) {
	
};

// ---

function instance(spec, manifest) {
	if (typeof(spec) == 'string' || spec instanceof String) {
		spec = exports.splitSpec(spec);
	}
	
	var scheme = spec.scheme.toLowerCase();
	var name = scheme[0].toUpperCase() + scheme.substring(1, scheme.length);
	
	if (exports.hasOwnProperty(name) && name != 'Procedure') {
		logger.silly('target is', name);
		
		return new exports[name](spec.original, manifest);
	} else {
		throw helpers.e('unrecognized target spec', helpers.q(scheme));
	}
}

// ---

exports.splitSpec = splitSpec;
exports.Procedure = Procedure;
exports.Local = Local;
exports.Ssh = Ssh;
exports.instance = instance;
