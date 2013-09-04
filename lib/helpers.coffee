events = require 'events'

# ---

exports.escape = (input) ->
	input
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/(["`$\\])/g, '\\$1')
		
# ---

exports.quote = (input) ->
	'"' + exports.escape(input) + '"'
	
# ---

exports.Stream = class Stream extends events.EventEmitter
	emit_data_for_stdout: (data) -> @emit 'data', data, 'stdout'
	emit_data_for_stderr: (data) -> @emit 'data', data, 'stderr'
	emit_error: (error) -> @emit 'error', error
	emit_exit: (exit) -> @emit 'exit', exit
	
