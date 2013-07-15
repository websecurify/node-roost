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

exports.Procedure = Procedure;
