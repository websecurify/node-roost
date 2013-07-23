var util = require('util');
var events = require('events');

// ---

function escape(input) {
	return input
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/(["`$\\])/g, '\\$1');
}

function quote(input) {
	return '"' + exports.escape(input) + '"';
}

// ---

function Stream() {
	events.EventEmitter.call(this);
}

util.inherits(Stream, events.EventEmitter);

Stream.prototype.emitDataForStdout = function (data) {
	this.emit('data', data, 'stdout');
};

Stream.prototype.emitDataForStderr = function (data) {
	this.emit('data', data, 'stderr');
};

Stream.prototype.emitError = function (error) {
	this.emit('error', error);
};

Stream.prototype.emitExit = function (code) {
	this.emit('exit', code);
};

// ---

exports.escape = escape;
exports.quote = quote;
exports.Stream = Stream;
