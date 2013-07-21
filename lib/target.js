var path = require('path');
var util = require('util');
var child_process = require('child_process');

// ---

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

function parseSpecs(specs) {
	return specs.map(function (spec) {
		return parseSpec(spec);
	});
}

// ---

function Procedure() {
	this.lasts = [];
	this.steps = [];
}

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
			throw err;
		}
		
		var last = self.lasts.shift();
		
		if (!last) {
			return;
		}
		
		func = last[0];
		desc = last[1];
		
		if (isDryRun) {
			(function (next) {
				if (desc) {
					console.log(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				console.log(desc);
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
					console.log(desc);
				}
				
				next();
			}).call(self, arguments.callee);
		} else {
			if (desc) {
				console.log(desc);
			}
			
			func.call(self, arguments.callee);
		}
	};
	
	doStep();
};

// ---

function Local(spec, scheme, def) {
	Procedure.apply(this, arguments);
}

util.inherits(Local, Procedure);

Local.prototype.exec = function (command, failproofORhandler) {
	this.step(function (next) {
		var tokens = command.split(/\s+/);
		
		command = child_process.spawn(tokens.shift(), tokens);
		
		command.stdout.on('data', function (data) {
			process.stdout.write(data);
		});
		
		command.stderr.on('data', function (data) {
			process.stderr.write(data);
		});
		
		var failproof;
		var handler;
		
		if (typeof(failproofORhandler) == 'boolean' || failproofORhandler instanceof Boolean) {
			failproof = failproofORhandler;
			handler = null;
		} else {
			failproof = false;
			handler = failproofORhandler;
		}
		
		if (handler) {
			// TODO: add code here
		} else {
			command.on('close', function (code) {
				if (code && !failproof) {
					return next(new Error('command exited with code ' + code));
				}
				
				next();
			});
		}
	}, command);
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

Ssh.prototype.exec = function (command, failproofORhandler) {
	this.step(function (next) {
		this.connection.exec(command, function (err, stream) {
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
				stream.on('exit', function (code, signal) {
					if (code && !failproof) {
						return next(new Error('command exited with code ' + code));
					}
					
					next();
				});
			}
		});
	}, command);
}

// ---

function instances(specs) {
	return specs
		.map(function (spec) {
			if (typeof(spec) == 'string' || spec instanceof String) {
				return parseSpec(spec);
			} else {
				return spec;
			}
		})
		.filter(function (spec) {
			var scheme = spec.scheme.toLowerCase();
			
			if (['local', 'ssh'].indexOf(scheme) < 0) {
				throw new Error('target is not local: or ssh:');
			} else {
				return true;
			}
		})
		.map(function (spec) {
			var scheme = spec.scheme.toLowerCase();
			
			if (scheme == 'local') {
				return new Local(spec.original, scheme, spec.definition);
			} else
			if (scheme == 'ssh') {
				return new Ssh(spec.original, scheme, spec.definition);
			} else {
				throw new Error('impossible state');
			}
		});
}

// ---

exports.parseSpec = parseSpec;
exports.parseSpecs = parseSpecs;
exports.Local = Local;
exports.Ssh = Local;
exports.instances = instances;
