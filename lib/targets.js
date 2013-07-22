var path = require('path');
var events = require('events');
var util = require('util');

// ---

var logger = require(path.join(__dirname, 'logger.js'));
var local = require(path.join(__dirname, 'local.js'));
var ssh = require(path.join(__dirname, 'ssh.js'));

// ---

function parseSpec(spec) {
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
			
			func.call(self, arguments.callee);
		}
	};
	
	var doStep = function (err) {
		if (err) {
			self.last(function (next) {
				next(err);
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
			
			func.call(self, arguments.callee);
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
			handler.call(this, stream, next);
		} else {
			stream.on('exit', function (code) {
				if (code && !failproof) {
					return next(new Error('command exited with code ' + code));
				}
				
				next();
			});
		}
	};
}

// ---

function Local(spec, scheme, def) {
	Procedure.apply(this, arguments);
	
	this.connection = new local.Connection();
}

util.inherits(Local, Procedure);

Local.prototype.system = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.system(command, createExecHandler(next, failproofORhandler), command);
	});
};

Local.prototype.spawn = function (command, args, failproofORhandler) {
	this.step(function (next) {
		this.connection.spawn(command, args, createExecHandler(next, failproofORhandler), command);
	});
};

// ---

function Ssh(spec, scheme, def) {
	Procedure.apply(this, arguments);
	
	this.connection = new ssh.Connection();
	
	this.step(function (next) {
		this.connection.on('ready', function () {
			console.log('ssh connection ready');
			
			next();
		});
		
		this.connection.on('error', function (err) {
			console.log('ssh connection has errors');
			
			next(err);
		});
		
		this.connection.connect(spec);
	});
	
	this.last(function (next) {
		console.log('destroying ssh connection');
		
		this.connection.end();
	
		next();
	});
}

util.inherits(Ssh, Procedure);

Ssh.prototype.system = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.system(command, createExecHandler(next, failproofORhandler), command);
	});
};

Ssh.prototype.spawn = function (command, args, failproofORhandler) {
	this.step(function (next) {
		this.connection.spawn(command, args, createExecHandler(next, failproofORhandler), command);
	});
};

// ---

function instance(spec) {
	if (typeof(spec) == 'string' || spec instanceof String) {
		spec = exports.parseSpec(spec);
	}
	
	var scheme = spec.scheme.toLowerCase();
	var name = scheme[0].toUpperCase() + scheme.substring(1, scheme.length);
	
	if (exports.hasOwnProperty(name)) {
		return new exports[name](spec.original, scheme, spec.definition);
	} else {
		throw new Error('unrecognized spec ' + spec);
	}
}

// ---

function obtain(specs) {
	return specs.map(function (spec) {
		return exports.instance(spec);
	});
}

// ---

exports.parseSpec = parseSpec;
exports.Local = Local;
exports.Ssh = Ssh;
exports.instance = instance;
exports.obtain = obtain;
